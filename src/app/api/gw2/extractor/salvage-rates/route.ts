import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  rarity: z.enum(['Basic', 'Fine', 'Masterwork', 'Rare', 'Exotic', 'Ascended', 'Legendary']),
  levelMin: z.number().int().min(0).max(80),
  levelMax: z.number().int().min(0).max(80),
  expectedValue: z.number().int().min(0),
  notes: z.string().max(300).optional(),
})

export async function GET() {
  const rates = await prisma.salvageRate.findMany({ orderBy: [{ rarity: 'asc' }, { levelMin: 'asc' }] })
  return NextResponse.json(rates)
}

export async function POST(req: Request) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  if (parsed.data.levelMin > parsed.data.levelMax) return NextResponse.json({ error: 'levelMin no puede ser mayor a levelMax' }, { status: 400 })

  const rate = await prisma.salvageRate.create({ data: parsed.data })
  return NextResponse.json(rate, { status: 201 })
}
