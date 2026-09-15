// ── Scanner de legendarias ────────────────────────────────────────────────────
//
// Todas las legendarias tradeables, clasificadas por su volumen EJECUTADO real
// (Sold/Bought del order book, vía DataWars2), no por la demanda fantasma. El
// spread en legendarias es enorme (cientos de oro) pero el 15% de impuesto del
// TP también, así que profitFlip = ask×0.85 − bid puede ser negativo aunque el
// spread "se vea" grande. Se guardan TODAS (incluidas las muertas) para que la
// tabla muestre el contraste; el flag `viable` y `phantomRatio` hacen la
// distinción explícita.

import { prisma } from '@/lib/db'
import { getPricesSnapshot } from './prices-cache'
import { ensureMarketHistoryFresh } from './market-history'

const TP_CUT = 0.15
const LOOKBACK_DAYS = 7
// Umbrales de viabilidad para market-making: hace falta flujo ejecutado de
// AMBOS lados (poder comprar Y vender) en la semana.
const MIN_SOLD_SEMANA = 5
const MIN_BOUGHT_SEMANA = 3

export async function runLegendaryScan(): Promise<{ scanned: number; viable: number }> {
  const legs = await prisma.gw2Item.findMany({ where: { rarity: 'Legendary' }, select: { id: true } })
  const legIds = legs.map((l) => l.id)

  const prices = await getPricesSnapshot(legIds)
  const tradeable = prices.filter((p) => (p.sells?.unit_price ?? 0) > 0 && (p.buys?.unit_price ?? 0) > 0)
  const tradeableIds = tradeable.map((p) => p.id)

  await ensureMarketHistoryFresh(tradeableIds)

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const history = await prisma.gw2ItemMarketHistory.findMany({
    where: { itemId: { in: tradeableIds }, periodStart: { gte: since } },
    select: { itemId: true, sold: true, bought: true },
  })
  const flowByItem = new Map<number, { sold: number; bought: number }>()
  for (const h of history) {
    const cur = flowByItem.get(h.itemId) ?? { sold: 0, bought: 0 }
    cur.sold += h.sold
    cur.bought += h.bought
    flowByItem.set(h.itemId, cur)
  }

  const stored: {
    itemId: number; bid: number; ask: number; spread: number; spreadPct: number
    supply: number; demand: number; soldSemana: number; boughtSemana: number
    soldDiario: number; boughtDiario: number; profitFlip: number; roiFlip: number
    diasParaVender: number | null; oroPotencialDiario: number; phantomRatio: number; viable: boolean
  }[] = []

  for (const p of tradeable) {
    const bid = p.buys!.unit_price
    const ask = p.sells!.unit_price
    const supply = p.sells?.quantity ?? 0
    const demand = p.buys?.quantity ?? 0
    const spread = ask - bid

    const flow = flowByItem.get(p.id) ?? { sold: 0, bought: 0 }
    const soldDiario = flow.sold / LOOKBACK_DAYS
    const boughtDiario = flow.bought / LOOKBACK_DAYS

    const profitFlip = Math.round(ask * (1 - TP_CUT) - bid) // negativo si el spread no vence el impuesto
    const roiFlip = bid > 0 ? profitFlip / bid : 0
    const diasParaVender = soldDiario > 0 ? supply / soldDiario : null
    const oroPotencialDiario = Math.round(Math.max(profitFlip, 0) * Math.min(soldDiario, boughtDiario))
    const phantomRatio = demand / Math.max(flow.sold, 1)
    const viable = profitFlip > 0 && flow.sold >= MIN_SOLD_SEMANA && flow.bought >= MIN_BOUGHT_SEMANA

    stored.push({
      itemId: p.id,
      bid, ask, spread,
      spreadPct: bid > 0 ? spread / bid : 0,
      supply, demand,
      soldSemana: flow.sold,
      boughtSemana: flow.bought,
      soldDiario, boughtDiario,
      profitFlip, roiFlip, diasParaVender, oroPotencialDiario, phantomRatio, viable,
    })
  }

  await prisma.$transaction([
    prisma.gw2LegendaryOpportunity.deleteMany({}),
    prisma.gw2LegendaryOpportunity.createMany({ data: stored.map((s) => ({ ...s, computedAt: new Date() })) }),
  ])

  return { scanned: tradeable.length, viable: stored.filter((s) => s.viable).length }
}
