import { prisma } from '@/lib/db'
import ArmaduasClient from '@/components/gw2/armaduras-client'

export const dynamic = 'force-dynamic'

export default async function Gw2ArmaduasPage() {
  const opportunities = await prisma.gw2ArmorOpportunity.findMany({ orderBy: { gananciaBuyOrder: 'desc' } })
  const lastComputedAt = opportunities[0]?.computedAt ?? null

  const itemIds = Array.from(new Set(opportunities.flatMap((o) => [o.itemId, o.suffixItemId])))
  const items = itemIds.length ? await prisma.gw2Item.findMany({ where: { id: { in: itemIds } } }) : []
  const itemById = new Map(items.map((i) => [i.id, i]))

  const rows = opportunities.map((o) => {
    const base = itemById.get(o.itemId)
    const suffix = itemById.get(o.suffixItemId)
    return {
      itemId: o.itemId,
      itemName: base?.name ?? `#${o.itemId}`,
      itemIcon: base?.icon ?? null,
      itemType: o.itemType,
      itemLevel: base?.level ?? 0,
      suffixName: suffix?.name ?? `#${o.suffixItemId}`,
      suffixIcon: suffix?.icon ?? null,
      armorAsk: o.armorAsk,
      armorBid: o.armorBid,
      runaSellNeto: o.runaSellNeto,
      salvageNeto: o.salvageNeto,
      valorTotal: o.valorTotal,
      gananciaInstant: o.gananciaInstant,
      gananciaBuyOrder: o.gananciaBuyOrder,
      roiBuyOrder: o.roiBuyOrder,
      itemSupply: o.itemSupply,
      itemDemand: o.itemDemand,
      runaSupply: o.runaSupply,
    }
  })

  return <ArmaduasClient initialRows={rows} lastComputedAt={lastComputedAt?.toISOString() ?? null} />
}
