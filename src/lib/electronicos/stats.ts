// ── Estadística de precios + score de oportunidad ────────────────────────────
//
// Todo se calcula en memoria sobre los listings de la ventana (windowDays). El
// volumen esperado son cientos/pocos miles de filas — no vale la pena SQL.

import { prisma } from '@/lib/db'
import type { ElecListing, ElecSettings } from '@prisma/client'
import type { SpecFlags } from './parse-specs'

export async function getElecSettings(): Promise<ElecSettings> {
  return prisma.elecSettings.upsert({ where: { id: 'singleton' }, create: { id: 'singleton' }, update: {} })
}

export function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null
  if (sorted.length === 1) return sorted[0]
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo))
}

export function median(values: number[]): number | null {
  return percentile([...values].sort((a, b) => a - b), 0.5)
}

type PriceRow = Pick<ElecListing, 'id' | 'price' | 'flags' | 'configKey' | 'line' | 'chip' | 'zoneKind' | 'status' | 'daysOnMarket' | 'firstSeenAt' | 'postedAt' | 'lastSeenAt' | 'soldConfirmed' | 'ramGb' | 'ssdGb'>

/** ¿El precio de este listing sirve para estadística? */
export function isPriceUsable(l: Pick<ElecListing, 'price' | 'flags'>): boolean {
  if (!l.price || l.price < 1500) return false
  const f = (l.flags ?? {}) as SpecFlags
  return !f.piezas && !f.nueva
}

/** Quita basura: <35% o >300% de la mediana cruda del grupo. */
export function cleanPrices(prices: number[]): number[] {
  const med = median(prices)
  if (!med) return []
  return prices.filter((p) => p >= med * 0.35 && p <= med * 3).sort((a, b) => a - b)
}

export function lineChipKey(l: { line: string | null; chip: string | null }): string | null {
  return l.line && l.chip ? `${l.line}|${l.chip}` : null
}

export type GroupIndex = {
  byConfig: Map<string, PriceRow[]>
  byLineChip: Map<string, PriceRow[]>
}

export function indexGroups(rows: PriceRow[]): GroupIndex {
  const byConfig = new Map<string, PriceRow[]>()
  const byLineChip = new Map<string, PriceRow[]>()
  for (const r of rows) {
    if (!isPriceUsable(r)) continue
    if (r.configKey) byConfig.set(r.configKey, [...(byConfig.get(r.configKey) ?? []), r])
    const lc = lineChipKey(r)
    if (lc) byLineChip.set(lc, [...(byLineChip.get(lc) ?? []), r])
  }
  return { byConfig, byLineChip }
}

export async function loadWindowRows(settings: ElecSettings): Promise<PriceRow[]> {
  const since = new Date(Date.now() - settings.windowDays * 86_400_000)
  return prisma.elecListing.findMany({
    where: { lastSeenAt: { gte: since } },
    select: {
      id: true, price: true, flags: true, configKey: true, line: true, chip: true, zoneKind: true, status: true,
      daysOnMarket: true, firstSeenAt: true, postedAt: true, lastSeenAt: true, soldConfirmed: true, ramGb: true, ssdGb: true,
    },
  })
}

// ── Score de oportunidad (0–10) ──────────────────────────────────────────────

export type ScoreReason = { pts: number; why: string }

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`

export function scoreListing(
  l: Pick<ElecListing, 'id' | 'price' | 'originalPrice' | 'flags' | 'configKey' | 'line' | 'chip' | 'ramGb' | 'ssdGb' | 'batteryHealth' | 'batteryCycles'>,
  idx: GroupIndex,
  settings: ElecSettings,
): { score: number | null; reasons: ScoreReason[] } {
  const reasons: ScoreReason[] = []
  if (!isPriceUsable(l)) {
    const f = (l.flags ?? {}) as SpecFlags
    if (f.piezas) return { score: null, reasons: [{ pts: 0, why: 'Para piezas / bloqueada — fuera de precios' }] }
    return { score: null, reasons: [{ pts: 0, why: 'Sin precio válido' }] }
  }
  const price = l.price!

  // Grupo de referencia: config exacta (sin '?') → línea+chip como respaldo
  let group: PriceRow[] = []
  let groupLabel = ''
  const exactOk = l.configKey && !l.configKey.includes('?')
  if (exactOk) {
    group = (idx.byConfig.get(l.configKey!) ?? []).filter((r) => r.id !== l.id)
    groupLabel = 'su configuración'
  }
  if (group.length < settings.minSample) {
    const lc = lineChipKey(l)
    const alt = lc ? (idx.byLineChip.get(lc) ?? []).filter((r) => r.id !== l.id) : []
    if (alt.length >= settings.minSample) {
      group = alt
      groupLabel = 'línea+chip (poca data exacta)'
    }
  }
  if (group.length < settings.minSample) {
    return { score: null, reasons: [{ pts: 0, why: `Poca data para comparar (${group.length} listings)` }] }
  }

  const prices = cleanPrices(group.map((r) => r.price!))
  const p25 = percentile(prices, 0.25)!
  const med = percentile(prices, 0.5)!
  const discount = (p25 - price) / p25

  let score = 5 + discount * 25
  reasons.push({
    pts: Math.round(discount * 25 * 10) / 10,
    why: discount >= 0
      ? `${Math.round(discount * 100)}% bajo el P25 (${fmt(p25)}) de ${groupLabel}, n=${prices.length}`
      : `${Math.round(-discount * 100)}% sobre el P25 (${fmt(p25)}) de ${groupLabel}, n=${prices.length}`,
  })

  // Margen potencial contra la mediana de venta (zonas VENTA si hay, si no general)
  const sellPrices = cleanPrices(group.filter((r) => r.zoneKind === 'VENTA').map((r) => r.price!))
  const sellMed = sellPrices.length >= 2 ? percentile(sellPrices, 0.5)! : med
  const margin = sellMed - price
  if (margin >= 2000) {
    score += 1
    reasons.push({ pts: 1, why: `Margen potencial ${fmt(margin)} vs mediana ${sellPrices.length >= 2 ? 'de venta' : 'general'} ${fmt(sellMed)}` })
  } else {
    reasons.push({ pts: 0, why: `Margen potencial ${fmt(margin)} (meta: $2,000+)` })
  }

  if (l.originalPrice && l.originalPrice > price) {
    const drop = (l.originalPrice - price) / l.originalPrice
    score += 0.5
    reasons.push({ pts: 0.5, why: `Bajó ${Math.round(drop * 100)}% (de ${fmt(l.originalPrice)}) — vendedor motivado` })
  }

  const f = (l.flags ?? {}) as SpecFlags
  if (f.golpe) { score -= 2; reasons.push({ pts: -2, why: 'Menciona golpe/abolladura' }) }
  if (f.pantallaRota) { score -= 3; reasons.push({ pts: -3, why: 'Pantalla dañada' }) }
  if (f.detalle) { score -= 0.5; reasons.push({ pts: -0.5, why: 'Menciona detalles estéticos' }) }
  if (f.conCaja) { score += 0.3; reasons.push({ pts: 0.3, why: 'Con caja' }) }
  if (f.factura) { score += 0.3; reasons.push({ pts: 0.3, why: 'Con factura' }) }
  if (f.appleCare) { score += 0.5; reasons.push({ pts: 0.5, why: 'AppleCare' }) }
  if (l.batteryHealth != null && l.batteryHealth < 85) { score -= 1; reasons.push({ pts: -1, why: `Batería ${l.batteryHealth}%` }) }
  if (l.batteryCycles != null && l.batteryCycles > 800) { score -= 1; reasons.push({ pts: -1, why: `${l.batteryCycles} ciclos` }) }
  if (f.vendido) { score -= 5; reasons.push({ pts: -5, why: 'El post dice "vendido"' }) }

  return { score: Math.max(0, Math.min(10, Math.round(score * 10) / 10)), reasons }
}

// ── Tabla de precios por configuración ───────────────────────────────────────

export type PriceBand = { n: number; p10: number | null; p25: number | null; p50: number | null; p90: number | null }

export type PriceTableRow = {
  configKey: string
  line: string | null
  chip: string | null
  ramGb: number | null
  ssdGb: number | null
  n: number
  active: number
  all: PriceBand
  buy: PriceBand
  sell: PriceBand
  spread: number | null
  spreadApprox: boolean // true si se usó el general porque no hay data en alguna zona
  avgDaysOnMarket: number | null
  avgDaysSource: 'desaparecidos' | 'activos' | null
  exitPrice: number | null // mediana de los que desaparecieron rápido
  exitN: number
  activeMedian: number | null
  confidence: 'baja' | 'media' | 'alta'
}

function band(prices: number[]): PriceBand {
  const s = cleanPrices(prices)
  return { n: s.length, p10: percentile(s, 0.1), p25: percentile(s, 0.25), p50: percentile(s, 0.5), p90: percentile(s, 0.9) }
}

export function buildPriceTable(rows: PriceRow[], settings: ElecSettings): PriceTableRow[] {
  const idx = indexGroups(rows)
  const now = Date.now()
  const out: PriceTableRow[] = []

  for (const [configKey, group] of idx.byConfig) {
    const first = group[0]
    const prices = group.map((r) => r.price!)
    const all = band(prices)
    const buy = band(group.filter((r) => r.zoneKind === 'COMPRA').map((r) => r.price!))
    const sell = band(group.filter((r) => r.zoneKind === 'VENTA').map((r) => r.price!))

    const sellMed = sell.n >= 2 ? sell.p50 : all.p50
    const buyP25 = buy.n >= 2 ? buy.p25 : all.p25
    const spread = sellMed != null && buyP25 != null ? sellMed - buyP25 : null

    const gone = group.filter((r) => r.status === 'DESAPARECIDO' && r.daysOnMarket != null)
    const active = group.filter((r) => r.status === 'ACTIVO')
    let avgDays: number | null = null
    let avgSrc: PriceTableRow['avgDaysSource'] = null
    if (gone.length) {
      avgDays = gone.reduce((a, r) => a + r.daysOnMarket!, 0) / gone.length
      avgSrc = 'desaparecidos'
    } else if (active.length) {
      avgDays = active.reduce((a, r) => a + (now - (r.postedAt ?? r.firstSeenAt).getTime()) / 86_400_000, 0) / active.length
      avgSrc = 'activos'
    }

    const fast = gone.filter((r) => r.daysOnMarket! < settings.fastSaleDays).map((r) => r.price!)
    const n = all.n

    out.push({
      configKey,
      line: first.line, chip: first.chip, ramGb: first.ramGb, ssdGb: first.ssdGb,
      n,
      active: active.length,
      all, buy, sell,
      spread,
      spreadApprox: buy.n < 2 || sell.n < 2,
      avgDaysOnMarket: avgDays != null ? Math.round(avgDays * 10) / 10 : null,
      avgDaysSource: avgSrc,
      exitPrice: median(fast),
      exitN: fast.length,
      activeMedian: median(active.map((r) => r.price!)),
      confidence: n < settings.minSample ? 'baja' : n < 10 ? 'media' : 'alta',
    })
  }

  return out.sort((a, b) => b.n - a.n)
}
