import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { TOQUES_90D, fechasPlan90Dias, generarTipoPlan } from '@/lib/crm'

type Params = { params: Promise<{ id: string }> }

/**
 * Genera N toques planeados a 90 días según la etapa del cliente.
 * Si el cliente ya tiene toques PLANEADOS futuros, retorna 409 — se debe
 * borrar manualmente o pasar ?force=1 para reemplazarlos.
 */
export async function POST(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id: clienteId } = await params
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
  if (!cliente) return NextResponse.json({ error: 'Cliente not found' }, { status: 404 })

  const existentesPlaneados = await prisma.clienteContacto.count({
    where: { clienteId, estado: 'PLANEADO', fechaProgramada: { gte: new Date() } },
  })

  if (existentesPlaneados > 0 && !force) {
    return NextResponse.json(
      { error: 'El cliente ya tiene toques planeados futuros', existentes: existentesPlaneados },
      { status: 409 },
    )
  }

  // Si es force, borrar los planeados futuros antes de regenerar
  if (force) {
    await prisma.clienteContacto.deleteMany({
      where: { clienteId, estado: 'PLANEADO', fechaProgramada: { gte: new Date() } },
    })
  }

  const numToques = TOQUES_90D[cliente.etapa]
  const fechas = fechasPlan90Dias(numToques)

  const data = fechas.map((fecha, i) => ({
    clienteId,
    tipo: generarTipoPlan(i),
    estado: 'PLANEADO' as const,
    fechaProgramada: fecha,
    resumen: `Toque #${i + 1} de ${numToques}`,
  }))

  await prisma.clienteContacto.createMany({ data })

  // Actualizar proximoContactoAt del cliente al primero del plan
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { proximoContactoAt: fechas[0] ?? null },
  })

  return NextResponse.json({ created: data.length, fechas }, { status: 201 })
}
