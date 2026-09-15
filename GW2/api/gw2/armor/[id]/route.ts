import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getPricesByIds, getListingsByIds } from '@/lib/gw2/client'
import { ensureMarketHistoryFresh } from '@/lib/gw2/market-history'

const LOOKBACK_DAYS = 7

// Detalle completo de una oportunidad de armadura: breakdown de la extracción,
// order book en vivo (current sellers/buyers) del arma y de la runa, e
// historial de precio/volumen. Todo lo que GW2BLTC muestra al abrir un ítem.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const itemId = Number(id)
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const opportunity = await prisma.gw2ArmorOpportunity.findUnique({ where: { itemId } })
  if (!opportunity) return NextResponse.json({ error: 'Oportunidad no encontrada — corré el scan' }, { status: 404 })

  const [baseItem, suffixItem] = await Promise.all([
    prisma.gw2Item.findUnique({ where: { id: itemId } }),
    prisma.gw2Item.findUnique({ where: { id: opportunity.suffixItemId } }),
  ])

  await ensureMarketHistoryFresh([itemId, opportunity.suffixItemId])

  const [listings, prices, itemHistory, runeHistory] = await Promise.all([
    getListingsByIds([itemId, opportunity.suffixItemId]),
    getPricesByIds([itemId, opportunity.suffixItemId]),
    prisma.gw2ItemMarketHistory.findMany({
      where: { itemId, periodStart: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) } },
      orderBy: { periodStart: 'asc' },
    }),
    prisma.gw2ItemMarketHistory.findMany({
      where: { itemId: opportunity.suffixItemId, periodStart: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) } },
      orderBy: { periodStart: 'asc' },
    }),
  ])

  const listingById = new Map(listings.map((l) => [l.id, l]))
  const priceById = new Map(prices.map((p) => [p.id, p]))

  return NextResponse.json({
    opportunity,
    baseItem: baseItem ? { id: baseItem.id, name: baseItem.name, icon: baseItem.icon, rarity: baseItem.rarity, level: baseItem.level, type: baseItem.type } : null,
    suffixItem: suffixItem ? { id: suffixItem.id, name: suffixItem.name, icon: suffixItem.icon, rarity: suffixItem.rarity } : null,
    itemBook: listingById.get(itemId) ?? null,
    runeBook: listingById.get(opportunity.suffixItemId) ?? null,
    itemPrice: priceById.get(itemId) ?? null,
    runePrice: priceById.get(opportunity.suffixItemId) ?? null,
    itemHistory,
    runeHistory,
  })
}
