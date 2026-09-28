import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import FinanzasClient from '@/components/dashboard/finanzas/finanzas-client'
import { getFinanceSettings, toEntryDTO } from '@/lib/finanzas/server'
import type { TradeLite } from '@/lib/finanzas/shared'

export default async function FinanzasPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [entries, trades, settings] = await Promise.all([
    prisma.financeEntry.findMany({ orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    prisma.elecTrade.findMany({ select: { buyDate: true, sellDate: true, buyPrice: true, sellPrice: true, costs: true } }),
    getFinanceSettings(),
  ])

  const tradeLite: TradeLite[] = trades.map((t) => ({
    buyDate: t.buyDate.toISOString().slice(0, 10),
    sellDate: t.sellDate?.toISOString().slice(0, 10) ?? null,
    profit: t.sellPrice != null ? t.sellPrice - t.buyPrice - t.costs : null,
    invested: t.buyPrice + t.costs,
  }))

  return <FinanzasClient entries={entries.map(toEntryDTO)} trades={tradeLite} monthlyGoal={settings.monthlyGoal} />
}
