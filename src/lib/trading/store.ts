// ── Almacén local de velas (DuckDB sobre Parquet) ───────────────────────────
//
// Las velas NO van a Neon. Años de M1 de 20 instrumentos son ~1-2 GB, y la base
// tiene un techo duro de 512 MB que ya reventamos una vez con el historial de
// GW2. Así que el dato pesado vive en disco, en `data/trading/bars/`, y DuckDB
// lo consulta in-process leyendo Parquet directo.
//
// Reparto deliberado:
//   - Disco (Parquet + DuckDB) → velas OHLCV. Pesadas, de solo lectura, analíticas.
//   - Neon (Prisma)            → diario, setups, backtests. Chico y relacional.
//
// Consecuencia asumida: lo que lee velas anda en localhost, no en Vercel. Fue la
// decisión explícita del usuario a cambio de tener M1 de años.
//
// Los precios se guardan como DOUBLE, no como entero escalado: Dukascopy entrega
// doubles y fijar mal los decimales de un instrumento perdería precisión en
// silencio. Parquet los comprime igual de bien. Los enteros escalados se
// reservan para el diario, donde los valores los controlamos nosotros.

import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api'
import path from 'node:path'
import fs from 'node:fs'

export const DATA_DIR = path.join(process.cwd(), 'data', 'trading')
export const BARS_DIR = path.join(DATA_DIR, 'bars')
export const CACHE_DIR = path.join(DATA_DIR, '.cache')

/** Ruta del Parquet de un símbolo/año. M1 es la única fuente de verdad. */
export function parquetPath(symbol: string, year: number): string {
  return path.join(BARS_DIR, symbol.toUpperCase(), 'm1', `${year}.parquet`)
}

/** Glob de todos los años de un símbolo, o null si todavía no hay nada bajado. */
export function parquetGlob(symbol: string): string | null {
  const dir = path.join(BARS_DIR, symbol.toUpperCase(), 'm1')
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.parquet'))
  if (files.length === 0) return null
  return path.join(dir, '*.parquet')
}

/** Años ya descargados de un símbolo (para que el backfill sepa qué saltear). */
export function yearsOnDisk(symbol: string): number[] {
  const dir = path.join(BARS_DIR, symbol.toUpperCase(), 'm1')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.parquet'))
    .map((f) => Number(f.replace('.parquet', '')))
    .filter((y) => Number.isInteger(y))
    .sort((a, b) => a - b)
}

// Singleton — mismo patrón que src/lib/db.ts, para sobrevivir al hot-reload de
// Next en desarrollo sin abrir una instancia nueva en cada recarga.
const globalForDuck = globalThis as unknown as { duckConn?: Promise<DuckDBConnection> }

async function createConnection(): Promise<DuckDBConnection> {
  fs.mkdirSync(BARS_DIR, { recursive: true })
  const instance = await DuckDBInstance.create(':memory:') // el estado vive en los Parquet, no en la DB
  return instance.connect()
}

export function getConnection(): Promise<DuckDBConnection> {
  if (!globalForDuck.duckConn) globalForDuck.duckConn = createConnection()
  return globalForDuck.duckConn
}

/**
 * DuckDB devuelve BigInt para enteros y `{ micros }` para timestamps. Esto lo
 * normaliza a tipos que React puede serializar sin romperse.
 */
function normalize(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object' && 'micros' in (value as Record<string, unknown>)) {
    return Number((value as { micros: bigint }).micros) / 1000 // → epoch ms
  }
  return value
}

/** Ejecuta SQL y devuelve filas ya normalizadas. */
export async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const conn = await getConnection()
  const reader = await conn.runAndReadAll(sql)
  return reader.getRowObjects().map((row) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) out[k] = normalize(v)
    return out as T
  })
}

/**
 * Escapa un literal de texto para interpolarlo en SQL. DuckDB-node no expone
 * binding de parámetros para rutas dentro de `read_parquet()`, y las rutas se
 * arman a partir de símbolos que ya validamos contra la watchlist — aun así se
 * escapa, para que un símbolo con comilla no pueda romper la consulta.
 */
export function sqlString(v: string): string {
  return `'${v.replace(/'/g, "''")}'`
}
