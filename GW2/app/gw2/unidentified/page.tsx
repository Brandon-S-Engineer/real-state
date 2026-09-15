import { prisma } from '@/lib/db'
import { getPricesByIds } from '@/lib/gw2/client'
import { UNID, unidItemIds, MATERIAL_REFINE, T6_PROMOTIONS, T6_PROMO, PHIL_STONES_PER_SHARD, type UnidVariant } from '@/content/gw2-unidentified'
import { analyzePriceBand } from '@/lib/gw2/price-band'
import { analyzeWeekly } from '@/lib/gw2/weekly-cycle'
import { getUnidHistory } from '@/lib/gw2/unid-history-cache'
import UnidentifiedClient, { type UnidView, type MatRow, type PromoRow, type VariantView } from '@/components/gw2/unidentified-client'

export const dynamic = 'force-dynamic'

export default async function UnidentifiedPage() {
  const ids = unidItemIds()
  // Los PRECIOS se piden en vivo en cada carga (~50 ítems = 1 request): la página
  // se auto-refresca cada minuto y eso es justamente lo que tiene que estar
  // fresco. El HISTORIAL, en cambio, va por cache — son ~10.500 filas y ~2s, y
  // DataWars2 lo cierra 1×/día, así que re-pedirlo cada minuto sería inútil.
  const [items, priceList, histByItem] = await Promise.all([
    prisma.gw2Item.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, icon: true } }),
    getPricesByIds(ids),
    getUnidHistory(ids),
  ])
  const itemById = new Map(items.map((i) => [i.id, i]))
  const priceById = new Map(priceList.map((p) => [p.id, p]))
  const askOf = (id: number) => priceById.get(id)?.sells?.unit_price ?? 0
  const bidOf = (id: number) => priceById.get(id)?.buys?.unit_price ?? 0
  const net = (v: number) => v * (1 - UNID.tpCut)
  const nameOf = (id: number) => itemById.get(id)?.name ?? `#${id}`
  const iconOf = (id: number) => itemById.get(id)?.icon ?? null

  const mkRow = (id: number, qty: number): MatRow => {
    const ask = askOf(id)
    const sellSubtotal = Math.round(qty * net(ask))
    const refine = MATERIAL_REFINE[id]
    let craft: MatRow['craft'] = null
    if (refine) {
      const outAsk = askOf(refine.outputId)
      const outputs = qty / refine.inputPer
      const craftSubtotal = Math.round(outputs * net(outAsk))
      craft = {
        outputId: refine.outputId,
        outputName: nameOf(refine.outputId),
        outputIcon: iconOf(refine.outputId),
        inputPer: refine.inputPer,
        outputs: Math.round(outputs * 100) / 100,
        subtotalNet: craftSubtotal,
        // Craftear es lento de hacer y de vender: solo vale la pena si saca una ventaja clara, no un empate técnico.
        isBetter: craftSubtotal > sellSubtotal * (1 + UNID.craftPreferenceMargin),
      }
    }
    return { id, name: nameOf(id), icon: iconOf(id), qty, sellUnitNet: Math.round(net(ask)), subtotalNet: sellSubtotal, craft }
  }

  // Abrir + salvagear un stack tarda lo mismo sea amarillo o verde — el techo real
  // es el tiempo, no una meta de stacks. Todo se muestra por hora en base a esto.
  const stacksPerHour = 3600 / UNID.secondsPerStack

  const computeVariant = (variant: UnidVariant): VariantView => {
    const materialRows = variant.materials.map((m) => mkRow(m.id, m.qtyPerStack))
    const ectos = variant.ectos
    const dustQty = ectos * UNID.ectoToDust
    const dustRow = mkRow(UNID.dustItemId, dustQty)
    const ectoRow = mkRow(UNID.ectoItemId, ectos)

    const salvageLines = variant.salvageCosts.map((c) => ({
      label: c.label,
      uses: c.uses,
      costPerUse: c.costPerUseCopper,
      subtotal: Math.round(c.uses * c.costPerUseCopper),
    }))
    const salvageCost = salvageLines.reduce((s, l) => s + l.subtotal, 0)

    const materialsSubtotal = materialRows.reduce((s, r) => s + r.subtotalNet, 0)
    // "Crafteando óptimo" es el techo real (máximo matemático) — el margen de
    // 20% solo decide si vale la pena resaltar la etiqueta "Mejor", igual que
    // en ecto/dust; no achata este número o "óptimo" queda igual a "sin craftear".
    const materialsOptimized = materialRows.reduce((s, r) => s + Math.max(r.subtotalNet, r.craft?.subtotalNet ?? 0), 0)

    // La suerte que sueltan (Essence of Luck) suma al ingreso — los verdes mucha, los rare nada.
    const luck = variant.luckValueCopper
    const incomeDust = materialsSubtotal + dustRow.subtotalNet + luck - salvageCost
    const incomeEcto = materialsSubtotal + ectoRow.subtotalNet + luck - salvageCost

    const gearCostBuyOrder = Math.round(bidOf(variant.gearItemId) * UNID.stackSize)
    const gearCostInstant = Math.round(askOf(variant.gearItemId) * UNID.stackSize)

    // ── Cazador de precios: ¿el gear está barato HOY vs su propio rango? ──
    const gearHist = histByItem.get(variant.gearItemId) ?? []
    const band = analyzePriceBand(gearHist, bidOf(variant.gearItemId), 90)

    // ── Velocidad de llenado: ¿hoy se está comprando más rápido que lo normal? ──
    // "bought" = buy orders llenados ese día. Se compara el último día contra
    // el promedio de los 14 anteriores (sin contar hoy) — un día de +30% de
    // actividad significa que las órdenes rivales se llenan rápido, así que
    // competir hoy duele menos que en un día muerto.
    const boughtSeries = gearHist.map((r) => r.bought)
    const gearBoughtHoy = boughtSeries.length ? boughtSeries[boughtSeries.length - 1] : 0
    const boughtBaseline = boughtSeries.slice(-15, -1)
    const gearBoughtPromedio = boughtBaseline.length ? boughtBaseline.reduce((s, n) => s + n, 0) / boughtBaseline.length : 0
    const gearVelocidad = gearBoughtPromedio > 0 ? gearBoughtHoy / gearBoughtPromedio : 0

    // ── Timing semanal: comprar el gear barato, vender los mats caros ──
    // El gear se compra por orden (mid del ítem); los materiales se venden como
    // canasta, así que se arma una serie sintética con el VALOR de la canasta de
    // salida de un stack y se le mide el ciclo semanal. El día caro de esa
    // canasta es el día que conviene liquidar lo procesado.
    const gearWeekly = analyzeWeekly(gearHist, { days: 730 })

    // El amarillo ya no procesa a dust (queda semanas colgado): vende ectos
    // directo, así que la canasta que se liquida junta es materiales + ectos,
    // no materiales + dust. El verde sí procesa cuando conviene.
    const dustEnabled = variant.key === 'green'

    const basketParts: { qty: number; hist: Map<number, number> }[] = []
    const addPart = (itemId: number, qty: number) => {
      const rows = histByItem.get(itemId)
      if (!rows?.length) return
      const m = new Map<number, number>()
      for (const r of rows) if (r.sellPriceAvg > 0) m.set(r.date.getTime(), r.sellPriceAvg)
      if (m.size) basketParts.push({ qty, hist: m })
    }
    for (const m of variant.materials) addPart(m.id, m.qtyPerStack)
    if (dustEnabled) addPart(UNID.dustItemId, dustQty)
    else addPart(UNID.ectoItemId, ectos)

    // Solo fechas donde TODAS las partes tienen precio, para no crear saltos
    // artificiales por un material sin dato ese día.
    let basketWeekly = null
    if (basketParts.length > 0) {
      const dates = [...basketParts[0].hist.keys()].filter((t) => basketParts.every((p) => p.hist.has(t)))
      const series = dates
        .sort((a, b) => a - b)
        .map((t) => {
          const v = basketParts.reduce((s, p) => s + p.qty * (p.hist.get(t) ?? 0), 0)
          return { date: new Date(t), buyPriceAvg: v, sellPriceAvg: v }
        })
      basketWeekly = analyzeWeekly(series, { days: 730 })
    }
    // ── Ruta de salida: ¿procesar los ectos a dust, o venderlos tal cual? ──
    // El amarillo produce tanto ecto (222.75/stack) que el dust resultante
    // (~412/stack) es 30% del volumen diario que se vende en TODO el juego: se
    // queda pegado semanas. Por eso el amarillo NUNCA procesa, solo vende ectos.
    // El verde apenas produce ectos (~7.6/stack), así que ahí sí se puede decidir
    // día a día según el precio real — se calcula, no se asume.
    const dustAsk = askOf(UNID.dustItemId)
    const ectoAsk = askOf(UNID.ectoItemId)
    const dustEquilibrio = Math.round(ectoAsk / UNID.ectoToDust) // precio de dust que empata

    // ── Piso de ectos: solo aplica al amarillo, que siempre vende el ecto
    // directo (nunca procesa). Es cuántos ectos harían falta, al precio de hoy,
    // para que el stack salga tablas — gear + salvage cubiertos por materiales + ectos.
    const ectoNet = net(ectoAsk)
    const ectosBreakeven = !dustEnabled && ectoNet > 0
      ? Math.max(0, Math.round(((gearCostBuyOrder - materialsSubtotal - luck + salvageCost) / ectoNet) * 100) / 100)
      : 0
    // El ecto se vende mucho más rápido que el dust y no hace falta procesarlo:
    // dust solo se recomienda si le saca una ventaja clara al ecto, no un
    // empate técnico de 1 cobre.
    const convieneProcesar = dustEnabled && incomeDust > incomeEcto * (1 + UNID.dustPreferenceMargin)
    const useDust = convieneProcesar
    const incomeChosen = useDust ? incomeDust : incomeEcto
    const profitChosen = incomeChosen - gearCostBuyOrder // sin craftear, con la ruta elegida
    const profitDust = incomeDust - gearCostBuyOrder
    const profitEcto = incomeEcto - gearCostBuyOrder
    const incomeOptimized = materialsOptimized + (useDust ? dustRow.subtotalNet : ectoRow.subtotalNet) + luck - salvageCost
    const profitOptimized = incomeOptimized - gearCostBuyOrder // crafteando lo óptimo, con la ruta elegida
    const routeLabel = useDust ? 'procesando a dust' : 'vendiendo los ectos directo'

    // Dorado: solo el amarillo (el verde no necesita esta señal, se gana sin
    // pelear). Ganancia real + mercado más rápido que su propio promedio.
    const goldEntry = !dustEnabled && profitChosen >= UNID.goldEntry.profitFloorCopper && gearVelocidad >= UNID.goldEntry.velocityMin

    // Liquidez: cuánto se vende por día de cada uno, y qué fracción de ese
    // volumen representa la meta diaria. Es lo que explica que el dust se quede
    // pegado y el ecto no.
    const ventaDiaria = (itemId: number) => {
      const rows = histByItem.get(itemId) ?? []
      const ult = rows.slice(-30).filter((r) => r.sold > 0)
      return ult.length ? Math.round(ult.reduce((s, r) => s + r.sold, 0) / ult.length) : 0
    }
    const dustVentaDiaria = ventaDiaria(UNID.dustItemId)
    const ectoVentaDiaria = ventaDiaria(UNID.ectoItemId)

    return {
      key: variant.key,
      label: variant.label,
      gearName: nameOf(variant.gearItemId),
      gearIcon: iconOf(variant.gearItemId),
      ectoNote: variant.ectoNote,
      materialRows,
      dustRow,
      ectoRow,
      ectos: Math.round(ectos * 100) / 100,
      luckValueCopper: luck,
      salvageLines,
      salvageCost,
      materialsSubtotal,
      dustEnabled,
      useDust,
      routeLabel,
      incomeDust,
      incomeEcto,
      incomeChosen,
      incomeOptimized,
      gearCostBuyOrder,
      gearCostInstant,
      gearUnitBid: bidOf(variant.gearItemId),
      gearUnitAsk: askOf(variant.gearItemId),
      band,
      bandStackTarget: band ? Math.round(band.targetBuy * UNID.stackSize) : 0,
      // Cierra el círculo: si el gear está caro hoy, ¿a cuánto sí conviene?
      profitAtTarget: band ? incomeOptimized - Math.round(band.targetBuy * UNID.stackSize) : 0,
      gearWeekly,
      basketWeekly,
      profitDust,
      profitEcto,
      profitChosen,
      profitOptimized,
      goldEntry,
      gearVelocidad: Math.round(gearVelocidad * 100) / 100,
      // ── Comparación de rutas de salida ──
      convieneProcesar,
      dustEquilibrio,
      dustAsk,
      ectoAsk,
      ectosBreakeven,
      dustQty: Math.round(dustQty * 10) / 10,
      dustVentaDiaria,
      ectoVentaDiaria,
      // Qué fracción del volumen diario del mercado se comería UNA HORA tuya.
      dustCargaDiaria: dustVentaDiaria > 0 ? (dustQty * stacksPerHour) / dustVentaDiaria : 0,
      ectoCargaDiaria: ectoVentaDiaria > 0 ? (ectos * stacksPerHour) / ectoVentaDiaria : 0,
      // ── Ganancia por hora: cada stack tarda ~45s en procesarse, sea cual sea la rareza ──
      stacksPerHour,
      gearUnitsPerHour: stacksPerHour * UNID.stackSize,
      profitPerHourCraft: profitOptimized * stacksPerHour,
      profitPerHourNoCraft: profitChosen * stacksPerHour,
      gearCostPerHour: gearCostBuyOrder * stacksPerHour,
    }
  }

  const variants = UNID.variants.map(computeVariant)

  // ── Promoción de Crystalline Dust a T6 (Mystic Forge) ──
  // El amarillo ya no procesa a dust, así que esto ya no se escala a su stack.
  // Se asume un stack redondo de 250 dust — el que sea que tengas a mano, por
  // ejemplo el que sueltan metas como Dragonfall — y solo se muestra viendo el
  // verde (la rareza que sí puede terminar generando dust).
  const dustStackQty = UNID.stackSize // 250, asumido
  const shardsPerCraft = T6_PROMO.philStonePer / PHIL_STONES_PER_SHARD // 0.5
  const dustAskNow = askOf(UNID.dustItemId)
  const promoCrafts = Math.floor(dustStackQty / T6_PROMO.dustPer) // 50
  const promoShards = (promoCrafts * T6_PROMO.philStonePer) / PHIL_STONES_PER_SHARD // 25
  const promoT5Stacks250 = Math.ceil((promoCrafts * T6_PROMO.t5Per) / 250) // 10
  const promoRows: PromoRow[] = T6_PROMOTIONS.map((p) => {
    const t6Ask = askOf(p.t6Id)
    const t5Ask = askOf(p.t5Id)
    const revenue = Math.round(T6_PROMO.avgYield * net(t6Ask))
    const cost = Math.round(T6_PROMO.seedPer * t6Ask + T6_PROMO.t5Per * t5Ask + T6_PROMO.dustPer * dustAskNow)
    const profit = revenue - cost
    const investPerCraft = T6_PROMO.seedPer * t6Ask + T6_PROMO.t5Per * t5Ask
    return {
      t6Id: p.t6Id,
      t6Name: nameOf(p.t6Id),
      t6Icon: iconOf(p.t6Id),
      t5Id: p.t5Id,
      t5Name: nameOf(p.t5Id),
      yield: T6_PROMO.avgYield,
      cost,
      revenue,
      profit,
      profitPerShard: Math.round(profit / shardsPerCraft),
      profitPerDust: Math.round(profit / T6_PROMO.dustPer),
      t5Stacks: promoT5Stacks250,
      investStack: Math.round(investPerCraft * promoCrafts),
      profitStack: profit * promoCrafts,
    }
  }).sort((a, b) => b.profitStack - a.profitStack)

  const view: UnidView = {
    stackSize: UNID.stackSize,
    variants,
    dustSellUnitNet: Math.round(net(dustAskNow)),
    promoRows,
    promoDustPer: T6_PROMO.dustPer,
    promoT5Per: T6_PROMO.t5Per,
    promoPhilStonePer: T6_PROMO.philStonePer,
    promoYield: T6_PROMO.avgYield,
    promoShardsPerCraft: shardsPerCraft,
    promoCrafts,
    promoShards,
    promoT5Stacks250,
    dustPerStack: Math.round(dustStackQty),
  }

  return <UnidentifiedClient view={view} />
}
