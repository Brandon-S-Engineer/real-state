// "Deal Desk": varios agentes evalúan un anuncio real y deciden si comprarlo.
//
// Regla de diseño: los números los pone código determinístico (parser, comps
// en SQL, margen meta); los LLM solo juzgan lo que el código no puede (texto
// ambiguo, riesgo, tono de la oferta). Cada salida de LLM se valida con zod y
// se acota a los rangos que el código calculó.
//
//   parse (código) → spec analyst (LLM, solo si falta info) → comps (SQL)
//     → market analyst ∥ risk analyst (LLM, en paralelo) → deal lead (LLM)

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { chatJson, costUsd, type ModelId } from '@/lib/agent-demo/openai'
import { isRiskyListing, parseListing } from '@/lib/electronicos/categories'
import { cleanPrices, isPriceUsable, marginTarget, median, percentile } from '@/lib/electronicos/math'
import { isStorageOnlyLine, parsePriceFromText, type SpecFlags } from '@/lib/electronicos/parse-specs'
import { iphoneEntry } from '@/lib/electronicos/iphone-catalog'
import { ipadEntry, IPAD_STORAGE_OPTIONS } from '@/lib/electronicos/ipad-catalog'
import { MARKET_CATEGORIES, modelLabel } from './market'
import type { AgentId, DeskEvent } from './types'
import { isSold } from './sold'

export const DESK_MODEL: ModelId = 'gpt-4.1-mini'

export type { AgentId, DeskEvent, DeskResult } from './types'

export class DeskError extends Error {}

type Listing = {
  title: string
  description: string | null
  price: number
  line: string | null
  chip: string | null
  ramGb: number | null
  ssdGb: number | null
  flags: SpecFlags
  confidence: number
}

const round100 = (n: number) => Math.round(n / 100) * 100
const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

async function loadListing(input: { listingId?: string; text?: string }): Promise<Listing> {
  if (input.listingId) {
    const l = await prisma.elecListing.findFirst({
      where: { id: input.listingId, oculto: false, category: { in: [...MARKET_CATEGORIES] } },
      select: { title: true, description: true, price: true, line: true, chip: true, ramGb: true, ssdGb: true, flags: true, parseConfidence: true },
    })
    if (!l || !l.price) throw new DeskError('Listing not found.')
    return { ...l, price: l.price, flags: (l.flags ?? {}) as SpecFlags, confidence: l.parseConfidence }
  }
  const text = (input.text ?? '').trim()
  const [title, ...rest] = text.split('\n')
  const price = parsePriceFromText(text)
  if (!price) throw new DeskError('Include a price in MXN, e.g. "$9,500".')
  const p = parseListing(title, rest.join('\n') || null)
  if (!p.line || !(MARKET_CATEGORIES as readonly string[]).includes(p.category)) {
    throw new DeskError('Could not identify an Apple model (iPhone, iPad, MacBook or AirPods) in the text.')
  }
  return {
    title, description: rest.join('\n') || null, price,
    line: p.line, chip: p.chip, ramGb: p.ramGb, ssdGb: p.ssdGb, flags: p.flags, confidence: p.parseConfidence,
  }
}

function storageOptions(line: string): number[] {
  return iphoneEntry(line)?.storage ?? ipadEntry(line)?.storage ?? IPAD_STORAGE_OPTIONS
}

/** Comparables reales: misma config si hay muestra, si no el modelo completo. */
async function comps(l: Listing) {
  const rows = await prisma.elecListing.findMany({
    where: { line: l.line, oculto: false, ...(l.chip ? { chip: l.chip } : {}) },
    select: {
      price: true, flags: true, line: true, ssdGb: true, ramGb: true, status: true, daysOnMarket: true,
      firstSeenAt: true, lastSeenAt: true, soldConfirmed: true,
    },
  })
  const usable = rows.filter(isPriceUsable)
  const exact = l.ssdGb ? usable.filter((r) => r.ssdGb === l.ssdGb && (!l.ramGb || r.ramGb === l.ramGb)) : []
  const group = exact.length >= 8 ? exact : usable
  const prices = cleanPrices(group.map((r) => r.price!))
  if (prices.length < 5) throw new DeskError('Not enough market data for this model yet.')
  const gone = group.filter(isSold)
  const p25 = percentile(prices, 0.25)!
  const p75 = percentile(prices, 0.75)!
  const target = marginTarget(l.line, p75)
  return {
    scope: group === exact ? 'exact config' : 'whole model (storage unknown or few exact comps)',
    n: prices.length,
    p25,
    p50: percentile(prices, 0.5)!,
    p75,
    gone: gone.length,
    medianDaysToSell: median(gone.filter((r) => r.daysOnMarket != null).map((r) => r.daysOnMarket!)),
    activeNow: group.filter((r) => r.status === 'ACTIVO').length,
    discountVsP25: Math.round(((p25 - l.price) / p25) * 100),
    marginTarget: target,
    ceiling: round100(p75 - target), // precio máximo de compra que todavía deja el margen meta
  }
}

// zod → JSON Schema en el formato estricto de OpenAI: todo requerido y sin
// propiedades extra. Un solo esquema sirve para el contrato y la validación.
function strictSchema(schema: z.ZodType): Record<string, unknown> {
  const fix = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(fix)
    if (!node || typeof node !== 'object') return node
    const o = Object.fromEntries(Object.entries(node).filter(([k]) => k !== '$schema').map(([k, v]) => [k, fix(v)]))
    if (o.type === 'object' && o.properties) {
      o.required = Object.keys(o.properties)
      o.additionalProperties = false
    }
    return o
  }
  return fix(z.toJSONSchema(schema, { io: 'input' })) as Record<string, unknown>
}

// Los LLM a veces se pasan de largo: se recorta en vez de fallar.
const clip = (n: number) => z.string().transform((s) => s.slice(0, n))

const specSchema = z.object({
  ssdGb: z.number().int().nullable(),
  condition: clip(160),
  notes: clip(240),
})
const marketSchema = z.object({
  expectedSale: z.number(),
  daysToSell: z.number().nullable(),
  demand: z.enum(['high', 'medium', 'low']),
  summary: clip(400),
})
const riskSchema = z.object({
  risk: z.enum(['low', 'medium', 'high']),
  flags: z.array(clip(80)).transform((f) => f.slice(0, 4)),
  haircutPct: z.number(),
  summary: clip(400),
})
const leadSchema = z.object({
  verdict: z.enum(['BUY', 'NEGOTIATE', 'PASS']),
  reasoning: z.array(clip(220)).min(1).transform((r) => r.slice(0, 3)),
  offerMessage: clip(500),
})

export async function runDesk(input: { listingId?: string; text?: string }, emit: (e: DeskEvent) => void) {
  const started = Date.now()
  let tokens = 0
  let cost = 0
  const llm = async <T,>(id: AgentId, schema: z.ZodType<T>, system: string, user: unknown) => {
    emit({ type: 'step', id, status: 'start' })
    const t = Date.now()
    const { data, usage } = await chatJson(DESK_MODEL, system, JSON.stringify(user), { name: id, schema: strictSchema(schema) })
    const used = usage.prompt_tokens + usage.completion_tokens
    tokens += used
    cost += costUsd(DESK_MODEL, usage.prompt_tokens, usage.completion_tokens) ?? 0
    const parsed = schema.safeParse(data)
    if (!parsed.success) console.error(id, parsed.error.issues, data)
    if (!parsed.success) throw new DeskError(`The ${id} agent returned an invalid answer. Try again.`)
    return { out: parsed.data, ms: Date.now() - t, tokens: used }
  }

  // 1 · Parse (código)
  emit({ type: 'step', id: 'parse', status: 'start' })
  let t = Date.now()
  const l = await loadListing(input)
  const model = modelLabel(l)
  emit({
    type: 'step', id: 'parse', status: 'done', ms: Date.now() - t,
    output: { model, storage: l.ssdGb ? `${l.ssdGb} GB` : 'unknown', price: l.price, confidence: l.confidence },
  })

  // 2 · Spec analyst (LLM): solo cuando el parser no pudo fijar la config
  const needsSpec = (isStorageOnlyLine(l.line) && !l.ssdGb) || l.confidence < 0.7
  if (needsSpec) {
    const options = storageOptions(l.line!)
    const { out, ms, tokens: tk } = await llm('spec', specSchema,
      `You read used-Apple listings from Facebook Marketplace (Mexico, Spanish). Return JSON {ssdGb, condition, notes}.
ssdGb: the storage ONLY if the text states it explicitly, and only one of ${JSON.stringify(options)}; otherwise null. Never guess.
condition: short English summary of the condition the text claims (or "not stated").
notes: anything ambiguous, e.g. "venta o cambio" (sale or swap), carrier-locked, missing accessories. English, one sentence.`,
      { title: l.title, description: l.description?.slice(0, 600) ?? null, parsedModel: model })
    if (out.ssdGb && options.includes(out.ssdGb)) l.ssdGb = out.ssdGb
    emit({ type: 'step', id: 'spec', status: 'done', ms, tokens: tk, output: { ...out, ssdGb: l.ssdGb } })
  } else {
    emit({ type: 'step', id: 'spec', status: 'skipped', note: 'Parser was confident — no LLM call needed.' })
  }

  // 3 · Comps (SQL)
  emit({ type: 'step', id: 'comps', status: 'start' })
  t = Date.now()
  const c = await comps(l)
  emit({ type: 'step', id: 'comps', status: 'done', ms: Date.now() - t, output: c })

  // 4 · Market ∥ Risk (LLM en paralelo)
  const [market, risk] = await Promise.all([
    llm('market', marketSchema,
      `You are a resale market analyst for used Apple devices in Mexico City. You get real comparable listings (MXN).
Return JSON {expectedSale, daysToSell, demand, summary}.
expectedSale: realistic resale price for this unit, between p25 and p75 of the comps (higher only if condition/extras justify it).
daysToSell: from medianDaysToSell if present, else null. demand: from how many comps disappeared (sold) vs are active.
summary: 2 short sentences in English citing the numbers.`,
      // Sin el tope de compra: es una regla nuestra, no un dato del mercado
      { listing: { model, storage: l.ssdGb, price: l.price, flags: l.flags }, comps: { ...c, ceiling: undefined, marginTarget: undefined } }),
    llm('risk', riskSchema,
      `You are a fraud and condition risk analyst for used-phone deals on Facebook Marketplace (Mexico).
Return JSON {risk, flags, haircutPct, summary}.
Look for: price far below market (bait/scam), iCloud/blocked, reported (IMEI), carrier-locked, swaps ("cambio"), repairs or non-original parts, battery, damage, vague text.
haircutPct: 0–30, how much to lower the max buy price for the risk. flags: up to 4 short English labels. summary: one English sentence.
Missing description alone is normal on Marketplace, not a red flag.`,
      {
        title: l.title, description: l.description?.slice(0, 600) ?? null, price: l.price, marketP25: c.p25,
        discountVsP25: c.discountVsP25, detectedFlags: l.flags, keywordRiskHit: isRiskyListing(l.title, l.description),
      }),
  ])
  const expectedSale = Math.min(Math.max(market.out.expectedSale, c.p25), c.p75)
  const haircut = Math.min(Math.max(risk.out.haircutPct, 0), 30)
  emit({ type: 'step', id: 'market', status: 'done', ms: market.ms, tokens: market.tokens, output: { ...market.out, expectedSale } })
  emit({ type: 'step', id: 'risk', status: 'done', ms: risk.ms, tokens: risk.tokens, output: { ...risk.out, haircutPct: haircut } })

  // Precio máximo: lo fija el código con el margen meta y el castigo por riesgo
  const maxBuy = round100(Math.min(c.ceiling, expectedSale - c.marginTarget) * (1 - haircut / 100))
  // Nunca se ofrece más de lo que pide el vendedor
  const offerPrice = Math.min(l.price, maxBuy)

  // 5 · Deal lead (LLM)
  const lead = await llm('lead', leadSchema,
    `You lead a used-Apple resale desk in Mexico City and make the final call. Return JSON {verdict, reasoning, offerMessage}.
Rules: BUY if price <= maxBuy and risk is not high. NEGOTIATE if price is above maxBuy but within ~15%, or risk is medium. PASS otherwise or if risk is high.
reasoning: 1–3 short English bullets with the key numbers.
offerMessage: the FIRST message you (the buyer) send to the seller about their listing, in casual Mexican Spanish, max 2 sentences. The seller posted the listing; nobody has made an offer yet.
- BUY: ask if it's still available and propose meeting in person to check it.
- NEGOTIATE: ask if it's available and offer exactly offerPrice MXN.
- PASS because of price: a polite offer of exactly offerPrice MXN, no pressure.
- PASS because of risk: no price; ask to meet in person and check the device (iCloud, IMEI, battery) before paying anything.
Never mention any price other than offerPrice.`,
    { listing: { title: l.title, model, price: l.price }, maxBuy, offerPrice, expectedSale, daysToSell: market.out.daysToSell, market: market.out.summary, risk: risk.out })

  // Guardrail: el veredicto no puede contradecir los números
  let verdict = lead.out.verdict
  let guardrail: string | null = null
  if (verdict === 'BUY' && l.price > maxBuy) {
    verdict = 'NEGOTIATE'
    guardrail = `Lead said BUY but ${fmt(l.price)} is above the max buy of ${fmt(maxBuy)} — downgraded to NEGOTIATE.`
  }
  if (verdict !== 'PASS' && risk.out.risk === 'high') {
    verdict = 'PASS'
    guardrail = 'Risk analyst flagged high risk — forced to PASS.'
  }
  emit({ type: 'step', id: 'lead', status: 'done', ms: lead.ms, tokens: lead.tokens, output: { ...lead.out, verdict } })

  emit({
    type: 'final',
    ms: Date.now() - started,
    tokens,
    cost,
    result: {
      verdict, title: l.title, model, price: l.price, maxBuy, expectedSale,
      margin: expectedSale - offerPrice,
      daysToSell: market.out.daysToSell, reasoning: lead.out.reasoning, offerMessage: lead.out.offerMessage, guardrail,
    },
  })
}

