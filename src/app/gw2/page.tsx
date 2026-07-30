import { prisma } from '@/lib/db'
import MarketTableClient, { type MarketRow } from '@/components/gw2/market-table-client'
import { loadMarketRows } from '@/lib/gw2/load-market-rows'

export const dynamic = 'force-dynamic'

export default async function GrandesSpreadsPage() {
  const { rows, lastComputedAt, types } = await loadMarketRows(prisma, 'oroPotencialDiario')
  return <MarketTableClient variant='spreads' initialRows={rows as MarketRow[]} lastComputedAt={lastComputedAt} types={types} />
}
