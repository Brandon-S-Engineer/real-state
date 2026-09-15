import type { PrismaClient } from '@prisma/client'

// Carga las oportunidades de mercado + join con Gw2Item para nombre/icono/tipo,
// y la lista de tipos distintos presentes (para el filtro de la UI). Compartido
// entre Grandes Spreads y Demanda Subiendo.
export async function loadMarketRows(prisma: PrismaClient, orderBy: 'oroPotencialDiario' | 'demandChangePct') {
  const opportunities = await prisma.gw2MarketOpportunity.findMany({ orderBy: { [orderBy]: 'desc' } })
  const lastComputedAt = opportunities[0]?.computedAt ?? null

  const itemIds = opportunities.map((o) => o.itemId)
  const items = itemIds.length ? await prisma.gw2Item.findMany({ where: { id: { in: itemIds } } }) : []
  const itemById = new Map(items.map((i) => [i.id, i]))

  const rows = opportunities.map((o) => {
    const item = itemById.get(o.itemId)
    return {
      itemId: o.itemId,
      name: item?.name ?? `#${o.itemId}`,
      icon: item?.icon ?? null,
      rarity: item?.rarity ?? '',
      type: item?.type ?? '',
      bid: o.bid,
      ask: o.ask,
      spread: o.spread,
      spreadPct: o.spreadPct,
      supply: o.supply,
      demand: o.demand,
      soldDiario: o.soldDiario,
      boughtDiario: o.boughtDiario,
      flujoDiario: o.flujoDiario,
      diasParaVender: o.diasParaVender,
      profitFlip: o.profitFlip,
      roiFlip: o.roiFlip,
      oroPotencialDiario: o.oroPotencialDiario,
      demandChangePct: o.demandChangePct,
      priceChangePct: o.priceChangePct,
    }
  })

  const types = Array.from(new Set(rows.map((r) => r.type).filter(Boolean))).sort()

  return { rows, lastComputedAt: lastComputedAt?.toISOString() ?? null, types }
}
