import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authCheckCreateSchema } from '@/lib/electronicos/schemas'

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') ?? undefined
  const product = url.searchParams.get('product') ?? undefined
  const checks = await prisma.authCheck.findMany({
    where: { mode, product },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(checks)
}

// Agrega uno o varios al final de la lista
export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = authCheckCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { mode, product, items } = parsed.data
  const last = await prisma.authCheck.aggregate({ where: { mode, product }, _max: { position: true } })
  const start = (last._max.position ?? -1) + 1
  const created = await prisma.$transaction(items.map((it, i) => prisma.authCheck.create({
    data: { mode, product, label: it.label, how: it.how || null, stop: it.stop ?? false, position: start + i },
  })))
  return NextResponse.json(created, { status: 201 })
}
