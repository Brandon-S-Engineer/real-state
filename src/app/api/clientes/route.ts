import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ETAPAS = ['A', 'B', 'C', 'D'] as const
const TYPES = ['COMPRADOR', 'VENDEDOR', 'AMBOS', 'PASADO'] as const
const FUENTES = ['REFERIDO', 'FACEBOOK', 'INMUEBLES24', 'LLAMADA', 'EVENTO', 'SOI', 'OTRO'] as const

const createSchema = z.object({
  nombre:           z.string().min(1).max(200),
  telefono:         z.string().max(40).nullish(),
  email:            z.string().email().nullish(),
  type:             z.enum(TYPES).default('COMPRADOR'),
  etapa:            z.enum(ETAPAS).default('C'),
  fuente:           z.enum(FUENTES).default('OTRO'),
  motivacion:       z.string().nullish(),
  timeline:         z.string().nullish(),
  presupuestoMin:   z.number().nullish(),
  presupuestoMax:   z.number().nullish(),
  referredById:     z.string().nullish(),
  referredByName:   z.string().nullish(),
  spouseName:       z.string().nullish(),
  spousePhone:      z.string().nullish(),
  birthday:         z.string().nullish(),    // ISO date
  notasPerma:       z.string().nullish(),
  tags:             z.array(z.string()).default([]),
})

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const url = new URL(req.url)
  const etapa = url.searchParams.get('etapa')
  const type = url.searchParams.get('type')
  const fuente = url.searchParams.get('fuente')
  const search = url.searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (etapa && ETAPAS.includes(etapa as typeof ETAPAS[number])) where.etapa = etapa
  if (type && TYPES.includes(type as typeof TYPES[number])) where.type = type
  if (fuente && FUENTES.includes(fuente as typeof FUENTES[number])) where.fuente = fuente
  if (search) {
    where.OR = [
      { nombre:   { contains: search, mode: 'insensitive' } },
      { telefono: { contains: search } },
      { email:    { contains: search, mode: 'insensitive' } },
    ]
  }

  const clientes = await prisma.cliente.findMany({
    where,
    orderBy: [{ etapa: 'asc' }, { ultimoContactoAt: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(clientes)
}

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { birthday, ...rest } = parsed.data
  const cliente = await prisma.cliente.create({
    data: {
      ...rest,
      birthday: birthday ? new Date(birthday) : null,
    },
  })

  return NextResponse.json(cliente, { status: 201 })
}
