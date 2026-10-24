import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authCheckUpdateSchema } from '@/lib/electronicos/schemas'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = authCheckUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { how, ...rest } = parsed.data
  const c = await prisma.authCheck.update({ where: { id }, data: { ...rest, ...(how !== undefined && { how: how || null }) } }).catch(() => null)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(c)
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  await prisma.authCheck.deleteMany({ where: { id } })
  return NextResponse.json({ ok: true })
}
