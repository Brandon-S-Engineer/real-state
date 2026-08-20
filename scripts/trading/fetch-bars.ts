// ── Descarga de velas M1 desde Dukascopy → Parquet ───────────────────────────
//
// Bajar 20 instrumentos × 20 años de M1 son horas. Por eso este CLI es
// REANUDABLE: trabaja año por año y saltea los que ya están en disco, así se
// puede cortar con Ctrl-C y volver a lanzar sin perder nada. Además usa el caché
// propio de dukascopy-node, que evita re-pedir los mismos ficheros horarios.
//
// Nunca pide un rango anterior a `m1Desde` del instrumento: pedir 2003 de un
// índice que arranca en 2013 son miles de descargas vacías.
//
// Uso:
//   npm run trading:fetch -- --symbol EURUSD --from 2024 --to 2024
//   npm run trading:fetch -- --symbol EURUSD                 (todo su historial)
//   npm run trading:fetch -- --all --from 2020               (toda la watchlist)
//   npm run trading:fetch -- --symbol EURUSD --from 2024 --force   (rebaja años ya presentes)

import { getHistoricalRates } from 'dukascopy-node'
/** El tipo del enum de instrumentos de dukascopy-node. */
type DukaInstrument = Parameters<typeof getHistoricalRates>[0]['instrument']
import fs from 'node:fs'
import path from 'node:path'
import { DuckDBInstance } from '@duckdb/node-api'
import { INSTRUMENTOS, getInstrumento, type Instrumento } from '@/content/trading-instruments'

const DATA_DIR = path.join(process.cwd(), 'data', 'trading')
const BARS_DIR = path.join(DATA_DIR, 'bars')
const CACHE_DIR = path.join(DATA_DIR, '.cache')

type Args = { symbol?: string; all: boolean; from?: number; to?: number; force: boolean }

function parseArgs(): Args {
  const a = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const i = a.indexOf(flag)
    return i >= 0 ? a[i + 1] : undefined
  }
  return {
    symbol: get('--symbol'),
    all: a.includes('--all'),
    from: get('--from') ? Number(get('--from')) : undefined,
    to: get('--to') ? Number(get('--to')) : undefined,
    force: a.includes('--force'),
  }
}

function parquetPath(symbol: string, year: number): string {
  return path.join(BARS_DIR, symbol.toUpperCase(), 'm1', `${year}.parquet`)
}

/**
 * Escribe las velas a Parquet vía DuckDB. Se pasa por un JSON temporal en vez de
 * armar un INSERT gigante: con ~370k velas por año, un INSERT con literales
 * sería una sentencia de decenas de MB.
 */
async function writeParquet(rows: { t: number; o: number; h: number; l: number; c: number; v: number }[], out: string) {
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const tmp = `${out}.tmp.json`
  fs.writeFileSync(tmp, JSON.stringify(rows))
  const instance = await DuckDBInstance.create(':memory:')
  const conn = await instance.connect()
  try {
    // Los tipos se fijan a mano: sin esto DuckDB podría inferir BIGINT para un
    // volumen que a veces viene entero, y romper la unión entre años.
    await conn.run(`
      COPY (
        SELECT
          CAST(t AS BIGINT) AS t,
          CAST(o AS DOUBLE) AS o,
          CAST(h AS DOUBLE) AS h,
          CAST(l AS DOUBLE) AS l,
          CAST(c AS DOUBLE) AS c,
          CAST(v AS DOUBLE) AS v
        FROM read_json('${tmp.replace(/'/g, "''")}')
        ORDER BY t
      ) TO '${out.replace(/'/g, "''")}' (FORMAT PARQUET, COMPRESSION ZSTD)
    `)
  } finally {
    conn.closeSync()
    fs.rmSync(tmp, { force: true })
  }
}

async function fetchYear(inst: Instrumento, year: number, force: boolean): Promise<'ok' | 'skip' | 'vacio'> {
  const out = parquetPath(inst.symbol, year)
  if (!force && fs.existsSync(out)) return 'skip'

  const inicio = new Date(inst.m1Desde)
  // Recorta el rango a la existencia real del dato y a hoy.
  const from = new Date(Math.max(Date.UTC(year, 0, 1), inicio.getTime()))
  const to = new Date(Math.min(Date.UTC(year + 1, 0, 1), Date.now()))
  if (from >= to) return 'vacio'

  // `id` es un string en nuestra watchlist pero dukascopy-node lo tipa con su
  // enum de 1499 instrumentos. Las claves están verificadas contra su propia
  // metadata, así que se estrecha el tipo acá en lugar de duplicar el enum.
  const data = await getHistoricalRates({
    instrument: inst.id as DukaInstrument,
    dates: { from, to },
    timeframe: 'm1',
    format: 'json',
    volumes: true,
    // OJO: la opción es `cacheFolderPath`. Se llamaba `cachePath` en mi primer
    // intento y dukascopy la ignoraba en silencio, así que cada reintento
    // rebajaba todo de cero. Con esto el backfill largo sí es barato de reanudar.
    useCache: true,
    cacheFolderPath: CACHE_DIR,
    batchSize: 10,
    pauseBetweenBatchesMs: 200,
    retryCount: 3,
    pauseBetweenRetriesMs: 500,
  })

  const rows = data
    .filter((d) => Number.isFinite(d.open) && Number.isFinite(d.close))
    .map((d) => ({ t: d.timestamp, o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume ?? 0 }))

  if (rows.length === 0) return 'vacio'
  await writeParquet(rows, out)
  return 'ok'
}

async function main() {
  const args = parseArgs()
  const targets: Instrumento[] = args.all
    ? INSTRUMENTOS
    : args.symbol
      ? [getInstrumento(args.symbol)].filter((x): x is Instrumento => {
          if (!x) console.error(`✖ Símbolo desconocido: ${args.symbol}`)
          return !!x
        })
      : []

  if (targets.length === 0) {
    console.error('Uso: --symbol EURUSD [--from 2020] [--to 2024] [--force]  |  --all [--from 2020]')
    process.exit(1)
  }

  const hoy = new Date().getUTCFullYear()
  fs.mkdirSync(CACHE_DIR, { recursive: true })

  for (const inst of targets) {
    const primerAnio = Math.max(args.from ?? new Date(inst.m1Desde).getUTCFullYear(), new Date(inst.m1Desde).getUTCFullYear())
    const ultimoAnio = Math.min(args.to ?? hoy, hoy)
    console.log(`\n▶ ${inst.symbol} (${inst.nombre}) — años ${primerAnio}..${ultimoAnio}${inst.historialDudoso ? '  [historial declarado poco fiable]' : ''}`)

    for (let y = primerAnio; y <= ultimoAnio; y++) {
      const t0 = Date.now()
      try {
        const res = await fetchYear(inst, y, args.force)
        const seg = ((Date.now() - t0) / 1000).toFixed(1)
        if (res === 'skip') console.log(`  ${y}  ya estaba (usá --force para rebajarlo)`)
        else if (res === 'vacio') console.log(`  ${y}  sin datos`)
        else {
          const kb = (fs.statSync(parquetPath(inst.symbol, y)).size / 1024).toFixed(0)
          console.log(`  ${y}  ✔ ${kb} KB en ${seg}s`)
        }
      } catch (err) {
        // Un año que falla no debe tumbar el backfill entero: se anota y sigue.
        console.error(`  ${y}  ✖ ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }
  console.log('\nListo.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
