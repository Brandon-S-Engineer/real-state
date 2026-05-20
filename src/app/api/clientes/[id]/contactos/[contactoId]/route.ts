import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const TIPOS = ['LLAMADA', 'WHATSAPP', 'EMAIL', 'VISITA', 'EVENTO', 'NOTA', 'OTRO'] as const
const ESTADOS = ['PLANEADO', 'REALIZADO', 'OMITIDO'] as const

const patchSchema = z.object({
  tipo:            z.enum(TIPOS).optional(),
  estado:          z.enum(ESTADOS).optional(),
  fechaProgramada: z.string().optional(),
  realizadoAt:     z.string().nullish(),
  resumen:         z.string().nullish(),
  listingId:       z.string().nullish(),
})

type Params = { params: Promise<{ id: string; contactoId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id: clienteId, contactoId } = await params

  const contacto = await prisma.clienteContacto.findUnique({ where: { id: contactoId } })
  if (!contacto || contacto.clienteId !== clienteId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { fechaProgramada, realizadoAt, ...rest } = parsed.data

  // Si pasa a REALIZADO sin realizadoAt explícito → marcar con la fecha actual
  let resolvedRealizadoAt: Date | null | undefined = undefined
  if (realizadoAt !== undefined) {
    resolvedRealizadoAt = realizadoAt ? new Date(realizadoAt) : null
  } else if (parsed.data.estado === 'REALIZADO' && !contacto.realizadoAt) {
    resolvedRealizadoAt = new Date()
  }

  const updated = await prisma.clienteContacto.update({
    where: { id: contactoId },
    data: {
      ...rest,
      ...(fechaProgramada !== undefined ? { fechaProgramada: new Date(fechaProgramada) } : {}),
      ...(resolvedRealizadoAt !== undefined ? { realizadoAt: resolvedRealizadoAt } : {}),
    },
  })

  // Si terminó REALIZADO, actualizar ultimoContactoAt del cliente al máximo
  if (updated.estado === 'REALIZADO' && updated.realizadoAt) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (cliente && (!cliente.ultimoContactoAt || updated.realizadoAt > cliente.ultimoContactoAt)) {
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { ultimoContactoAt: updated.realizadoAt },
      })
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id: clienteId, contactoId } = await params

  const contacto = await prisma.clienteContacto.findUnique({ where: { id: contactoId } })
  if (!contacto || contacto.clienteId !== clienteId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.clienteContacto.delete({ where: { id: contactoId } })
  return NextResponse.json({ ok: true })
}
