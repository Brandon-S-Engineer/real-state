import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { demoSchema, publishBlockers } from '@/lib/demos/shared'
import { DEMOS_TAG, refreshDemand, toDemoDTO } from '@/lib/demos/server'

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = demoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data
  if (d.status === 'PUBLISHED') {
    const blockers = publishBlockers(d)
    if (blockers.length) return NextResponse.json({ error: 'No se puede publicar todavía', blockers }, { status: 422 })
  }
  const taken = await prisma.demo.findUnique({ where: { slug: d.slug } })
  if (taken) return NextResponse.json({ error: 'Ese slug ya existe' }, { status: 409 })
  const demo = await prisma.demo.create({
    data: { ...d, publishedAt: d.status === 'PUBLISHED' ? new Date() : null },
  })
  await refreshDemand()
  revalidateTag(DEMOS_TAG)
  const full = await prisma.demo.findUniqueOrThrow({ where: { id: demo.id }, include: { uses: true, demand: true } })
  return NextResponse.json(toDemoDTO(full), { status: 201 })
}
