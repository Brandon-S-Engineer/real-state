// ── Lectura y resampleo de velas ─────────────────────────────────────────────
//
// M1 es la ÚNICA fuente de verdad en disco. Todo lo demás (m5, m15, h1, h4, d1)
// se deriva agregando en DuckDB. Guardar cada temporalidad por separado sería
// duplicar gigas y, peor, abrir la puerta a que dos vistas del mismo mercado se
// desincronicen.
//
// La agregación OHLCV correcta es:
//   open  = el primer open del bucket   (arg_min por timestamp)
//   high  = max(high)
//   low   = min(low)
//   close = el último close del bucket  (arg_max por timestamp)
//   volume= sum(volume)
//
// Ojo con `open`/`close`: NO son min/max ni first/last de la fila — dependen del
// ORDEN temporal dentro del bucket. `arg_min`/`arg_max` de DuckDB lo resuelven
// sin depender de que el Parquet venga ordenado.

import { TF_MINUTOS, getInstrumento, type Timeframe } from '@/content/trading-instruments'
import { parquetGlob, query, sqlString } from './store'

export type Bar = {
  /** Epoch en milisegundos (apertura de la vela). */
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type BarsResult = {
  symbol: string
  timeframe: Timeframe
  bars: Bar[]
  /** true si el símbolo no tiene ningún Parquet descargado todavía. */
  sinDatos: boolean
}

type RawBar = { t: number; o: number; h: number; l: number; c: number; v: number }

/**
 * Devuelve velas de un símbolo en la temporalidad pedida, resampleando desde M1.
 *
 * `limit` acota cuántas velas devolver (las más recientes del rango), para que
 * la UI no intente pintar 3 millones de puntos. `to`/`from` son epoch ms.
 */
export async function getBars(opts: {
  symbol: string
  timeframe: Timeframe
  from?: number
  to?: number
  limit?: number
}): Promise<BarsResult> {
  const { symbol, timeframe } = opts
  const inst = getInstrumento(symbol)
  if (!inst) throw new Error(`Instrumento desconocido: ${symbol}`)

  const glob = parquetGlob(inst.symbol)
  if (!glob) return { symbol: inst.symbol, timeframe, bars: [], sinDatos: true }

  const src = `read_parquet(${sqlString(glob)})`
  const where: string[] = []
  if (opts.from) where.push(`t >= ${Math.floor(opts.from)}`)
  if (opts.to) where.push(`t <= ${Math.floor(opts.to)}`)
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(opts.limit ?? 5000, 200_000)

  const minutos = TF_MINUTOS[timeframe]

  // Para m1 no hace falta agregar nada: se lee directo.
  const sql =
    minutos === 1
      ? `
        SELECT t, o, h, l, c, v
        FROM ${src}
        ${whereSql}
        ORDER BY t DESC
        LIMIT ${limit}
      `
      : `
        SELECT
          bucket AS t,
          arg_min(o, t) AS o,
          max(h)        AS h,
          min(l)        AS l,
          arg_max(c, t) AS c,
          sum(v)        AS v
        FROM (
          SELECT *, (t // ${minutos * 60_000}) * ${minutos * 60_000} AS bucket
          FROM ${src}
          ${whereSql}
        )
        GROUP BY bucket
        ORDER BY bucket DESC
        LIMIT ${limit}
      `

  const rows = await query<RawBar>(sql)
  // Se pidió DESC para quedarnos con las MÁS RECIENTES del rango; la UI las
  // necesita en orden cronológico.
  const bars = rows.reverse().map((r) => ({
    t: Number(r.t),
    o: Number(r.o),
    h: Number(r.h),
    l: Number(r.l),
    c: Number(r.c),
    v: Number(r.v),
  }))

  return { symbol: inst.symbol, timeframe, bars, sinDatos: false }
}

/** Resumen de lo que hay en disco para un símbolo — para la página índice. */
export async function getCobertura(symbol: string): Promise<{
  symbol: string
  velas: number
  desde: number | null
  hasta: number | null
} | null> {
  const inst = getInstrumento(symbol)
  if (!inst) return null
  const glob = parquetGlob(inst.symbol)
  if (!glob) return { symbol: inst.symbol, velas: 0, desde: null, hasta: null }

  const rows = await query<{ n: number; lo: number | null; hi: number | null }>(
    `SELECT count(*) AS n, min(t) AS lo, max(t) AS hi FROM read_parquet(${sqlString(glob)})`,
  )
  const r = rows[0]
  return {
    symbol: inst.symbol,
    velas: Number(r?.n ?? 0),
    desde: r?.lo != null ? Number(r.lo) : null,
    hasta: r?.hi != null ? Number(r.hi) : null,
  }
}
