import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { demoSchema, publishBlockers } from '@/lib/demos/shared'
import { DEMOS_TAG, refreshDemand, toDemoDTO } from '@/lib/demos/server'

type Params = { params: Promise<{ id: string }> }

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = demoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data

  const current = await prisma.demo.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (d.status === 'PUBLISHED') {
    const blockers = publishBlockers(d)
    if (blockers.length) return NextResponse.json({ error: 'No se puede publicar todavía', blockers }, { status: 422 })
  }
  if (d.slug !== current.slug && (await prisma.demo.findUnique({ where: { slug: d.slug } }))) {
    return NextResponse.json({ error: 'Ese slug ya existe' }, { status: 409 })
  }

  // Si cambia el patrón, su historial de demanda ya no es comparable: se reinicia.
  const patternChanged = !sameList(d.matchKeywords, current.matchKeywords) || !sameList(d.excludeKeywords, current.excludeKeywords)
  if (patternChanged) await prisma.demoDemandWeek.deleteMany({ where: { demoId: id } })

  await prisma.demo.update({
    where: { id },
    data: {
      ...d,
      publishedAt: d.status === 'PUBLISHED' ? (current.publishedAt ?? new Date()) : current.publishedAt,
    },
  })
  if (patternChanged) await refreshDemand()
  revalidateTag(DEMOS_TAG)
  const full = await prisma.demo.findUniqueOrThrow({ where: { id }, include: { uses: { orderBy: { sentAt: 'desc' } }, demand: true } })
  return NextResponse.json(toDemoDTO(full))
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  await prisma.demo.delete({ where: { id } }).catch(() => null)
  revalidateTag(DEMOS_TAG)
  return NextResponse.json({ ok: true })
}
