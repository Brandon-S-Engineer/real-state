import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ETAPAS = ['A', 'B', 'C', 'D'] as const
const TYPES = ['COMPRADOR', 'VENDEDOR', 'AMBOS', 'PASADO'] as const
const FUENTES = ['REFERIDO', 'FACEBOOK', 'INMUEBLES24', 'LLAMADA', 'EVENTO', 'SOI', 'OTRO'] as const

const patchSchema = z.object({
  nombre:             z.string().min(1).max(200).optional(),
  telefono:           z.string().max(40).nullish(),
  telefonoVerificado: z.boolean().optional(),
  email:              z.string().email().nullish(),
  emailVerificado:    z.boolean().optional(),
  type:               z.enum(TYPES).optional(),
  etapa:              z.enum(ETAPAS).optional(),
  fuente:             z.enum(FUENTES).optional(),
  motivacion:         z.string().nullish(),
  timeline:           z.string().nullish(),
  presupuestoMin:     z.number().nullish(),
  presupuestoMax:     z.number().nullish(),
  referredById:       z.string().nullish(),
  referredByName:     z.string().nullish(),
  spouseName:         z.string().nullish(),
  spousePhone:        z.string().nullish(),
  birthday:           z.string().nullish(),
  notasPerma:         z.string().nullish(),
  proximoContactoAt:  z.string().nullish(),
  tags:               z.array(z.string()).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      contactos: { orderBy: { fechaProgramada: 'desc' } },
      referredBy: { select: { id: true, nombre: true } },
    },
  })
  if (!cliente) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(cliente)
}

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.cliente.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { birthday, proximoContactoAt, ...rest } = parsed.data

  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      ...rest,
      ...(birthday !== undefined ? { birthday: birthday ? new Date(birthday) : null } : {}),
      ...(proximoContactoAt !== undefined
        ? { proximoContactoAt: proximoContactoAt ? new Date(proximoContactoAt) : null }
        : {}),
    },
  })

  return NextResponse.json(cliente)
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params

  const existing = await prisma.cliente.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.cliente.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
