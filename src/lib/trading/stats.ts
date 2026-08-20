// ── Motor de estadísticas del diario ─────────────────────────────────────────
//
// Responde la única pregunta que importa: ¿esto tiene ventaja, o vengo teniendo
// suerte? Todo se mide en R (múltiplos de riesgo), no en dinero: así una
// operación de 2 lotes y una de 0.1 son comparables, y las estadísticas siguen
// valiendo aunque cambie el tamaño de la cuenta.
//
//   R = ganancia / riesgo asumido
//   riesgo = |entrada real − stop planificado|
//
// El riesgo se mide contra el stop PLANIFICADO a propósito. Si se midiera contra
// el stop movido a último momento, mover el stop "para que no salte" mejoraría
// las estadísticas — justo el hábito que arruina cuentas. Acá eso aparece como
// pérdida mayor a 1R, que es lo que de verdad fue.
//
// Igual que en `price-band.ts`, cuando no hay muestra suficiente se devuelve
// null en vez de un número que aparente precisión que no existe.

/** Mínimo de operaciones cerradas para que la expectativa signifique algo. */
export const MUESTRA_MINIMA = 20

export type TradeEntrada = {
  id: string
  symbol: string
  timeframe: string
  mode: string
  direccion: string
  plannedEntry: number
  plannedStop: number
  plannedTarget: number | null
  riskPct: number | null
  entryAt: Date
  entryPrice: number
  exitAt: Date | null
  exitPrice: number | null
  sizeUnits: number | null
  fees: number
  session: string | null
  setupId: string | null
  notas: string | null
}

export type TradeCalculado = TradeEntrada & {
  abierta: boolean
  /** Riesgo por unidad: |entrada real − stop planificado|. */
  riesgo: number
  /** Resultado en múltiplos de riesgo. null si sigue abierta. */
  r: number | null
  resultado: 'ganada' | 'perdida' | 'nula' | 'abierta'
  /**
   * Disciplina: ¿la salida respetó el plan? Una pérdida de más de 1.15R quiere
   * decir que el stop no se respetó (o hubo deslizamiento grande).
   */
  respetoStop: boolean | null
}

/** Calcula R y resultado de una operación. Puro, sin estado. */
export function calcularTrade(t: TradeEntrada): TradeCalculado {
  const largo = t.direccion === 'long'
  const riesgo = Math.abs(t.entryPrice - t.plannedStop)
  const abierta = t.exitAt == null || t.exitPrice == null

  if (abierta || riesgo <= 0) {
    return { ...t, abierta: true, riesgo, r: null, resultado: 'abierta', respetoStop: null }
  }

  const bruto = largo ? t.exitPrice! - t.entryPrice : t.entryPrice - t.exitPrice!
  const neto = bruto - (t.fees ?? 0)
  const r = neto / riesgo

  // Umbral de "nula" en 0.05R: un cierre a la par nunca da exactamente 0 por
  // comisiones y deslizamiento, y contarlo como pérdida distorsiona el % de acierto.
  const resultado: TradeCalculado['resultado'] = r > 0.05 ? 'ganada' : r < -0.05 ? 'perdida' : 'nula'

  return { ...t, abierta: false, riesgo, r, resultado, respetoStop: r >= -1.15 }
}

export type Estadisticas = {
  total: number
  cerradas: number
  abiertas: number
  ganadas: number
  perdidas: number
  nulas: number
  /** Fracción de aciertos sobre las cerradas (0-1). */
  aciertos: number
  /** R esperado por operación. Es EL número: positivo = hay ventaja. */
  expectativa: number
  /** Suma de todos los R. */
  rTotal: number
  gananciaMediaR: number
  perdidaMediaR: number
  /** Bruto ganado / bruto perdido. >1 = rentable. */
  factorBeneficio: number
  mejorR: number
  peorR: number
  rachaGanadora: number
  rachaPerdedora: number
  /** Caída máxima de la curva de equity, en R. */
  drawdownMaxR: number
  /** Curva acumulada de R, para graficar. */
  curva: { i: number; r: number }[]
  /** Fracción de operaciones donde se respetó el stop planificado. */
  disciplina: number | null
  /** true si hay muestra suficiente para tomarse en serio la expectativa. */
  confiable: boolean
}

export function computeStats(trades: TradeCalculado[]): Estadisticas | null {
  if (trades.length === 0) return null

  const cerradas = trades.filter((t) => !t.abierta && t.r != null)
  const abiertas = trades.length - cerradas.length

  if (cerradas.length === 0) {
    return {
      total: trades.length,
      cerradas: 0,
      abiertas,
      ganadas: 0,
      perdidas: 0,
      nulas: 0,
      aciertos: 0,
      expectativa: 0,
      rTotal: 0,
      gananciaMediaR: 0,
      perdidaMediaR: 0,
      factorBeneficio: 0,
      mejorR: 0,
      peorR: 0,
      rachaGanadora: 0,
      rachaPerdedora: 0,
      drawdownMaxR: 0,
      curva: [],
      disciplina: null,
      confiable: false,
    }
  }

  // Orden cronológico: la racha y el drawdown dependen de la secuencia real.
  const orden = [...cerradas].sort((a, b) => (a.exitAt?.getTime() ?? 0) - (b.exitAt?.getTime() ?? 0))
  const rs = orden.map((t) => t.r as number)

  const ganadas = orden.filter((t) => t.resultado === 'ganada')
  const perdidas = orden.filter((t) => t.resultado === 'perdida')
  const nulas = orden.filter((t) => t.resultado === 'nula')

  const sumaGanancias = ganadas.reduce((s, t) => s + (t.r as number), 0)
  const sumaPerdidas = perdidas.reduce((s, t) => s + Math.abs(t.r as number), 0)
  const rTotal = rs.reduce((s, r) => s + r, 0)

  // Curva de equity acumulada y drawdown máximo sobre ella.
  let acc = 0
  let pico = 0
  let drawdownMaxR = 0
  const curva: { i: number; r: number }[] = [{ i: 0, r: 0 }]
  rs.forEach((r, i) => {
    acc += r
    if (acc > pico) pico = acc
    const dd = pico - acc
    if (dd > drawdownMaxR) drawdownMaxR = dd
    curva.push({ i: i + 1, r: acc })
  })

  // Rachas (las nulas no cortan una racha ni la alimentan).
  let rachaG = 0
  let rachaP = 0
  let curG = 0
  let curP = 0
  for (const t of orden) {
    if (t.resultado === 'ganada') {
      curG++
      curP = 0
    } else if (t.resultado === 'perdida') {
      curP++
      curG = 0
    } else continue
    if (curG > rachaG) rachaG = curG
    if (curP > rachaP) rachaP = curP
  }

  const conDisciplina = orden.filter((t) => t.respetoStop != null)

  return {
    total: trades.length,
    cerradas: cerradas.length,
    abiertas,
    ganadas: ganadas.length,
    perdidas: perdidas.length,
    nulas: nulas.length,
    aciertos: ganadas.length / cerradas.length,
    expectativa: rTotal / cerradas.length,
    rTotal,
    gananciaMediaR: ganadas.length ? sumaGanancias / ganadas.length : 0,
    perdidaMediaR: perdidas.length ? sumaPerdidas / perdidas.length : 0,
    // Sin pérdidas todavía el factor es infinito; se devuelve 0 y la UI lo trata
    // como "sin dato" en vez de mostrar un ∞ que parece un logro.
    factorBeneficio: sumaPerdidas > 0 ? sumaGanancias / sumaPerdidas : 0,
    mejorR: Math.max(...rs),
    peorR: Math.min(...rs),
    rachaGanadora: rachaG,
    rachaPerdedora: rachaP,
    drawdownMaxR,
    curva,
    disciplina: conDisciplina.length ? conDisciplina.filter((t) => t.respetoStop).length / conDisciplina.length : null,
    confiable: cerradas.length >= MUESTRA_MINIMA,
  }
}

export type Corte = { clave: string; etiqueta: string; stats: Estadisticas }

/**
 * Parte las operaciones por una dimensión (setup, sesión, símbolo, día…) y
 * calcula las estadísticas de cada grupo. Así se ve DÓNDE está la ventaja, que
 * casi nunca está repartida pareja.
 */
export function cortarPor(
  trades: TradeCalculado[],
  clave: (t: TradeCalculado) => string | null,
  etiqueta?: (k: string) => string,
): Corte[] {
  const grupos = new Map<string, TradeCalculado[]>()
  for (const t of trades) {
    const k = clave(t)
    if (k == null) continue
    const arr = grupos.get(k)
    if (arr) arr.push(t)
    else grupos.set(k, [t])
  }
  return [...grupos.entries()]
    .map(([k, ts]) => ({ clave: k, etiqueta: etiqueta ? etiqueta(k) : k, stats: computeStats(ts)! }))
    .filter((c) => c.stats != null)
    .sort((a, b) => b.stats.expectativa - a.stats.expectativa)
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** Sesión de mercado en la que se abrió la operación (horas UTC). */
export function sesionDe(fecha: Date): 'asia' | 'londres' | 'ny' | 'solape' {
  const h = fecha.getUTCHours()
  if (h >= 12 && h < 16) return 'solape' // Londres y NY abiertas a la vez
  if (h >= 7 && h < 12) return 'londres'
  if (h >= 16 && h < 21) return 'ny'
  return 'asia'
}

export function diaSemanaDe(fecha: Date): string {
  return DIAS[fecha.getUTCDay()]
}
