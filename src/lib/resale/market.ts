// Datos públicos de "Resale Intelligence": el mercado real de equipos Apple
// usados en CDMX que captura la extensión. Todo sale de SQL y de la misma
// matemática de precios del dashboard (P25/P50/P75); la IA no toca nada de
// esto. Se cachea 30 min para que el home no golpee la base en cada visita.

import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'
import { categoryOfLine, coarseKey, lineLabel } from '@/lib/electronicos/categories'
import { cleanPrices, isPriceUsable, median, percentile } from '@/lib/electronicos/math'
import { isSold } from './sold'
import { MARKET_CATEGORIES, type MarketCategory, type MarketSnapshot, type ModelBand, type Opportunity } from './types'

export * from './types'

export function modelLabel(l: { line: string | null; chip: string | null }) {
  const base = lineLabel(l.line)
  const cat = categoryOfLine(l.line)
  if (cat === 'IPHONE') return `iPhone ${base}`
  if (cat === 'IPAD') return base.startsWith('iPad') ? base : `iPad ${base}`
  if (cat === 'MACBOOK') return `MacBook ${base}${l.chip ? ` ${l.chip}` : ''}`
  return base
}

const BANDS_PER_CATEGORY = 10

async function buildSnapshot(): Promise<MarketSnapshot> {
  const apple = { category: { in: [...MARKET_CATEGORIES] }, oculto: false }
  const [rows, tracked, gone, active, priceChanges, last, first] = await Promise.all([
    prisma.elecListing.findMany({
      where: apple,
      select: {
        price: true, flags: true, line: true, chip: true, status: true, daysOnMarket: true,
        firstSeenAt: true, lastSeenAt: true, soldConfirmed: true,
      },
    }),
    prisma.elecListing.count({ where: apple }),
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "ElecListing"
      WHERE category IN ('IPHONE','IPAD','MACBOOK','AUDIO') AND NOT oculto AND status = 'DESAPARECIDO'
        AND ("soldConfirmed" OR "lastSeenAt" - "firstSeenAt" >= interval '20 hours')`.then((r) => r[0].n),
    prisma.elecListing.count({ where: { ...apple, status: 'ACTIVO' } }),
    prisma.elecPriceHistory.count(),
    prisma.elecListing.findFirst({ orderBy: { lastSeenAt: 'desc' }, select: { lastSeenAt: true } }),
    prisma.elecListing.findFirst({ orderBy: { firstSeenAt: 'asc' }, select: { firstSeenAt: true } }),
  ])
  const lastCapture = last?.lastSeenAt ?? null
  // "Nuevos en 7 días" relativo a la última captura, no a hoy: si no capturé
  // ayer, el número no se desploma.
  const ref = lastCapture ?? new Date()
  const new7d = await prisma.elecListing.count({
    where: { ...apple, firstSeenAt: { gte: new Date(ref.getTime() - 7 * 86_400_000) } },
  })

  // Bandas de precio por modelo (grupo grueso: iPhone/iPad por modelo, MacBook por línea+chip)
  const groups = new Map<string, typeof rows>()
  for (const r of rows) {
    if (!isPriceUsable(r)) continue
    const k = coarseKey(r)
    if (k) groups.set(k, [...(groups.get(k) ?? []), r])
  }
  const p50ByKey = new Map<string, number>()
  for (const [key, g] of groups) {
    const prices = cleanPrices(g.map((r) => r.price!))
    if (prices.length >= 5) p50ByKey.set(key, percentile(prices, 0.5)!)
  }
  const bands = Object.fromEntries(MARKET_CATEGORIES.map((c) => [c, [] as ModelBand[]])) as Record<MarketCategory, ModelBand[]>
  for (const [key, g] of groups) {
    const cat = categoryOfLine(g[0].line) as MarketCategory
    if (!bands[cat]) continue
    const prices = cleanPrices(g.map((r) => r.price!))
    if (prices.length < 15) continue
    const goneRows = g.filter(isSold)
    bands[cat].push({
      key,
      label: modelLabel(g[0]),
      n: prices.length,
      p25: percentile(prices, 0.25)!,
      p50: percentile(prices, 0.5)!,
      p75: percentile(prices, 0.75)!,
      gone: goneRows.length,
      medianDays: median(goneRows.filter((r) => r.daysOnMarket != null).map((r) => r.daysOnMarket!)),
      active: g.filter((r) => r.status === 'ACTIVO').length,
    })
  }
  for (const c of MARKET_CATEGORIES) {
    bands[c] = bands[c]
      .sort((a, b) => b.n - a.n)
      .slice(0, BANDS_PER_CATEGORY)
      .sort((a, b) => b.p50 - a.p50)
  }

  // Oportunidades: el score que ya calcula el CRM, sin sospechosos ni compradas,
  // vistas en los últimos 4 días de captura.
  const opp = await prisma.elecListing.findMany({
    where: {
      ...apple,
      status: 'ACTIVO',
      sospechoso: false,
      comprado: false,
      opportunityScore: { gte: 70 },
      lastSeenAt: { gte: new Date(ref.getTime() - 4 * 86_400_000) },
    },
    orderBy: [{ opportunityScore: 'desc' }, { lastSeenAt: 'desc' }],
    take: 80,
    select: {
      id: true, title: true, price: true, line: true, chip: true, category: true, url: true,
      opportunityScore: true, lastSeenAt: true, zone: { select: { name: true } },
    },
  })

  return {
    generatedAt: new Date().toISOString(),
    lastCapture: lastCapture?.toISOString() ?? null,
    firstCapture: first?.firstSeenAt.toISOString() ?? null,
    totals: { tracked, gone, active, new7d, priceChanges },
    bands,
    opportunities: pickDeals(
      opp.filter((o) => o.price).map((o) => ({
        id: o.id,
        title: o.title,
        price: o.price!,
        model: modelLabel(o),
        category: o.category as MarketCategory,
        zone: o.zone?.name ?? null,
        score: Math.round(o.opportunityScore ?? 0),
        marketP50: p50ByKey.get(coarseKey(o) ?? '') ?? null,
        url: o.url,
        seenAt: o.lastSeenAt.toISOString(),
      })),
    ),
  }
}

// Los de score más alto suelen estar 40%+ abajo del mercado: casi siempre
// anzuelos. Para la demo se prefieren descuentos creíbles (5–35% bajo la
// mediana), un modelo distinto por fila, y se completa con el resto.
function pickDeals(all: Opportunity[], n = 12): Opportunity[] {
  const off = (o: Opportunity) => (o.marketP50 ? (o.marketP50 - o.price) / o.marketP50 : 0)
  const out: Opportunity[] = []
  const models = new Set<string>()
  for (const o of all) {
    if (out.length >= n) break
    if (off(o) >= 0.05 && off(o) <= 0.35 && !models.has(o.model)) {
      out.push(o)
      models.add(o.model)
    }
  }
  for (const o of all) {
    if (out.length >= n) break
    if (!out.includes(o)) out.push(o)
  }
  return out
}

const cached = unstable_cache(buildSnapshot, ['resale-market-snapshot-v2'], { revalidate: 1800 })

/** null si la base no responde: la página muestra un aviso en vez de romperse. */
export async function getMarketSnapshot(): Promise<MarketSnapshot | null> {
  try {
    return await cached()
  } catch (e) {
    console.error('resale snapshot failed', e)
    return null
  }
}
