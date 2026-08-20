// ── Análisis de ciclo semanal (día de la semana) ─────────────────────────────
//
// Toma el historial diario multi-año y mide, para cada día de la semana, cuánto
// se desvía el precio de su nivel "normal" de esa semana. Para aislar el efecto
// semanal de la tendencia larga (los activos se aprecian con los años) NO se
// compara vs un promedio global, sino vs una media móvil CENTRADA de 7 días: así
// cada punto se mide contra su propio vecindario y solo queda el patrón día-a-día.
//
// Además calcula la CONSISTENCIA: en qué fracción de las semanas el día "barato"
// estuvo de verdad por debajo del promedio de esa semana. Un spread grande pero
// inconsistente es ruido; uno mediano pero consistente es abusable de verdad.

const DAY = 24 * 60 * 60 * 1000
const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export type DowStat = {
  dow: number
  label: string
  /** Desviación media del precio de ese día vs su semana local (fracción, ej. -0.012 = 1.2% más barato). */
  avgDevPct: number
  samples: number
}

export type WeeklyStat = {
  byDow: DowStat[]
  samples: number
  cheapestDow: number
  richestDow: number
  cheapestLabel: string
  richestLabel: string
  /** Diferencia entre el día más caro y el más barato, en fracción del precio. El "edge" máximo por timing. */
  spreadPct: number
  /** Fracción de semanas en que el día barato estuvo por debajo del promedio de la semana (0-1). */
  consistency: number
  /** Cuántas semanas entraron al cálculo. */
  weeks: number
}

type Row = { date: Date; buyPriceAvg: number; sellPriceAvg: number }

/**
 * Analiza el ciclo semanal de un ítem. Usa el mid-price (promedio de orden de
 * compra y de venta) para no quedar a merced del ruido de un solo lado del book.
 * Devuelve null si no hay datos suficientes para un patrón creíble.
 */
export function analyzeWeekly(rows: Row[], opts?: { days?: number }): WeeklyStat | null {
  const days = opts?.days ?? 730 // por defecto ~2 años: refleja el mercado actual, no el de hace 6
  const now = Date.now()

  const data = rows
    .filter((r) => r.buyPriceAvg > 0 && r.sellPriceAvg > 0 && now - r.date.getTime() <= days * DAY)
    .map((r) => ({ t: r.date.getTime(), dow: r.date.getUTCDay(), price: (r.buyPriceAvg + r.sellPriceAvg) / 2 }))
    .sort((a, b) => a.t - b.t)
  // Mínimo bajo a propósito: se usa también para ventanas cortas (1-3 semanas) donde
  // el ruido es normal pero el patrón ya empieza a asomar — el llamador decide si
  // confía en el resultado mirando `weeks`/consistencia, no lo bloqueamos acá.
  if (data.length < 5) return null

  // Desviación de cada día vs media móvil CENTRADA de 7 días (±3), que quita la tendencia.
  const HALF = 3
  const buckets: number[][] = Array.from({ length: 7 }, () => [])
  for (let i = 0; i < data.length; i++) {
    const lo = Math.max(0, i - HALF)
    const hi = Math.min(data.length - 1, i + HALF)
    let sum = 0
    let n = 0
    for (let j = lo; j <= hi; j++) {
      sum += data[j].price
      n++
    }
    const base = sum / n
    if (base > 0) buckets[data[i].dow].push(data[i].price / base - 1)
  }

  // Umbral de muestras por día escala con lo que hay disponible: exigir 8 muestras
  // en una ventana de 1 semana descartaría todo. Con ventanas cortas alcanza con
  // que el día haya aparecido al menos una vez.
  const minSamplesPerDow = data.length >= 400 ? 8 : data.length >= 120 ? 4 : data.length >= 40 ? 2 : 1

  const byDow: DowStat[] = buckets.map((devs, dow) => ({
    dow,
    label: DOW_LABELS[dow],
    avgDevPct: devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : 0,
    samples: devs.length,
  }))

  const present = byDow.filter((d) => d.samples >= minSamplesPerDow)
  if (present.length < 4) return null // necesitamos al menos más de la mitad de la semana representada

  const cheapest = present.reduce((m, d) => (d.avgDevPct < m.avgDevPct ? d : m))
  const richest = present.reduce((m, d) => (d.avgDevPct > m.avgDevPct ? d : m))

  // Consistencia: agrupá en semanas (ventanas fijas de 7 días) y mirá qué tan
  // seguido el día barato quedó por debajo del promedio de su propia semana.
  const weekMap = new Map<number, { sum: number; n: number; byDow: Map<number, number> }>()
  for (const d of data) {
    const wk = Math.floor(d.t / (7 * DAY))
    let e = weekMap.get(wk)
    if (!e) {
      e = { sum: 0, n: 0, byDow: new Map() }
      weekMap.set(wk, e)
    }
    e.sum += d.price
    e.n++
    e.byDow.set(d.dow, d.price)
  }
  let hit = 0
  let tot = 0
  for (const e of weekMap.values()) {
    if (e.n < 4) continue // semana con muy pocos días, no es representativa
    const m = e.sum / e.n
    const p = e.byDow.get(cheapest.dow)
    if (p !== undefined) {
      tot++
      if (p < m) hit++
    }
  }

  return {
    byDow,
    samples: data.length,
    cheapestDow: cheapest.dow,
    richestDow: richest.dow,
    cheapestLabel: cheapest.label,
    richestLabel: richest.label,
    spreadPct: richest.avgDevPct - cheapest.avgDevPct,
    consistency: tot ? hit / tot : 0,
    weeks: tot,
  }
}
