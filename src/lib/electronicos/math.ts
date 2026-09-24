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

/** Quita basura: <35% o >300% de la mediana cruda del grupo. */
export function cleanPrices(prices: number[]): number[] {
  const med = median(prices)
  if (!med) return []
  return prices.filter((p) => p >= med * 0.35 && p <= med * 3).sort((a, b) => a - b)
}

export function isPriceUsable(l: { price: number | null; flags: unknown }): boolean {
  if (!l.price || l.price < 1500) return false
  const f = (l.flags ?? {}) as { piezas?: boolean; nueva?: boolean }
  return !f.piezas && !f.nueva
}
