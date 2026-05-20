import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const TIPOS = ['LLAMADA', 'WHATSAPP', 'EMAIL', 'VISITA', 'EVENTO', 'NOTA', 'OTRO'] as const
const ESTADOS = ['PLANEADO', 'REALIZADO', 'OMITIDO'] as const

const createSchema = z.object({
  tipo:            z.enum(TIPOS),
  estado:          z.enum(ESTADOS).default('PLANEADO'),
  fechaProgramada: z.string(),   // ISO
  resumen:         z.string().nullish(),
  listingId:       z.string().nullish(),
  realizadoAt:     z.string().nullish(),  // si se crea ya como REALIZADO
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id: clienteId } = await params

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
  if (!cliente) return NextResponse.json({ error: 'Cliente not found' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { fechaProgramada, realizadoAt, ...rest } = parsed.data

  const contacto = await prisma.clienteContacto.create({
    data: {
      ...rest,
      clienteId,
      fechaProgramada: new Date(fechaProgramada),
      realizadoAt: realizadoAt ? new Date(realizadoAt) : null,
    },
  })

  // Si el contacto se crea ya REALIZADO, actualizar ultimoContactoAt del cliente
  if (parsed.data.estado === 'REALIZADO') {
    const realizadoTime = realizadoAt ? new Date(realizadoAt) : new Date(fechaProgramada)
    if (!cliente.ultimoContactoAt || realizadoTime > cliente.ultimoContactoAt) {
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { ultimoContactoAt: realizadoTime },
      })
    }
  }

  return NextResponse.json(contacto, { status: 201 })
}
