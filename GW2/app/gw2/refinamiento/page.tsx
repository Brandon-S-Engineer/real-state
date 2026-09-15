import { prisma } from '@/lib/db'
import RefinamientoClient, { type RefRow } from '@/components/gw2/refinamiento-client'

export const dynamic = 'force-dynamic'

export default async function RefinamientoPage() {
  const ops = await prisma.gw2RefinementOpportunity.findMany({ orderBy: { oroPotencialDiario: 'desc' } })
  const lastComputedAt = ops[0]?.computedAt ?? null

  const items = ops.length ? await prisma.gw2Item.findMany({ where: { id: { in: ops.map((o) => o.outputItemId) } } }) : []
  const itemById = new Map(items.map((i) => [i.id, i]))

  const rows: RefRow[] = ops.map((o) => {
    const item = itemById.get(o.outputItemId)
    return {
      outputItemId: o.outputItemId,
      name: item?.name ?? `#${o.outputItemId}`,
      icon: item?.icon ?? null,
      family: o.family,
      costoBuyOrder: o.costoBuyOrder,
      ingresoListado: o.ingresoListado,
      gananciaBuyOrder: o.gananciaBuyOrder,
      roiBuyOrder: o.roiBuyOrder,
      gananciaInstant: o.gananciaInstant,
      refinedSoldDiario: o.refinedSoldDiario,
      oroPotencialDiario: o.oroPotencialDiario,
    }
  })

  return <RefinamientoClient initialRows={rows} lastComputedAt={lastComputedAt?.toISOString() ?? null} />
}
