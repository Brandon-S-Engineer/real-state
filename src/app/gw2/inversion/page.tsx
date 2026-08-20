import { prisma } from '@/lib/db'
import { getCurrentPrices } from '@/lib/gw2/prices-cache'
import { ensureDailyHistoryFresh } from '@/lib/gw2/daily-history'
import { INVEST_ASSETS, investItemIds } from '@/content/gw2-investments'
import { WEEKLY_ITEMS, weeklyItemIds } from '@/content/gw2-weekly'
import { analyzeInvestment } from '@/lib/gw2/investment-analysis'
import { analyzeWeekly } from '@/lib/gw2/weekly-cycle'
import InversionClient, { type InvestRow, type WeeklyRow } from '@/components/gw2/inversion-client'

export const dynamic = 'force-dynamic'

export default async function InversionPage() {
  const investIds = investItemIds()
  const weeklyIds = weeklyItemIds()
  const ids = Array.from(new Set([...investIds, ...weeklyIds]))

  const [items, prices] = await Promise.all([
    prisma.gw2Item.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, icon: true } }),
    getCurrentPrices(ids),
  ])
  const itemById = new Map(items.map((i) => [i.id, i]))

  // Historial diario multi-año de cada activo (serve-cache: instantáneo si ya
  // está prewarmeado, refresca en segundo plano si está viejo).
  const dailyByItem = new Map<number, { date: Date; buyPriceAvg: number; sellPriceAvg: number }[]>()
  await Promise.all(
    ids.map(async (id) => {
      const rows = await ensureDailyHistoryFresh(id)
      dailyByItem.set(id, rows.map((r) => ({ date: r.date, buyPriceAvg: r.buyPriceAvg, sellPriceAvg: r.sellPriceAvg })))
    }),
  )

  const rows: InvestRow[] = INVEST_ASSETS.map((asset) => {
    const item = itemById.get(asset.id)
    const price = prices.get(asset.id)
    const currentAsk = price?.sellPrice ?? 0
    const currentBid = price?.buyPrice ?? 0
    const daily = dailyByItem.get(asset.id) ?? []
    const stat = analyzeInvestment(daily, currentAsk)
    return {
      itemId: asset.id,
      name: item?.name ?? `#${asset.id}`,
      icon: item?.icon ?? null,
      category: asset.category,
      thesis: asset.thesis,
      currentAsk,
      currentBid,
      stat,
    }
  })

  // Rankear: señal de compra primero, luego por mayor dip (mejor entrada).
  const rank = (r: InvestRow) => (!r.stat ? 3 : r.stat.signal === 'comprar' ? 0 : r.stat.signal === 'esperar' ? 1 : 2)
  rows.sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b)
    return (b.stat?.drawdown ?? 0) - (a.stat?.drawdown ?? 0)
  })

  // ── Ciclo semanal: qué día conviene comprar cada ítem abusable ──
  const weekly: WeeklyRow[] = WEEKLY_ITEMS.map((w) => {
    const item = itemById.get(w.id)
    const price = prices.get(w.id)
    const stat = analyzeWeekly(dailyByItem.get(w.id) ?? [])
    return {
      itemId: w.id,
      name: item?.name ?? `#${w.id}`,
      icon: item?.icon ?? null,
      note: w.note,
      currentBid: price?.buyPrice ?? 0,
      stat,
    }
  })
  // Más abusable primero: mayor spread, pero solo cuenta si es consistente.
  const weeklyScore = (r: WeeklyRow) => (r.stat ? r.stat.spreadPct * r.stat.consistency : -1)
  weekly.sort((a, b) => weeklyScore(b) - weeklyScore(a))

  return <InversionClient rows={rows} weekly={weekly} />
}
