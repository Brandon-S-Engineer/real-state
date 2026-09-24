import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { tradeSchema } from '@/lib/electronicos/schemas'
import { toTradeDTO } from '@/lib/electronicos/serialize'


export async function GET() {
  const error = await requireAdmin()
  if (error) return error
  const trades = await prisma.elecTrade.findMany({
    include: { listing: { select: { title: true, url: true } } },
    orderBy: { buyDate: 'desc' },
  })
  return NextResponse.json({ data: trades.map(toTradeDTO) })
}

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = tradeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const trade = await prisma.elecTrade.create({
    data: parsed.data,
    include: { listing: { select: { title: true, url: true } } },
  })
  // Registrar la compra marca el listing como comprado
  if (trade.listingId) {
    await prisma.elecListing.update({ where: { id: trade.listingId }, data: { comprado: true, compradoAt: new Date() } }).catch(() => null)
  }
  return NextResponse.json(toTradeDTO(trade), { status: 201 })
}
