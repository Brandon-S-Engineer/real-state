// ── Análisis de inversión ────────────────────────────────────────────────────
//
// Toma el historial diario multi-año de un activo y decide si es buen momento de
// ENTRADA. Ojo con el sesgo: un activo que se aprecia casi siempre está por
// encima de su promedio histórico (porque sube con el tiempo), así que comparar
// vs la media lo haría ver "caro" para siempre. El timing real de compra es el
// DIP vs su máximo reciente (cuando un festival inunda la oferta, o cae la
// demanda temporal). Entonces medimos:
//   - drawdown vs el máximo de los últimos ~120 días (qué tan hundido está)
//   - percentil dentro de esa ventana reciente
//   - tendencia a 2 años (¿es un activo que de verdad se aprecia y vale aguantar?)
// Señal: comprar en el dip de un activo que aprecia; vender cerca del pico del
// ciclo; esperar en el medio.

const DAY = 24 * 60 * 60 * 1000
const RECENT_DAYS = 120

export type InvestSignal = 'comprar' | 'esperar' | 'vender'

export type InvestStat = {
  current: number
  avg1y: number
  minRecent: number
  maxRecent: number
  /** Máximo de la ventana reciente (~120d). */
  recentHigh: number
  /** (recentHigh − actual) / recentHigh. Alto = hundido = oportunidad. */
  drawdown: number
  /** Fracción de días de la ventana reciente con precio ≤ el actual (bajo = piso). */
  pctRecent: number
  /** Apreciación a 2 años: media de los últimos 60d vs primeros 60d. */
  trend2yPct: number
  signal: InvestSignal
  /** Serie de precios (downsampleada) para el sparkline, 2 años. */
  spark: number[]
}

type DailyRow = { date: Date; sellPriceAvg: number }

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
}

function downsample(xs: number[], target: number): number[] {
  if (xs.length <= target) return xs
  const bucket = xs.length / target
  const out: number[] = []
  for (let i = 0; i < target; i++) {
    out.push(mean(xs.slice(Math.floor(i * bucket), Math.floor((i + 1) * bucket))))
  }
  return out
}

export function analyzeInvestment(daily: DailyRow[], current: number): InvestStat | null {
  const rows = daily.filter((r) => r.sellPriceAvg > 0).sort((a, b) => a.date.getTime() - b.date.getTime())
  if (rows.length < 30 || current <= 0) return null

  const now = Date.now()

  // Ventana reciente para el timing de entrada (dip vs máximo reciente).
  const recent = rows.filter((r) => now - r.date.getTime() <= RECENT_DAYS * DAY)
  const rp = (recent.length >= 20 ? recent : rows.slice(-RECENT_DAYS)).map((r) => r.sellPriceAvg)
  const recentHigh = Math.max(...rp, current)
  const minRecent = Math.min(...rp, current)
  const maxRecent = Math.max(...rp, current)
  const drawdown = recentHigh > 0 ? (recentHigh - current) / recentHigh : 0
  const pctRecent = rp.filter((p) => p <= current).length / rp.length

  const y1 = rows.filter((r) => now - r.date.getTime() <= 365 * DAY)
  const avg1y = mean((y1.length >= 30 ? y1 : rows).map((r) => r.sellPriceAvg))

  // Tendencia a 2 años (o todo lo disponible): últimos 60d vs primeros 60d.
  const y2 = rows.filter((r) => now - r.date.getTime() <= 730 * DAY)
  const trendBase = y2.length >= 120 ? y2 : rows
  const first60 = mean(trendBase.slice(0, 60).map((r) => r.sellPriceAvg))
  const last60 = mean(trendBase.slice(-60).map((r) => r.sellPriceAvg))
  const trend2yPct = first60 > 0 ? (last60 - first60) / first60 : 0

  // Señal: comprar en un dip real de un activo que no se está desplomando;
  // vender cerca del pico reciente de un activo que aprecia (tomar ganancia del ciclo).
  let signal: InvestSignal = 'esperar'
  const notCollapsing = trend2yPct > -0.15
  if ((drawdown >= 0.1 || pctRecent <= 0.25) && notCollapsing) signal = 'comprar'
  else if (drawdown <= 0.03 && trend2yPct > 0.05) signal = 'vender'

  return {
    current,
    avg1y,
    minRecent,
    maxRecent,
    recentHigh,
    drawdown,
    pctRecent,
    trend2yPct,
    signal,
    spark: downsample(y2.map((r) => r.sellPriceAvg), 56),
  }
}
