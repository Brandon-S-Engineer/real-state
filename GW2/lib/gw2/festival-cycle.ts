// ── Ciclo de festival: comprar el dumping, vender en la sequía ────────────────
//
// La mecánica que explota esto NO es apostar. Es ser el que le compra al que
// apostó y perdió:
//   1. Durante el festival la gente abre cajas/bolsas en masa. El 99% pierde.
//   2. El 1% que saca algo bueno lo LISTA rápido para realizar la ganancia.
//      Eso satura la oferta y hunde el precio de todo lo que sale de las cajas.
//   3. El barón compra ahí barato, aguanta meses, y vende cuando la oferta se
//      secó y solo quedan los que necesitan el ítem.
//
// Nada de esto se adivina: se MIDE contra los ~6 años de historial diario que ya
// tenemos por ítem. Para cada año completo se calcula qué habría pasado comprando
// durante el festival y vendiendo en el pico de la temporada siguiente.
//
// Dos decisiones de honestidad, para no venderse humo:
//   - La compra se mide al PROMEDIO del festival, no al mínimo exacto (clavar el
//     mínimo es hindsight; el promedio sí es alcanzable poniendo órdenes).
//   - La venta descuenta el 15% de comisión del TP. Un x2 bruto es x1.7 neto.
//
// Además se mide la DIRECCIÓN del efecto del festival comparando contra la
// línea base de los 60 días previos, en vez de hardcodearla por ítem:
//   - festivalEffect < 1 → el festival lo INUNDA  ⇒ comprar durante el festival
//   - festivalEffect > 1 → el festival lo DEMANDA ⇒ vender hacia el festival
//     (caso Four Winds: los mats base se usan como moneda para las cajas)

const DAY = 24 * 60 * 60 * 1000
const TP_CUT = 0.15

export type FestivalYearCycle = {
  year: number
  /** Precio medio de compra durante la ventana del festival (entrada realista). */
  festAvg: number
  /** Mínimo tocado durante el festival (referencia de cuán abajo llegó). */
  festLow: number
  /** Pico alcanzado en la temporada siguiente, antes del próximo festival. */
  peak: number
  peakDate: string
  monthsToPeak: number
  /** peak / festAvg, sin descontar comisión. */
  grossRatio: number
  /** Lo que de verdad te queda: (peak × 0.85) / festAvg. */
  netRatio: number
}

export type FestivalPlay = 'comprar-en-festival' | 'vender-hacia-festival' | 'sin-señal'

export type FestivalCycleStat = {
  years: FestivalYearCycle[]
  yearsTotal: number
  /** Años en que comprar en el festival y vender después dejó ganancia NETA. */
  yearsPositive: number
  /** Mediana del retorno neto (robusta ante un año atípico). */
  medianNetRatio: number
  /** Mediana de meses a aguantar hasta el pico. */
  medianMonthsToPeak: number
  /** Mes típico de venta (0-11), el más repetido entre los picos. */
  typicalSellMonth: number
  /** festAvg / baseline de los 60 días previos. <1 = el festival lo hunde. */
  festivalEffect: number
  play: FestivalPlay
  /** Precio medio del festival más reciente — el objetivo de compra. */
  lastFestAvg: number
  /** Banda de precios del último festival, para ubicar el precio de hoy. */
  lastFestLow: number
  lastFestHigh: number
  /**
   * Curva de recuperación promedio: para cada mes DESPUÉS del cierre del
   * festival, el precio medio relativo al precio del festival (1.0 = igual que
   * en el festival). Es la prueba visual de "sí sube después".
   */
  curve: { month: number; rel: number }[]
}

export type BandVerdict = 'barato' | 'en-banda' | 'caro'

/**
 * Ubica el precio de hoy contra la banda del último festival. Se calcula aparte
 * del análisis pesado para poder cachear las estadísticas (que cambian 1×/día)
 * y seguir usando precios frescos en cada carga.
 */
export function bandVerdict(current: number, stat: FestivalCycleStat): BandVerdict | null {
  if (current <= 0 || stat.lastFestAvg <= 0) return null
  if (current <= stat.lastFestLow * 1.05) return 'barato'
  return current <= stat.lastFestHigh ? 'en-banda' : 'caro'
}

type Row = { date: Date; buyPriceAvg: number; sellPriceAvg: number }
type Window = { startMonth: number; startDay: number; endMonth: number; endDay: number }

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function occurrence(w: Window, year: number) {
  const start = new Date(Date.UTC(year, w.startMonth - 1, w.startDay))
  const crossesYear = w.endMonth < w.startMonth
  const end = new Date(Date.UTC(crossesYear ? year + 1 : year, w.endMonth - 1, w.endDay, 23, 59, 59))
  return { start, end }
}

/**
 * Analiza el ciclo de un ítem alrededor de la ventana anual de su festival.
 * Devuelve null si no hay ni un ciclo completo medible. Es puro y no depende del
 * precio actual, así que su resultado se puede cachear (ver `festival-cache.ts`);
 * para ubicar el precio de hoy contra la banda usá `bandVerdict()`.
 */
export function analyzeFestivalCycle(rows: Row[], window: Window): FestivalCycleStat | null {
  const data = rows.filter((r) => r.buyPriceAvg > 0).sort((a, b) => a.date.getTime() - b.date.getTime())
  if (data.length < 200) return null

  const firstYear = data[0].date.getUTCFullYear()
  const nowY = new Date().getUTCFullYear()

  const years: FestivalYearCycle[] = []
  const effects: number[] = []
  let lastFestAvg = 0
  let lastFestLow = 0
  let lastFestHigh = 0
  // Acumulador de la curva de recuperación: por mes tras el festival, todos los
  // precios relativos observados (de todos los años) para promediarlos al final.
  const curveBuckets: number[][] = Array.from({ length: 12 }, () => [])

  for (let y = firstYear; y <= nowY; y++) {
    const { start, end } = occurrence(window, y)
    const inFest = data.filter((r) => r.date >= start && r.date <= end)
    if (inFest.length < 5) continue

    const festPrices = inFest.map((r) => r.buyPriceAvg)
    const festAvg = festPrices.reduce((s, p) => s + p, 0) / festPrices.length
    const festLow = Math.min(...festPrices)
    const festHigh = Math.max(...festPrices)

    // Dirección del efecto: el festival ¿hunde o infla este ítem?
    const baseStart = new Date(start.getTime() - 60 * DAY)
    const baseline = data.filter((r) => r.date >= baseStart && r.date < start).map((r) => r.buyPriceAvg)
    if (baseline.length >= 20) {
      const baseAvg = baseline.reduce((s, p) => s + p, 0) / baseline.length
      if (baseAvg > 0) effects.push(festAvg / baseAvg)
    }

    // Guardamos la banda del festival más reciente que tenga datos: es el
    // objetivo de compra contra el que se compara el precio de hoy.
    lastFestAvg = festAvg
    lastFestLow = festLow
    lastFestHigh = festHigh

    // Temporada siguiente: desde que cierra el festival hasta que abre el próximo.
    const nextStart = occurrence(window, y + 1).start
    const after = data.filter((r) => r.date > end && r.date < nextStart)
    if (after.length < 30) continue // ciclo incompleto (el año en curso), no se puede evaluar

    const peakRow = after.reduce((m, r) => (r.buyPriceAvg > m.buyPriceAvg ? r : m))
    const peak = peakRow.buyPriceAvg
    const monthsToPeak = (peakRow.date.getTime() - end.getTime()) / (30 * DAY)

    // Curva: cada día posterior aporta su precio relativo al bucket de su mes.
    for (const r of after) {
      const m = Math.floor((r.date.getTime() - end.getTime()) / (30 * DAY))
      if (m >= 0 && m < 12) curveBuckets[m].push(r.buyPriceAvg / festAvg)
    }

    years.push({
      year: y,
      festAvg: Math.round(festAvg),
      festLow: Math.round(festLow),
      peak: Math.round(peak),
      peakDate: peakRow.date.toISOString().slice(0, 10),
      monthsToPeak: Math.round(monthsToPeak * 10) / 10,
      grossRatio: peak / festAvg,
      netRatio: (peak * (1 - TP_CUT)) / festAvg,
    })
  }

  if (years.length === 0) return null

  const netRatios = years.map((y) => y.netRatio)
  const medianNetRatio = median(netRatios)
  const festivalEffect = effects.length ? median(effects) : 1

  // Mes de venta típico: el más frecuente entre los picos históricos.
  const monthCounts = new Map<number, number>()
  for (const y of years) {
    const m = new Date(y.peakDate).getUTCMonth()
    monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1)
  }
  const typicalSellMonth = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]

  // La jugada sale de los datos, no de una etiqueta escrita a mano.
  let play: FestivalPlay = 'sin-señal'
  if (festivalEffect <= 0.97 && medianNetRatio > 1.1) play = 'comprar-en-festival'
  else if (festivalEffect >= 1.05) play = 'vender-hacia-festival'
  else if (medianNetRatio > 1.15) play = 'comprar-en-festival'

  return {
    years,
    yearsTotal: years.length,
    yearsPositive: years.filter((y) => y.netRatio > 1).length,
    medianNetRatio,
    medianMonthsToPeak: median(years.map((y) => y.monthsToPeak)),
    typicalSellMonth,
    festivalEffect,
    play,
    lastFestAvg: Math.round(lastFestAvg),
    lastFestLow: Math.round(lastFestLow),
    lastFestHigh: Math.round(lastFestHigh),
    curve: curveBuckets
      .map((b, month) => ({ month, rel: b.length ? b.reduce((s, v) => s + v, 0) / b.length : 0 }))
      .filter((p) => p.rel > 0),
  }
}

// ── La orden concreta: ¿qué hago HOY con este ítem? ──────────────────────────
//
// Los números solos no bastan: "efecto +16%, neto x1.00" no le dice a nadie qué
// hacer. Esto traduce la estadística + el momento del calendario en una sola
// instrucción en imperativo, con el número que la respalda.

export type ActionKind = 'acumular' | 'vender' | 'comprar' | 'aguantar' | 'esperar'

export type FestivalAction = {
  kind: ActionKind
  urgency: 'ahora' | 'pronto' | 'esperar'
  /** Qué hacer, en imperativo. */
  headline: string
  /** Por qué, con el dato que lo sostiene. */
  detail: string
  /**
   * El tamaño de la jugada en ORO, no en porcentajes: cuánto deja cada unidad y
   * cuánto deja un stack de 250. Un +30% sobre un mat de 97c y un +16% sobre un
   * ecto de 30s no son comparables, y el porcentaje solo hace parecer mejor al
   * primero.
   */
  gainPerUnit: number
  gainPerStack: number
}

const STACK = 250

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function festivalAction(
  stat: FestivalCycleStat,
  ctx: { isActive: boolean; daysUntilNext: number; band: BandVerdict | null; currentBid: number },
): FestivalAction | null {
  const effectPct = Math.round(Math.abs(stat.festivalEffect - 1) * 100)
  const ret = stat.medianNetRatio
  const conf = `${stat.yearsPositive}/${stat.yearsTotal} años`

  // ── Sube con el festival: se acumula antes y se descarga durante ──
  if (stat.play === 'vender-hacia-festival') {
    const gainPerUnit = Math.round(ctx.currentBid * (stat.festivalEffect - 1))
    const size = { gainPerUnit, gainPerStack: gainPerUnit * STACK }

    if (ctx.isActive) {
      return {
        ...size,
        kind: 'vender',
        urgency: 'ahora',
        headline: 'VENDÉ AHORA — está en su pico de demanda',
        detail: `El festival lo empuja +${effectPct}% sobre su precio normal porque se paga por las cajas. Esta es la ventana: cuando cierre el evento la demanda desaparece de golpe.`,
      }
    }
    if (ctx.daysUntilNext <= 60) {
      return {
        ...size,
        kind: 'acumular',
        urgency: 'pronto',
        headline: `Acumulá YA — faltan ${ctx.daysUntilNext} días y después sube`,
        detail: `Al arrancar el festival sube +${effectPct}%. Comprá ahora lo que vayas a vender durante el evento; cada día que pasa está más caro.`,
      }
    }
    return {
      ...size,
      kind: 'acumular',
      urgency: 'esperar',
      headline: `Acumulá de a poco durante los próximos meses`,
      detail: `Sube +${effectPct}% cuando arranca el festival (en ${ctx.daysUntilNext} días). Comprá barato ahora, sin apuro, y descargá todo durante el evento.`,
    }
  }

  // ── Se hunde con el festival: se compra el dumping y se aguanta ──
  if (stat.play === 'comprar-en-festival') {
    const sellMonth = MONTH_NAMES[stat.typicalSellMonth]
    // Ganancia esperada comprando al precio típico del festival.
    const base = stat.lastFestAvg > 0 ? stat.lastFestAvg : ctx.currentBid
    const gainPerUnit = Math.round(base * (ret - 1))
    const size = { gainPerUnit, gainPerStack: gainPerUnit * STACK }
    const holdTxt = `Aguantalo ~${stat.medianMonthsToPeak.toFixed(0)} meses y vendé cerca de ${sellMonth}: retorno neto mediano x${ret.toFixed(2)} (funcionó ${conf}).`

    if (ctx.isActive) {
      return {
        ...size,
        kind: 'comprar',
        urgency: 'ahora',
        headline: 'COMPRÁ AHORA — la oferta está saturada',
        detail: `Durante el festival cae −${effectPct}% porque todos abren cajas y liquidan lo que sacan. ${holdTxt}`,
      }
    }
    if (ctx.daysUntilNext <= 30) {
      // Si YA cotiza dentro de la banda barata del último festival, esperar no
      // aporta: podés empezar a entrar y promediar cuando caiga más.
      if (ctx.band === 'barato') {
        return {
          ...size,
          kind: 'comprar',
          urgency: 'pronto',
          headline: `Ya está a precio de festival — empezá a entrar (faltan ${ctx.daysUntilNext} días)`,
          detail: `Hoy cotiza por debajo de lo que costó en el último festival, así que no hace falta esperar. Entrá con parte del capital ahora y guardá el resto para promediar si cae más durante el evento (suele caer −${effectPct}%). ${holdTxt}`,
        }
      }
      return {
        ...size,
        kind: 'esperar',
        urgency: 'pronto',
        headline: `Esperá ${ctx.daysUntilNext} días — en el festival colapsa el precio`,
        detail: `Cae −${effectPct}% cuando arranca el evento. No compres ahora: en ${ctx.daysUntilNext} días lo tenés más barato. ${holdTxt}`,
      }
    }
    if (ctx.band === 'barato') {
      return {
        ...size,
        kind: 'comprar',
        urgency: 'pronto',
        headline: 'Está a precio de festival incluso fuera de él — podés entrar',
        detail: `Hoy cotiza dentro de la banda barata del último festival, así que no hace falta esperar. ${holdTxt}`,
      }
    }
    return {
      ...size,
      kind: 'esperar',
      urgency: 'esperar',
      headline: `Esperá al festival — faltan ${ctx.daysUntilNext} días`,
      detail: `Ahí cae −${effectPct}% por la sobreoferta. Comprar antes es pagar de más. ${holdTxt}`,
    }
  }

  return null
}
