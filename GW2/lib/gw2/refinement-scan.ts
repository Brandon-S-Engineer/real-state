// ── Scanner de refinamiento ───────────────────────────────────────────────────
//
// Para cada receta base→refinado: comprar el material base, refinar (parado en
// ciudad, cero gameplay), vender el refinado. El brief lo llama la "renta fija"
// del portafolio — margen delgado (5-15%) pero constante y de alta liquidez.
//
//   ganancia = precio_refinado × 0.85 − Σ(precio_base × cantidad)
//
// Dos escenarios: paciente (comprar mats con buy order al bid, listar el
// refinado al ask) e instantáneo garantizado (comprar mats al ask, tirar el
// refinado al bid). Filtro anti-mercado-muerto: el refinado debe tener demanda
// real (Sold/día de DataWars2) y todos los ingredientes deben tener oferta
// actual (para poder comprarlos de verdad).

import { prisma } from '@/lib/db'
import { getPricesSnapshot } from './prices-cache'
import { ensureMarketHistoryFresh, getSoldDiarioPromedio } from './market-history'

const TP_CUT = 0.15
const MIN_SOLD_DIARIO = 50 // los mats refinados mueven miles/día; esto descarta los muertos

type Ingredient = { itemId: number; count: number }

export async function runRefinementScan(): Promise<{ recipes: number; stored: number }> {
  const recipes = await prisma.gw2RefinementRecipe.findMany()
  if (recipes.length === 0) return { recipes: 0, stored: 0 }

  const outputIds = recipes.map((r) => r.outputItemId)
  const ingredientIds = recipes.flatMap((r) => (r.ingredients as Ingredient[]).map((g) => g.itemId))
  const allIds = Array.from(new Set([...outputIds, ...ingredientIds]))

  // Historial solo del refinado (lo que se vende) — para el filtro de demanda real.
  await ensureMarketHistoryFresh(outputIds)

  const prices = await getPricesSnapshot(allIds)
  const priceById = new Map(prices.map((p) => [p.id, p]))

  const stored: {
    outputItemId: number; family: string; costoBuyOrder: number; ingresoListado: number
    gananciaBuyOrder: number; roiBuyOrder: number; gananciaInstant: number
    refinedSoldDiario: number; oroPotencialDiario: number
  }[] = []

  for (const recipe of recipes) {
    const outPrice = priceById.get(recipe.outputItemId)
    if (!outPrice) continue

    const ingredients = recipe.ingredients as Ingredient[]
    // Todos los ingredientes deben tener oferta actual — si no, no se pueden comprar.
    let costoBuyOrder = 0
    let costoInstant = 0
    let ingredientesOk = true
    for (const g of ingredients) {
      const p = priceById.get(g.itemId)
      const bid = p?.buys?.unit_price ?? 0
      const ask = p?.sells?.unit_price ?? 0
      const supply = p?.sells?.quantity ?? 0
      if (ask === 0 || supply === 0) { ingredientesOk = false; break } // sin vendedores = no comprable
      costoBuyOrder += bid * g.count
      costoInstant += ask * g.count
    }
    if (!ingredientesOk) continue

    const outCount = recipe.outputCount || 1
    // costo por UNIDAD de refinado producida
    costoBuyOrder = Math.round(costoBuyOrder / outCount)
    costoInstant = Math.round(costoInstant / outCount)

    const outAsk = outPrice.sells?.unit_price ?? 0
    const outBid = outPrice.buys?.unit_price ?? 0
    if (outAsk === 0) continue

    const ingresoListado = Math.round(outAsk * (1 - TP_CUT))
    const gananciaBuyOrder = ingresoListado - costoBuyOrder
    const gananciaInstant = Math.round(outBid * (1 - TP_CUT)) - costoInstant
    const roiBuyOrder = costoBuyOrder > 0 ? gananciaBuyOrder / costoBuyOrder : 0

    if (gananciaBuyOrder <= 0) continue // sin margen ni en la versión paciente

    const refinedSoldDiario = (await getSoldDiarioPromedio(recipe.outputItemId)) ?? 0
    if (refinedSoldDiario < MIN_SOLD_DIARIO) continue // mercado muerto — fuera

    stored.push({
      outputItemId: recipe.outputItemId,
      family: recipe.family,
      costoBuyOrder,
      ingresoListado,
      gananciaBuyOrder,
      roiBuyOrder,
      gananciaInstant,
      refinedSoldDiario,
      oroPotencialDiario: Math.round(gananciaBuyOrder * refinedSoldDiario),
    })
  }

  await prisma.$transaction([
    prisma.gw2RefinementOpportunity.deleteMany({}),
    prisma.gw2RefinementOpportunity.createMany({ data: stored.map((s) => ({ ...s, computedAt: new Date() })) }),
  ])

  return { recipes: recipes.length, stored: stored.length }
}
