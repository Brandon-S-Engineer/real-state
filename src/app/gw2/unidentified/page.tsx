import { prisma } from '@/lib/db'
import { getPricesByIds } from '@/lib/gw2/client'
import { UNID, unidItemIds, SIGIL_BONUS_STEPS } from '@/content/gw2-unidentified'
import UnidentifiedClient, { type UnidView, type MatRow } from '@/components/gw2/unidentified-client'

export const dynamic = 'force-dynamic'

export default async function UnidentifiedPage() {
  const ids = unidItemIds()
  // Precios EN VIVO en cada carga (solo ~18 ítems = 1 request a la API oficial),
  // para que al recargar siempre veas precios frescos sin depender del snapshot.
  const [items, priceList] = await Promise.all([
    prisma.gw2Item.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, icon: true } }),
    getPricesByIds(ids),
  ])
  const itemById = new Map(items.map((i) => [i.id, i]))
  const priceById = new Map(priceList.map((p) => [p.id, p]))
  const askOf = (id: number) => priceById.get(id)?.sells?.unit_price ?? 0
  const bidOf = (id: number) => priceById.get(id)?.buys?.unit_price ?? 0
  const net = (v: number) => v * (1 - UNID.tpCut)

  const mkRow = (id: number, qty: number): MatRow => {
    const item = itemById.get(id)
    const ask = askOf(id)
    return { id, name: item?.name ?? `#${id}`, icon: item?.icon ?? null, qty, sellUnitNet: Math.round(net(ask)), subtotalNet: Math.round(qty * net(ask)) }
  }

  const materialRows = UNID.materials.map((m) => mkRow(m.id, m.qtyPerStack))

  // Ecto vs Dust — el corazón de la corrección.
  const ectos = UNID.stackSize * UNID.ectoYieldFactor // 222.75
  const dustQty = ectos * UNID.ectoToDust // ~412
  const dustRow = mkRow(UNID.dustItemId, dustQty)
  const ectoRow = mkRow(UNID.ectoItemId, ectos)

  const salvageCost = Math.round(UNID.stackSize * UNID.silverFedCostPerSalvageCopper)
  const materialsSubtotal = materialRows.reduce((s, r) => s + r.subtotalNet, 0)

  const incomeDust = materialsSubtotal + dustRow.subtotalNet - salvageCost
  const incomeEcto = materialsSubtotal + ectoRow.subtotalNet - salvageCost

  const gearBid = bidOf(UNID.rareGearItemId)
  const gearAsk = askOf(UNID.rareGearItemId)
  const gearCostBuyOrder = Math.round(gearBid * UNID.stackSize)
  const gearCostInstant = Math.round(gearAsk * UNID.stackSize)

  const sigilBonus = SIGIL_BONUS_STEPS.map((q) => ({ qty: q, bonus: Math.round((q / UNID.stackSize) * UNID.sigilBonusPerStackCopper) }))

  const view: UnidView = {
    stackSize: UNID.stackSize,
    materialRows,
    dustRow,
    ectoRow,
    ectos: Math.round(ectos * 100) / 100,
    salvageCost,
    materialsSubtotal,
    incomeDust,
    incomeEcto,
    gearCostBuyOrder,
    gearCostInstant,
    profitDust: incomeDust - gearCostBuyOrder,
    profitEcto: incomeEcto - gearCostBuyOrder,
    profitDustInstant: incomeDust - gearCostInstant,
    sigilBonusFull: UNID.sigilBonusPerStackCopper,
    sigilBonus,
  }

  return <UnidentifiedClient view={view} />
}
