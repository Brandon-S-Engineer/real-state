import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  rarity: z.enum(['Basic', 'Fine', 'Masterwork', 'Rare', 'Exotic', 'Ascended', 'Legendary']).optional(),
  levelMin: z.number().int().min(0).max(80).optional(),
  levelMax: z.number().int().min(0).max(80).optional(),
  expectedValue: z.number().int().min(0).optional(),
  notes: z.string().max(300).nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  try {
    const updated = await prisma.salvageRate.update({ where: { id }, data: parsed.data })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    await prisma.salvageRate.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
