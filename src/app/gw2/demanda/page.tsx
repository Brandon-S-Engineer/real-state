import { prisma } from '@/lib/db'
import MarketTableClient, { type MarketRow } from '@/components/gw2/market-table-client'
import { loadMarketRows } from '@/lib/gw2/load-market-rows'

export const dynamic = 'force-dynamic'

export default async function DemandaSubiendoPage() {
  const { rows, lastComputedAt, types } = await loadMarketRows(prisma, 'demandChangePct')
  return <MarketTableClient variant='demanda' initialRows={rows as MarketRow[]} lastComputedAt={lastComputedAt} types={types} />
}
