import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { sectionSchema } from '@/lib/electronicos/schemas'

type Params = { params: Promise<{ id: string }> }

// Renombrar mueve también sus búsquedas (se ligan por nombre)
export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = sectionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const current = await prisma.elecSearchSection.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { name } = parsed.data
  if (name !== current.name && await prisma.elecSearchSection.findUnique({ where: { name } })) {
    return NextResponse.json({ error: 'Ya existe' }, { status: 409 })
  }
  const [s] = await prisma.$transaction([
    prisma.elecSearchSection.update({ where: { id }, data: { name } }),
    prisma.elecSearch.updateMany({ where: { groupName: current.name }, data: { groupName: name } }),
  ])
  return NextResponse.json(s)
}

// Borrar la sección borra sus búsquedas
export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  const current = await prisma.elecSearchSection.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ ok: true })
  await prisma.$transaction([
    prisma.elecSearch.deleteMany({ where: { groupName: current.name } }),
    prisma.elecSearchSection.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
