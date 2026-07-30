/** Formatea cobre (unidad entera que devuelve la API de GW2) a "Ng Ns Nc". */
export function formatCopper(copper: number | null | undefined): string {
  if (copper == null) return '—'
  const negative = copper < 0
  const abs = Math.abs(Math.round(copper))
  const g = Math.floor(abs / 10000)
  const s = Math.floor((abs % 10000) / 100)
  const c = abs % 100
  const parts: string[] = []
  if (g) parts.push(`${g}g`)
  if (g || s) parts.push(`${s}s`)
  parts.push(`${c}c`)
  return (negative ? '-' : '') + parts.join(' ')
}

export function formatPercent(ratio: number | null | undefined): string {
  if (ratio == null) return '—'
  return `${(ratio * 100).toFixed(1)}%`
}
