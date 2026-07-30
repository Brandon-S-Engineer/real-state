// ── Escáner automático de extracción + salvage de armaduras/armas ────────────
//
// Para CADA arma/armadura exótica tradeable que trae un upgrade (la API lo dice
// en details.suffix_item_id, ya cacheado — sin seed manual), calcula la
// ganancia completa del play:
//
//   comprar barato el arma  →  extraer runa/sigilo (Endless Extractor, gratis,
//   sale unbound porque el ítem era tradeable)  →  vender el upgrade  →  salvage
//   del arma vacía por ectos.
//
//   ganancia = venta_neta_upgrade + valor_salvage_neto − precio_compra_arma
//
// Se calcula la ganancia de dos formas: comprando ya (al ask) y poniendo una
// buy order al bid (la estrategia real del brief — el margen vive en el fondo
// del libro). Se rankea por la segunda.

import { prisma } from '@/lib/db'
import { type Gw2Price } from './client'
import { getPricesSnapshot } from './prices-cache'

const TP_CUT = 0.15
const ECTO_ITEM_ID = 19721 // Glob of Ectoplasm

// Rendimiento promedio de salvage de un exótico nivel 80 con kit Mystic /
// Silver-Fed. La wiki reporta 0-3 ectos por salvage con promedio ~0.875 para
// rareza rara/exótica. Es una constante de juego aproximada y visible a
// propósito (no un fudge oculto) — se puede ajustar acá si tu experiencia real
// difiere. No sumo crystalline dust aparte: el ecto ya se valúa a su precio de
// mercado, y el dust saldría de salvagear el ecto (un paso más), no del arma.
const EXOTIC_ECTO_YIELD = 0.875

export interface ArmorResult {
  itemId: number
  suffixItemId: number
  itemType: string
  armorAsk: number | null
  armorBid: number | null
  runaSellNeto: number
  salvageNeto: number
  valorTotal: number
  gananciaInstant: number | null
  gananciaBuyOrder: number | null
  roiBuyOrder: number | null
  itemSupply: number
  itemDemand: number
  runaSupply: number
}

function bestExit(price: Gw2Price | undefined): number {
  if (!price) return 0
  const bid = price.buys?.unit_price ?? 0
  const ask = price.sells?.unit_price ?? 0
  // Mejor salida = instant-sell contra la buy order (bid) o listar y esperar
  // (ask), lo que más deje; el 15% del TP se descuenta una sola vez.
  return Math.round(Math.max(bid, ask) * (1 - TP_CUT))
}

/**
 * Corre el scan completo sobre exóticos con upgrade y persiste el resultado en
 * Gw2ArmorOpportunity (reemplaza el scan anterior). Rápido: ~1500 ítems base +
 * upgrades únicos + ecto ≈ 1700 ids = ~9 requests a /v2/commerce/prices.
 */
export async function runArmorScan(): Promise<{ scanned: number; profitable: number }> {
  const items = await prisma.gw2Item.findMany({
    where: { rarity: 'Exotic', type: { in: ['Armor', 'Weapon'] } },
    select: { id: true, type: true, details: true },
  })

  const candidates = items
    .map((i) => {
      const d = i.details as Record<string, unknown> | null
      const suffixId = d?.suffix_item_id ? Number(d.suffix_item_id) : 0
      return suffixId > 0 ? { itemId: i.id, suffixItemId: suffixId, itemType: i.type } : null
    })
    .filter((c): c is { itemId: number; suffixItemId: number; itemType: string } => c !== null)

  const priceIds = Array.from(new Set([...candidates.flatMap((c) => [c.itemId, c.suffixItemId]), ECTO_ITEM_ID]))
  const prices = await getPricesSnapshot(priceIds)
  const priceById = new Map(prices.map((p) => [p.id, p]))

  const ectoBestExit = bestExit(priceById.get(ECTO_ITEM_ID))
  const salvageNeto = Math.round(EXOTIC_ECTO_YIELD * ectoBestExit)

  const results: ArmorResult[] = []

  for (const c of candidates) {
    const armorPrice = priceById.get(c.itemId)
    const suffixPrice = priceById.get(c.suffixItemId)
    if (!armorPrice || !suffixPrice) continue // sin mercado de un lado — se descarta

    const itemSupply = armorPrice.sells?.quantity ?? 0
    const itemDemand = armorPrice.buys?.quantity ?? 0
    // Gate anti-ruido: si NADIE está vendiendo el arma, el mercado está
    // desierto — mi buy order no se va a llenar nunca. Sin vendedores actuales,
    // fuera, por más buena que se vea la ganancia teórica. Esto es exactamente
    // el ruido que la página existe para eliminar.
    if (itemSupply === 0) continue

    const runaSupply = suffixPrice.sells?.quantity ?? 0
    if (runaSupply === 0) continue // el upgrade no tiene vendedores/mercado — no hay salida real

    const runaSellNeto = bestExit(suffixPrice)
    if (runaSellNeto === 0) continue // el upgrade no tiene salida — el play no cierra

    const valorTotal = runaSellNeto + salvageNeto
    const armorAsk = armorPrice.sells?.unit_price ?? null
    const armorBid = armorPrice.buys?.unit_price ?? null

    const gananciaInstant = armorAsk != null ? valorTotal - armorAsk : null
    const gananciaBuyOrder = armorBid != null ? valorTotal - armorBid : null
    const roiBuyOrder = gananciaBuyOrder != null && armorBid ? gananciaBuyOrder / armorBid : null

    // Solo guardar lo que deja ganancia por la estrategia real (buy order).
    if (gananciaBuyOrder == null || gananciaBuyOrder <= 0) continue

    results.push({
      itemId: c.itemId,
      suffixItemId: c.suffixItemId,
      itemType: c.itemType,
      armorAsk,
      armorBid,
      runaSellNeto,
      salvageNeto,
      valorTotal,
      gananciaInstant,
      gananciaBuyOrder,
      roiBuyOrder,
      itemSupply,
      itemDemand,
      runaSupply,
    })
  }

  await prisma.$transaction([
    prisma.gw2ArmorOpportunity.deleteMany({}),
    prisma.gw2ArmorOpportunity.createMany({ data: results.map((r) => ({ ...r, computedAt: new Date() })) }),
  ])

  return { scanned: candidates.length, profitable: results.length }
}
