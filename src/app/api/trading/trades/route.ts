import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/require-admin'
import { TIMEFRAMES, getInstrumento } from '@/content/trading-instruments'

// A diferencia de /api/gw2/*, que es público a propósito (datos de economía de
// un juego), esto son operaciones reales con dinero: va autenticado.

const MODES = ['live', 'replay', 'backtest'] as const
const DIRECCIONES = ['long', 'short'] as const

const crearSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.enum(TIMEFRAMES),
  mode: z.enum(MODES).default('live'),
  direccion: z.enum(DIRECCIONES),
  plannedEntry: z.number().positive(),
  plannedStop: z.number().positive(),
  plannedTarget: z.number().positive().nullish(),
  riskPct: z.number().min(0).max(100).nullish(),
  entryAt: z.coerce.date(),
  entryPrice: z.number().positive(),
  exitAt: z.coerce.date().nullish(),
  exitPrice: z.number().positive().nullish(),
  sizeUnits: z.number().positive().nullish(),
  fees: z.number().min(0).default(0),
  setupId: z.string().nullish(),
  notas: z.string().max(4000).nullish(),
})

/**
 * Coherencia del plan: en un largo el stop va DEBAJO de la entrada y en un corto
 * ENCIMA. Al revés no es una operación, es un error de carga — y si se colara,
 * el riesgo saldría con signo invertido y contaminaría todas las estadísticas.
 */
function validarPlan(d: { direccion: string; plannedEntry: number; plannedStop: number; plannedTarget?: number | null }): string | null {
  const largo = d.direccion === 'long'
  if (largo && d.plannedStop >= d.plannedEntry) return 'En un largo el stop tiene que estar por debajo de la entrada'
  if (!largo && d.plannedStop <= d.plannedEntry) return 'En un corto el stop tiene que estar por encima de la entrada'
  if (d.plannedTarget != null) {
    if (largo && d.plannedTarget <= d.plannedEntry) return 'En un largo el objetivo tiene que estar por encima de la entrada'
    if (!largo && d.plannedTarget >= d.plannedEntry) return 'En un corto el objetivo tiene que estar por debajo de la entrada'
  }
  return null
}

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')
  const symbol = searchParams.get('symbol')

  const trades = await prisma.trade.findMany({
    where: {
      ...(mode && mode !== 'all' ? { mode } : {}),
      ...(symbol ? { symbol } : {}),
    },
    include: { setup: { select: { id: true, nombre: true } } },
    orderBy: { entryAt: 'desc' },
    take: 2000,
  })
  return NextResponse.json({ trades })
}

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = crearSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data

  if (!getInstrumento(d.symbol)) return NextResponse.json({ error: `Instrumento desconocido: ${d.symbol}` }, { status: 400 })

  const problema = validarPlan(d)
  if (problema) return NextResponse.json({ error: problema }, { status: 400 })

  // Cerrar una operación exige las dos cosas: sin ambas no se puede calcular R.
  if ((d.exitAt && d.exitPrice == null) || (d.exitPrice != null && !d.exitAt))
    return NextResponse.json({ error: 'Para cerrar hacen falta fecha Y precio de salida' }, { status: 400 })

  const trade = await prisma.trade.create({
    data: {
      symbol: getInstrumento(d.symbol)!.symbol,
      timeframe: d.timeframe,
      mode: d.mode,
      direccion: d.direccion,
      plannedEntry: d.plannedEntry,
      plannedStop: d.plannedStop,
      plannedTarget: d.plannedTarget ?? null,
      riskPct: d.riskPct ?? null,
      entryAt: d.entryAt,
      entryPrice: d.entryPrice,
      exitAt: d.exitAt ?? null,
      exitPrice: d.exitPrice ?? null,
      sizeUnits: d.sizeUnits ?? null,
      fees: d.fees,
      setupId: d.setupId || null,
      notas: d.notas ?? null,
    },
  })
  return NextResponse.json(trade, { status: 201 })
}

const actualizarSchema = crearSchema.partial().extend({ id: z.string().min(1) })

export async function PATCH(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = actualizarSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { id, ...cambios } = parsed.data

  const actual = await prisma.trade.findUnique({ where: { id } })
  if (!actual) return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })

  // Se valida el plan RESULTANTE, no solo lo que vino en el parche.
  const problema = validarPlan({
    direccion: cambios.direccion ?? actual.direccion,
    plannedEntry: cambios.plannedEntry ?? actual.plannedEntry,
    plannedStop: cambios.plannedStop ?? actual.plannedStop,
    plannedTarget: cambios.plannedTarget !== undefined ? cambios.plannedTarget : actual.plannedTarget,
  })
  if (problema) return NextResponse.json({ error: problema }, { status: 400 })

  const trade = await prisma.trade.update({
    where: { id },
    data: {
      ...cambios,
      ...(cambios.symbol ? { symbol: getInstrumento(cambios.symbol)?.symbol ?? cambios.symbol } : {}),
      setupId: cambios.setupId !== undefined ? cambios.setupId || null : undefined,
    },
  })
  return NextResponse.json(trade)
}

export async function DELETE(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  await prisma.trade.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
