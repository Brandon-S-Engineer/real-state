// ── Scoring del Endless Upgrade Extractor ─────────────────────────────────────
//
// ganancia = mejor_salida_upgrade (neta de la comisión del TP) + salvage_esperado − precio_compra
//
// Nota sobre el brief original: la fórmula del brief aplica el factor 0.85 dos
// veces (una dentro de "mejor_salida_upgrade" y otra fuera, en "ganancia"),
// pero el ejemplo trabajado (Nika's Coat: runa neta 15% = 0.34g, salvage
// 0.40g, costo 0.31g → ganancia 0.43g) solo descuenta la comisión del TP UNA
// vez. Esa comisión (5% de listado + 10% de intercambio = 15%) se cobra una
// sola vez cuando el ítem se vende, sin importar si fue instant-sell contra
// una buy order o listado y esperado — así que aquí se aplica una sola vez,
// como en el ejemplo, no como dice el pseudocódigo de la sección 4.3.
import { prisma } from '@/lib/db'
import { getPricesSnapshot } from './prices-cache'
import { ensureMarketHistoryFresh, getSoldDiarioPromedio, computeLiquidezDias } from './market-history'

const TP_CUT = 0.15
// Margen mínimo objetivo para calcular el buy order sugerido — no viene del
// brief con un número fijo, así que queda como constante ajustable acá hasta
// que la Fase 5 (TradingConfig) le dé un lugar configurable desde la UI.
const MARGEN_MINIMO = 0.25

export interface ExtractorResult {
  sourceItemId: number
  upgradeItemId: number
  precioCompraActual: number | null
  buyOrderSugerido: number
  mejorSalidaUpgrade: number
  salvageUsado: number
  valorTotal: number
  gananciaActual: number | null
  roiActual: number | null
  soldDiario: number | null
  liquidezDias: number | null
}

function findSalvageRate(
  rates: { rarity: string; levelMin: number; levelMax: number; expectedValue: number }[],
  rarity: string,
  level: number,
) {
  return rates.find((r) => r.rarity === rarity && level >= r.levelMin && level <= r.levelMax)
}

/**
 * Corre el scan completo: trae precios en vivo para todas las fuentes activas
 * (no blacklisteadas), calcula ganancia con salvage incluido, y persiste el
 * resultado en ExtractorOpportunity como cache. Fuentes sin tasa de salvage
 * seedeada o sin mercado del upgrade se descartan en vez de adivinar — mismo
 * espíritu que los gates del brief (sin dato = fuera, no ruido).
 */
export async function runExtractorScan(): Promise<ExtractorResult[]> {
  const sources = await prisma.extractorSourceItem.findMany({ where: { blacklisted: false } })
  if (sources.length === 0) return []

  const salvageRates = await prisma.salvageRate.findMany()
  const itemIds = Array.from(new Set(sources.flatMap((s) => [s.sourceItemId, s.upgradeItemId])))
  const upgradeItemIds = Array.from(new Set(sources.map((s) => s.upgradeItemId)))

  // El historial (DataWars2) solo importa para el upgrade — es lo que se
  // vende; se refresca antes de calcular liquidez, no en cada request (ver
  // ensureMarketHistoryFresh: se salta si ya está fresco de la última hora).
  await ensureMarketHistoryFresh(upgradeItemIds)

  const [items, prices] = await Promise.all([
    prisma.gw2Item.findMany({ where: { id: { in: itemIds } } }),
    getPricesSnapshot(itemIds),
  ])

  const itemById = new Map(items.map((i) => [i.id, i]))
  const priceById = new Map(prices.map((p) => [p.id, p]))

  const results: ExtractorResult[] = []

  for (const source of sources) {
    const baseItem = itemById.get(source.sourceItemId)
    if (!baseItem) continue // todavía no está en el cache de ítems (correr sync:gw2-items)

    const salvage = findSalvageRate(salvageRates, baseItem.rarity, baseItem.level)
    if (!salvage) continue // sin tasa de salvage para esta rareza/nivel — se descarta

    const upgradePrice = priceById.get(source.upgradeItemId)
    if (!upgradePrice) continue // el upgrade no tiene mercado activo — se descarta

    const salidaBuyOrder = upgradePrice.buys?.unit_price ?? 0
    const salidaListado = upgradePrice.sells?.unit_price ?? 0
    const mejorSalidaUpgrade = Math.round(Math.max(salidaBuyOrder, salidaListado) * (1 - TP_CUT))

    const valorTotal = mejorSalidaUpgrade + salvage.expectedValue
    const buyOrderSugerido = Math.max(0, Math.floor(valorTotal / (1 + MARGEN_MINIMO)))

    const basePrice = priceById.get(source.sourceItemId)
    const precioCompraActual = basePrice?.sells?.unit_price ?? null
    const gananciaActual = precioCompraActual != null ? valorTotal - precioCompraActual : null
    const roiActual = gananciaActual != null && precioCompraActual ? gananciaActual / precioCompraActual : null

    const soldDiario = await getSoldDiarioPromedio(source.upgradeItemId)
    const liquidezDias = computeLiquidezDias(upgradePrice.sells?.quantity, soldDiario)

    results.push({
      sourceItemId: source.sourceItemId,
      upgradeItemId: source.upgradeItemId,
      precioCompraActual,
      buyOrderSugerido,
      mejorSalidaUpgrade,
      salvageUsado: salvage.expectedValue,
      valorTotal,
      gananciaActual,
      roiActual,
      soldDiario,
      liquidezDias,
    })
  }

  await Promise.all(
    results.map((r) =>
      prisma.extractorOpportunity.upsert({
        where: { sourceItemId_upgradeItemId: { sourceItemId: r.sourceItemId, upgradeItemId: r.upgradeItemId } },
        create: { ...r, computedAt: new Date() },
        update: { ...r, computedAt: new Date() },
      }),
    ),
  )

  return results.sort((a, b) => (b.gananciaActual ?? -Infinity) - (a.gananciaActual ?? -Infinity))
}
