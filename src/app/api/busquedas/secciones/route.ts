import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { sectionSchema } from '@/lib/electronicos/schemas'

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = sectionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const exists = await prisma.elecSearchSection.findUnique({ where: { name: parsed.data.name } })
  if (exists) return NextResponse.json({ error: 'Ya existe' }, { status: 409 })
  const last = await prisma.elecSearchSection.aggregate({ _max: { position: true } })
  const s = await prisma.elecSearchSection.create({ data: { name: parsed.data.name, position: (last._max.position ?? -1) + 1 } })
  return NextResponse.json(s, { status: 201 })
}
