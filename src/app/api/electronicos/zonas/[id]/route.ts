import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { zoneSchema } from '@/lib/electronicos/schemas'
import { toZoneDTO } from '@/lib/electronicos/serialize'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = zoneSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const zone = await prisma.elecZone.update({ where: { id }, data: parsed.data })
  return NextResponse.json(toZoneDTO(zone))
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  await prisma.elecZone.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
