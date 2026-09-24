import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { tradeSchema } from '@/lib/electronicos/schemas'
import { toTradeDTO } from '@/lib/electronicos/serialize'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = tradeSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const trade = await prisma.elecTrade.update({
    where: { id },
    data: parsed.data,
    include: { listing: { select: { title: true, url: true } } },
  })
  return NextResponse.json(toTradeDTO(trade))
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  await prisma.elecTrade.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
