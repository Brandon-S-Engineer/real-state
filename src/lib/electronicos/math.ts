// Matemática pura de precios — sin prisma, se usa también en el cliente.

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

/**
 * Margen meta por trade. MacBook $2,000 fijo; iPhone/iPad $1,500 (equipos de
 * $6–15k con mucha rotación); en audífonos el 25% del precio de venta.
 */
export function marginTarget(line: string | null | undefined, sellPrice: number): number {
  if (line?.startsWith('AUD_')) return Math.max(500, Math.round((sellPrice * 0.25) / 100) * 100)
  if (line?.startsWith('IP')) return 1500
  return 2000
}

/** Quita basura: <35% o >300% de la mediana cruda del grupo. */
export function cleanPrices(prices: number[]): number[] {
  const med = median(prices)
  if (!med) return []
  return prices.filter((p) => p >= med * 0.35 && p <= med * 3).sort((a, b) => a - b)
}

// Audífonos son equipos de $1.5–9k: un AirPods 4 real usado cae abajo del piso general de $1,500
const priceFloor = (line?: string | null) => (line?.startsWith('AUD_') ? 800 : 1500)

export function isPriceUsable(l: { price: number | null; flags: unknown; line?: string | null }): boolean {
  if (!l.price || l.price < priceFloor(l.line)) return false
  const f = (l.flags ?? {}) as { piezas?: boolean; nueva?: boolean }
  return !f.piezas && !f.nueva
}
