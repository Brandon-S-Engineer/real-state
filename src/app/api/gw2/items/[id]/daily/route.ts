import { NextResponse } from 'next/server'
import { ensureDailyHistoryFresh } from '@/lib/gw2/daily-history'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const itemId = Number(id)
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const rows = await ensureDailyHistoryFresh(itemId)
  return NextResponse.json({
    daily: rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      sold: r.sold,
      bought: r.bought,
      sellPriceAvg: r.sellPriceAvg,
      buyPriceAvg: r.buyPriceAvg,
      supply: r.sellQuantityAvg,
      demand: r.buyQuantityAvg,
    })),
  })
}
