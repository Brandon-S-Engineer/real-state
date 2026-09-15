// ── Banda de precios: ¿el precio de hoy es bueno o me están viendo la cara? ──
//
// Para cazar precios hace falta una referencia. "El verde está a 1s98c" no dice
// nada por sí solo; lo que importa es dónde cae ese número dentro de su propio
// rango reciente. Esta banda responde: ¿estoy comprando en el cuartil barato o
// en el caro?
//
// Se usa el bid (orden de compra), porque así es como se compra el gear en
// volumen: poniendo órdenes, no pagando el ask.

const DAY = 24 * 60 * 60 * 1000

export type PriceBand = {
  current: number
  low: number
  high: number
  avg: number
  /** Fracción de días del período que estuvieron MÁS BARATOS que hoy (0-1). */
  percentile: number
  /** Precio objetivo de compra: el cuartil barato del período. */
  targetBuy: number
  /** Veredicto rápido para decidir si comprar hoy o esperar. */
  verdict: 'barato' | 'normal' | 'caro'
  days: number
}

type Row = { date: Date; buyPriceAvg: number }

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function analyzePriceBand(rows: Row[], current: number, days = 90): PriceBand | null {
  const since = Date.now() - days * DAY
  const prices = rows.filter((r) => r.buyPriceAvg > 0 && r.date.getTime() >= since).map((r) => r.buyPriceAvg)
  if (prices.length < 15 || current <= 0) return null

  const sorted = [...prices].sort((a, b) => a - b)
  const percentile = prices.filter((p) => p < current).length / prices.length
  const targetBuy = quantile(sorted, 0.25)

  return {
    current,
    low: sorted[0],
    high: sorted[sorted.length - 1],
    avg: prices.reduce((s, p) => s + p, 0) / prices.length,
    percentile,
    targetBuy: Math.round(targetBuy),
    // Percentil bajo = pocos días estuvieron más baratos = hoy está barato.
    verdict: percentile <= 0.3 ? 'barato' : percentile >= 0.7 ? 'caro' : 'normal',
    days,
  }
}
