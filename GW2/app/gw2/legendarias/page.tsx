import { prisma } from '@/lib/db'
import LegendariasClient, { type LegRow } from '@/components/gw2/legendarias-client'

export const dynamic = 'force-dynamic'

export default async function LegendariasPage() {
  const ops = await prisma.gw2LegendaryOpportunity.findMany({ orderBy: { oroPotencialDiario: 'desc' } })
  const lastComputedAt = ops[0]?.computedAt ?? null

  const items = ops.length ? await prisma.gw2Item.findMany({ where: { id: { in: ops.map((o) => o.itemId) } } }) : []
  const itemById = new Map(items.map((i) => [i.id, i]))

  const rows: LegRow[] = ops.map((o) => {
    const item = itemById.get(o.itemId)
    return {
      itemId: o.itemId,
      name: item?.name ?? `#${o.itemId}`,
      icon: item?.icon ?? null,
      bid: o.bid,
      ask: o.ask,
      spreadPct: o.spreadPct,
      supply: o.supply,
      demand: o.demand,
      soldSemana: o.soldSemana,
      boughtSemana: o.boughtSemana,
      profitFlip: o.profitFlip,
      roiFlip: o.roiFlip,
      diasParaVender: o.diasParaVender,
      oroPotencialDiario: o.oroPotencialDiario,
      phantomRatio: o.phantomRatio,
      viable: o.viable,
    }
  })

  return <LegendariasClient initialRows={rows} lastComputedAt={lastComputedAt?.toISOString() ?? null} />
}
