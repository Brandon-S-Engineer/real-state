import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/require-admin'

const crearSchema = z.object({
  nombre: z.string().min(1).max(120),
  reglas: z.string().max(4000).default(''),
})

export async function GET() {
  const error = await requireAdmin()
  if (error) return error
  const setups = await prisma.tradeSetup.findMany({ orderBy: { nombre: 'asc' } })
  return NextResponse.json({ setups })
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

  // `nombre` es único: si ya existe se actualizan las reglas en vez de fallar.
  const setup = await prisma.tradeSetup.upsert({
    where: { nombre: parsed.data.nombre },
    create: parsed.data,
    update: { reglas: parsed.data.reglas },
  })
  return NextResponse.json(setup, { status: 201 })
}

export async function DELETE(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })
  // Las operaciones que lo usaban quedan con setupId = null (onDelete: SetNull),
  // no se borran: perder el historial por reorganizar la estrategia sería absurdo.
  await prisma.tradeSetup.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
