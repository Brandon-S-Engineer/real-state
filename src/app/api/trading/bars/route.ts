import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBars } from '@/lib/trading/bars'
import { TIMEFRAMES, getInstrumento } from '@/content/trading-instruments'

// Lee del almacén LOCAL de Parquet, así que solo funciona corriendo en la
// máquina donde están los datos (localhost). Es la decisión de arquitectura de
// la sección: a cambio se tienen años de M1 sin el techo de 512 MB de Neon.

const querySchema = z.object({
  symbol: z.string().min(1),
  tf: z.enum(TIMEFRAMES).default('h1'),
  from: z.coerce.number().int().optional(),
  to: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(10).max(200_000).default(1500),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { symbol, tf, from, to, limit } = parsed.data
  // Validar contra la watchlist antes de tocar el disco: el símbolo se
  // interpola en la ruta del Parquet.
  const inst = getInstrumento(symbol)
  if (!inst) return NextResponse.json({ error: `Instrumento desconocido: ${symbol}` }, { status: 404 })

  try {
    const res = await getBars({ symbol: inst.symbol, timeframe: tf, from, to, limit })
    return NextResponse.json(res)
  } catch (err) {
    console.error('trading/bars:', err)
    return NextResponse.json({ error: 'No se pudieron leer las velas' }, { status: 500 })
  }
}
