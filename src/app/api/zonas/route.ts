import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  name:               z.string().min(1).max(120),
  searchUrl:          z.string().url(),
  locationKeywords:   z.array(z.string().min(1)).default([]),
  desarrolloKeywords: z.array(z.string().min(1)).default([]),
  active:             z.boolean().default(true),
})

export async function GET() {
  const error = await requireAdmin()
  if (error) return error

  const zonas = await prisma.zone.findMany({
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(zonas)
}

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const exists = await prisma.zone.findUnique({ where: { name: parsed.data.name } })
  if (exists) return NextResponse.json({ error: 'Ya existe una zona con ese nombre' }, { status: 409 })

  const zona = await prisma.zone.create({ data: parsed.data })
  return NextResponse.json(zona, { status: 201 })
}
