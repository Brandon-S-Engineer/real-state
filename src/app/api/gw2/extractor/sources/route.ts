import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  sourceItemId: z.number().int(),
  upgradeItemId: z.number().int(),
  notes: z.string().max(500).optional(),
})

async function withItems<T extends { sourceItemId: number; upgradeItemId: number }>(rows: T[]) {
  const itemIds = Array.from(new Set(rows.flatMap((r) => [r.sourceItemId, r.upgradeItemId])))
  const items = await prisma.gw2Item.findMany({ where: { id: { in: itemIds } } })
  const itemById = new Map(items.map((i) => [i.id, i]))
  return rows.map((r) => ({ ...r, sourceItem: itemById.get(r.sourceItemId) ?? null, upgradeItem: itemById.get(r.upgradeItemId) ?? null }))
}

export async function GET() {
  const sources = await prisma.extractorSourceItem.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(await withItems(sources))
}

export async function POST(req: Request) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const [sourceItem, upgradeItem] = await Promise.all([
    prisma.gw2Item.findUnique({ where: { id: parsed.data.sourceItemId } }),
    prisma.gw2Item.findUnique({ where: { id: parsed.data.upgradeItemId } }),
  ])
  if (!sourceItem || !upgradeItem) return NextResponse.json({ error: 'Ítem no encontrado en el cache' }, { status: 400 })

  try {
    const created = await prisma.extractorSourceItem.create({ data: parsed.data })
    return NextResponse.json({ ...created, sourceItem, upgradeItem }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Ya existe esa combinación arma/upgrade' }, { status: 409 })
  }
}
