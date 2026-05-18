import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
  name:               z.string().min(1).max(120).optional(),
  searchUrl:          z.string().url().optional(),
  locationKeywords:   z.array(z.string().min(1)).optional(),
  desarrolloKeywords: z.array(z.string().min(1)).optional(),
  active:             z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.zone.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const zona = await prisma.zone.update({ where: { id }, data: parsed.data })
  return NextResponse.json(zona)
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params

  const existing = await prisma.zone.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.zone.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
