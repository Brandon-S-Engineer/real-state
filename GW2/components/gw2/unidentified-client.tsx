'use client'

import { useMemo, useState } from 'react'
import { formatCopper } from '@/lib/gw2/format'
import { WeekBars, ConsistencyDot } from '@/components/gw2/week-bars'
import AutoRefresh from '@/components/gw2/auto-refresh'
import { UNID } from '@/content/gw2-unidentified'
import type { WeeklyStat } from '@/lib/gw2/weekly-cycle'
import type { PriceBand } from '@/lib/gw2/price-band'

export type MatRow = {
  id: number
  name: string
  icon: string | null
  qty: number
  sellUnitNet: number
  subtotalNet: number
  craft: {
    outputId: number
    outputName: string
    outputIcon: string | null
    inputPer: number
    outputs: number
    subtotalNet: number
    isBetter: boolean
  } | null
}

export type PromoRow = {
  t6Id: number
  t6Name: string
  t6Icon: string | null
  t5Id: number
  t5Name: string
  yield: number
  cost: number
  revenue: number
  profit: number
  profitPerShard: number
  profitPerDust: number
  t5Stacks: number
  investStack: number
  profitStack: number
}

export type SalvageLine = { label: string; uses: number; costPerUse: number; subtotal: number }

export type VariantView = {
  key: 'rare' | 'green'
  label: string
  gearName: string
  gearIcon: string | null
  ectoNote: string
  materialRows: MatRow[]
  dustRow: MatRow
  ectoRow: MatRow
  ectos: number
  luckValueCopper: number
  salvageLines: SalvageLine[]
  salvageCost: number
  materialsSubtotal: number
  /** El amarillo nunca procesa (el dust se queda semanas pegado): solo el verde compara rutas. */
  dustEnabled: boolean
  /** Ruta elegida HOY, calculada con precio real. Para el amarillo siempre false. */
  useDust: boolean
  routeLabel: string
  incomeDust: number
  incomeEcto: number
  /** Ingreso de la ruta elegida (useDust ? incomeDust : incomeEcto). */
  incomeChosen: number
  incomeOptimized: number
  gearCostBuyOrder: number
  gearCostInstant: number
  gearUnitBid: number
  gearUnitAsk: number
  /** Dónde cae el precio de hoy dentro de su rango de 90 días. */
  band: PriceBand | null
  /** Lo que costaría el stack comprando al precio objetivo de la banda. */
  bandStackTarget: number
  /** Ganancia por stack crafteando óptimo SI comprás al precio objetivo. */
  profitAtTarget: number
  /** Ciclo semanal del gear: qué día conviene COMPRARLO. */
  gearWeekly: WeeklyStat | null
  /** Ciclo semanal de la canasta de materiales de salida: qué día conviene VENDER. */
  basketWeekly: WeeklyStat | null
  profitDust: number
  profitEcto: number
  /** Ganancia sin craftear, con la ruta elegida (= profitEcto en el amarillo). */
  profitChosen: number
  profitOptimized: number
  /** Buen momento para competir por el gear: ganancia real + el mercado llenándose más rápido que su propio promedio. Solo amarillo. */
  goldEntry: boolean
  /** "bought" de hoy ÷ promedio de los 14 días previos. >1 = se está llenando más rápido que lo normal. */
  gearVelocidad: number
  /** ¿Procesar los ectos a dust rinde más que venderlos tal cual? Se calcula, no se asume. */
  convieneProcesar: boolean
  /** Precio de dust al que procesar empata con vender los ectos. */
  dustEquilibrio: number
  dustAsk: number
  ectoAsk: number
  /** Mínimo de ectos que tendría que dar el stack, al precio de hoy, para salir tablas. Solo aplica al amarillo (nunca procesa). */
  ectosBreakeven: number
  dustQty: number
  /** Unidades vendidas por día en el mercado (media de 30 días). */
  dustVentaDiaria: number
  ectoVentaDiaria: number
  /** Fracción del volumen diario del mercado que se comería una hora tuya. */
  dustCargaDiaria: number
  ectoCargaDiaria: number
  /** Stacks/hora al ritmo de procesado (~45s/stack, igual para amarillo y verde). */
  stacksPerHour: number
  gearUnitsPerHour: number
  profitPerHourCraft: number
  profitPerHourNoCraft: number
  gearCostPerHour: number
}

export type UnidView = {
  stackSize: number
  variants: VariantView[]
  dustSellUnitNet: number
  promoRows: PromoRow[]
  promoDustPer: number
  promoT5Per: number
  promoPhilStonePer: number
  promoYield: number
  promoShardsPerCraft: number
  promoCrafts: number
  promoShards: number
  promoT5Stacks250: number
  dustPerStack: number
}

function ItemIcon({ src, alt, size = 24 }: { src: string | null; alt: string; size?: number }) {
  if (!src) return <div className='rounded bg-muted shrink-0' style={{ width: size, height: size }} />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} className='rounded shrink-0' style={{ width: size, height: size }} loading='lazy' />
}

// Por qué 3 y no 10: la varianza de salvage por STACK (n=250) ronda ±14 ectos
// (1 desvío estándar) — un margen de 5-10 ectos ya está adentro de esa nube de
// ruido y no te protege de nada en un stack individual, solo te hace perder
// más pujas. La ley de los grandes números protege el PROMEDIO a través de
// muchos stacks, no a cada stack por separado — así que el margen cómodo debe
// ser chico (agresivo) y la protección real viene del volumen, no del margen.
/** Margen "cómodo" por defecto al abrir la página — ajustable en vivo con el control de arriba del amarillo, no es un piso fijo. */
const ECTO_MARGIN_COMODO_DEFAULT = 3

/** Color del precio cuando es buen momento para competir (ganancia real + se llena más rápido que lo normal). */
const GOLD_PRICE = 'text-amber-500 dark:text-amber-400'

function GoldCaption({ v }: { v: VariantView }) {
  if (!v.goldEntry) return null
  return (
    <div className='text-[11px] text-amber-600 dark:text-amber-400 mt-1 leading-snug font-medium'>
      🟡 PELEALO — ya pasó el filtro: {formatCopper(v.profitChosen)}+ y {v.gearVelocidad.toFixed(1)}× más rápido que su promedio (el mínimo es {UNID.goldEntry.velocityMin}×). No esperes un número más lindo, esto ya alcanza.
    </div>
  )
}

function ectoMarginTone(margen: number, comodo: number) {
  if (margen >= comodo) return 'text-emerald-600 dark:text-emerald-400'
  if (margen >= 0) return 'text-amber-600 dark:text-amber-500'
  return 'text-red-600 dark:text-red-400'
}

function ectoMarginLabel(margen: number, comodo: number) {
  if (margen >= comodo) return `${ectoFmt(margen)} de margen — cómodo`
  if (margen >= 0) return `${ectoFmt(margen)} de margen — ajustado, menos de ${ectoFmt(comodo)}`
  return `faltan ${ectoFmt(-margen)}`
}

/**
 * Piso de ectos + margen si el stack costara `stackCost` en total, ya armado
 * como "205.37 ectos (17.38 de margen — cómodo)" — el formato que de un
 * vistazo dice si ganás sin tener que restar nada en la cabeza. Solo tiene
 * sentido en el amarillo (ecto directo). `comodo` es el umbral que el
 * usuario ajusta en vivo (no todos los días 10 ectos de margen valen lo mismo).
 */
function ectoStatus(v: VariantView, stackCost: number, comodo: number) {
  const ectoNet = v.ectoAsk * (1 - UNID.tpCut)
  const breakeven = ectoNet > 0 ? Math.max(0, (stackCost - v.materialsSubtotal - v.luckValueCopper + v.salvageCost) / ectoNet) : 0
  const margen = Math.round((v.ectos - breakeven) * 100) / 100
  return { tone: ectoMarginTone(margen, comodo), text: `${ectoFmt(breakeven)} ectos (${ectoMarginLabel(margen, comodo)})` }
}

/** Precio por unidad (redondeado para arriba) que deja exactamente `margin` ectos de margen. */
function unitPriceForMargin(v: VariantView, stackSize: number, margin: number) {
  const ectoNet = v.ectoAsk * (1 - UNID.tpCut)
  if (ectoNet <= 0) return 0
  return Math.ceil(((v.ectos - margin) * ectoNet + v.materialsSubtotal + v.luckValueCopper - v.salvageCost) / stackSize)
}

function qtyFmt(n: number) {
  return n % 1 === 0 ? n.toLocaleString('es-MX') : n.toLocaleString('es-MX', { maximumFractionDigits: 3 })
}

/** Siempre 2 decimales fijos — para que "205.58 ectos (17.17 de margen)" se lea de un vistazo, sin que el número de dígitos salte. */
function ectoFmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Precio en formato "silver.copper" (ej. 2883 cobre → "28.83") — como lo piensa un jugador al poner una orden, sin el "Ng Ns Nc" completo. */
function silverDecimal(copper: number) {
  const c = Math.round(Math.max(0, copper))
  const silver = Math.floor(c / 100)
  const rem = c % 100
  return `${silver.toLocaleString('es-MX')}.${rem.toString().padStart(2, '0')}`
}

/**
 * Solo el verde compara rutas: el amarillo produce tanto ecto que el dust
 * resultante es ~30% del volumen diario de TODO el mercado y se queda pegado
 * semanas, así que el amarillo directamente no procesa. En el verde sí conviene
 * decidir con precio real en vez de una regla fija.
 */
function RutaSalida({ v }: { v: VariantView }) {
  if (!v.dustEnabled) return null

  const diferencia = v.profitDust - v.profitEcto
  const gana = v.convieneProcesar
  const pctAhead = v.incomeEcto > 0 ? (v.incomeDust / v.incomeEcto - 1) * 100 : 0
  const umbralPct = UNID.dustPreferenceMargin * 100

  return (
    <div className='rounded-xl border overflow-hidden'>
      <div className='px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide'>Ruta de salida — ¿procesar a dust o vender los ectos?</div>
      <div className='grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x'>
        <div className={`p-4 ${gana ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}>
          <div className='flex items-center gap-2'>
            <span className='text-xs uppercase tracking-wide text-muted-foreground'>Procesando a dust</span>
            {gana && <span className='text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-semibold uppercase'>Mejor</span>}
          </div>
          <div className={`text-2xl font-bold tabular-nums ${v.profitDust >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {v.profitDust >= 0 ? '+' : ''}
            {formatCopper(v.profitDust)}
          </div>
          <div className='text-xs text-muted-foreground mt-1'>
            {v.dustQty.toLocaleString('es-MX')} dust a {formatCopper(v.dustAsk)}
          </div>
          <div className='text-[11px] mt-2 leading-snug'>
            <span className='text-muted-foreground'>Se venden </span>
            <strong className='tabular-nums'>{v.dustVentaDiaria.toLocaleString('es-MX')}</strong>
            <span className='text-muted-foreground'> por día en todo el mercado. Una hora tuya sería el </span>
            <strong className={v.dustCargaDiaria > 0.15 ? 'text-red-500' : 'text-foreground'}>{(v.dustCargaDiaria * 100).toFixed(0)}%</strong>
            <span className='text-muted-foreground'> de ese volumen.</span>
          </div>
        </div>

        <div className={`p-4 ${!gana ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}>
          <div className='flex items-center gap-2'>
            <span className='text-xs uppercase tracking-wide text-muted-foreground'>Vendiendo ectos directo</span>
            {!gana && <span className='text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-semibold uppercase'>Mejor</span>}
          </div>
          <div className={`text-2xl font-bold tabular-nums ${v.profitEcto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {v.profitEcto >= 0 ? '+' : ''}
            {formatCopper(v.profitEcto)}
          </div>
          <div className='text-xs text-muted-foreground mt-1'>
            {v.ectos.toLocaleString('es-MX')} ectos a {formatCopper(v.ectoAsk)}
          </div>
          <div className='text-[11px] mt-2 leading-snug'>
            <span className='text-muted-foreground'>Se venden </span>
            <strong className='tabular-nums'>{v.ectoVentaDiaria.toLocaleString('es-MX')}</strong>
            <span className='text-muted-foreground'> por día. Una hora tuya sería el </span>
            <strong className={v.ectoCargaDiaria > 0.15 ? 'text-red-500' : 'text-foreground'}>{(v.ectoCargaDiaria * 100).toFixed(1)}%</strong>
            <span className='text-muted-foreground'> — se coloca sin mover el precio.</span>
          </div>
        </div>
      </div>
      <div className='px-4 py-2.5 border-t text-xs leading-snug'>
        {gana ? (
          <>
            Hoy procesar deja <strong className='text-emerald-600 dark:text-emerald-400'>{formatCopper(diferencia)}</strong> más por stack —{' '}
            <strong>{pctAhead.toFixed(1)}%</strong> más que vender directo, por encima del +{umbralPct.toFixed(0)}% que pedimos para justificar
            procesar (el ecto se vende mucho más rápido y no necesita el paso extra).
          </>
        ) : diferencia > 0 ? (
          <>
            Procesar deja nominalmente <strong className='tabular-nums'>{formatCopper(diferencia)}</strong> más ({pctAhead.toFixed(1)}%), pero no
            llega al +{umbralPct.toFixed(0)}% que pedimos para que valga la pena: <strong>conviene vender los ectos directo</strong>, se venden
            mucho más rápido y sin trabajo extra.
          </>
        ) : (
          <>
            Hoy <strong>NO conviene procesar</strong>: vender los ectos directo deja{' '}
            <strong className='text-emerald-600 dark:text-emerald-400'>{formatCopper(-diferencia)}</strong> más por stack. Encima el ecto se
            vende mucho más rápido.
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Simulador de margen sobre el mejor bid: pelear por +1c es agotador y casi
 * no deja nada. Este widget deja fijar un margen cómodo (default +10c) y ver,
 * en vivo, cuánto se gana si entrás ahí — al lado de la ganancia real de hoy.
 */
function PriceSimulator({ v, stackSize, comodo }: { v: VariantView; stackSize: number; comodo: number }) {
  const [offset, setOffset] = useState(10)
  const simUnit = Math.max(0, v.gearUnitBid + offset)
  const simStackCost = simUnit * stackSize
  const simProfitNoCraft = v.incomeChosen - simStackCost
  const simProfitCraft = v.incomeOptimized - simStackCost

  // El margen de ectos solo existe en el amarillo (siempre vende el ecto
  // directo, nunca procesa). Se recalcula acá mismo para las dos columnas —
  // la de hoy y la del precio simulado — sin ir a buscarlo a la tabla de abajo.
  const showEctoMargin = !v.dustEnabled
  const currentStatus = ectoStatus(v, v.gearCostBuyOrder, comodo)
  const simStatus = ectoStatus(v, simStackCost, comodo)
  const targetUnit = unitPriceForMargin(v, stackSize, comodo)

  return (
    <div className='rounded-xl border overflow-hidden'>
      <div className='px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide'>Simulador — ¿qué gano si dejo de pelear por +1c?</div>
      <div className='grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x'>
        <div className='p-4'>
          <div className='text-xs uppercase tracking-wide text-muted-foreground'>Al precio actual (mejor bid)</div>
          <div className={`text-lg font-semibold tabular-nums mt-0.5 ${v.goldEntry ? GOLD_PRICE : ''}`}>{formatCopper(v.gearUnitBid)}</div>
          <GoldCaption v={v} />
          <div className={`text-2xl font-bold tabular-nums mt-2 ${v.profitChosen >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {v.profitChosen >= 0 ? '+' : ''}{formatCopper(v.profitChosen)}
          </div>
          <div className='text-[11px] text-muted-foreground'>sin craftear</div>
          <div className={`text-sm font-medium tabular-nums mt-1.5 ${v.profitOptimized >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {v.profitOptimized >= 0 ? '+' : ''}{formatCopper(v.profitOptimized)}
          </div>
          <div className='text-[11px] text-muted-foreground'>crafteando óptimo</div>
          {showEctoMargin && (
            <div className='text-[11px] mt-2 pt-2 border-t'>
              <span className='text-muted-foreground'>Piso de ectos: </span>
              <span className={currentStatus.tone}>{currentStatus.text}</span>
            </div>
          )}
        </div>

        <div className='p-4'>
          <div className='flex items-center justify-between gap-2'>
            <span className='text-xs uppercase tracking-wide text-muted-foreground'>Con tu margen</span>
            <label className='flex items-center gap-1 text-xs'>
              <span className='text-muted-foreground'>+</span>
              <input
                type='number'
                min={0}
                value={offset}
                onChange={(e) => setOffset(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                className='w-14 rounded border px-1.5 py-0.5 text-xs tabular-nums text-right bg-background'
              />
              <span className='text-muted-foreground'>c sobre el bid</span>
            </label>
          </div>
          <div className='text-lg font-semibold tabular-nums mt-0.5'>{formatCopper(simUnit)}</div>
          <div className={`text-2xl font-bold tabular-nums mt-2 ${simProfitNoCraft >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {simProfitNoCraft >= 0 ? '+' : ''}{formatCopper(simProfitNoCraft)}
          </div>
          <div className='text-[11px] text-muted-foreground'>sin craftear</div>
          <div className={`text-sm font-medium tabular-nums mt-1.5 ${simProfitCraft >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {simProfitCraft >= 0 ? '+' : ''}{formatCopper(simProfitCraft)}
          </div>
          <div className='text-[11px] text-muted-foreground'>crafteando óptimo</div>
          {showEctoMargin && (
            <div className='text-[11px] mt-2 pt-2 border-t'>
              <span className='text-muted-foreground'>Piso de ectos: </span>
              <span className={simStatus.tone}>{simStatus.text}</span>
            </div>
          )}
        </div>
      </div>
      {showEctoMargin && (
        <div className='px-4 py-2 border-t text-[11px] text-muted-foreground leading-snug'>
          Para {ectoFmt(comodo)} ectos de margen, poné la orden hasta{' '}
          <span className='text-amber-600 dark:text-amber-400 tabular-nums text-sm'>{silverDecimal(targetUnit)}</span>
          <span className='text-muted-foreground'> (plata.cobre, redondeado para arriba) — stack de {stackSize} = </span>
          <strong className='text-foreground tabular-nums'>{formatCopper(targetUnit * stackSize)}</strong>.
        </div>
      )}
    </div>
  )
}

const BAND_STYLE: Record<PriceBand['verdict'], { box: string; text: string; label: string }> = {
  barato: {
    box: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Barato — comprá ahora',
  },
  normal: { box: '', text: 'text-foreground', label: 'En su rango normal' },
  caro: {
    box: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40',
    text: 'text-amber-600 dark:text-amber-500',
    label: 'Caro — esperá o bajá la orden',
  },
}

/**
 * Cazador de precios: ubica el precio de hoy dentro de su rango de 90 días y
 * dice a qué precio poner la orden. Sin esto, "el verde está a 1s98c" no
 * significa nada.
 */
function PriceHunter({ v, stackSize }: { v: VariantView; stackSize: number }) {
  const b = v.band
  if (!b) {
    return (
      <div className='rounded-xl border p-4'>
        <div className='text-xs uppercase tracking-wide text-muted-foreground mb-1'>Precio del gear</div>
        <div className='text-2xl font-bold tabular-nums'>{formatCopper(v.gearUnitBid)}</div>
        <p className='text-xs text-muted-foreground mt-1'>Sin historial suficiente para ubicarlo en su rango.</p>
      </div>
    )
  }
  const st = BAND_STYLE[b.verdict]
  // Posición del precio de hoy dentro de la barra low→high.
  const pos = b.high > b.low ? Math.min(100, Math.max(0, ((b.current - b.low) / (b.high - b.low)) * 100)) : 50
  const targetPos = b.high > b.low ? Math.min(100, Math.max(0, ((b.targetBuy - b.low) / (b.high - b.low)) * 100)) : 50

  return (
    <div className={`rounded-xl border p-4 ${st.box}`}>
      <div className='flex items-baseline justify-between gap-2'>
        <div>
          <div className='text-xs uppercase tracking-wide text-muted-foreground'>Precio del gear ahora (orden de compra)</div>
          <div className={`text-2xl font-bold tabular-nums ${v.goldEntry ? GOLD_PRICE : st.text}`}>{formatCopper(v.gearUnitBid)}</div>
          <div className='text-xs text-muted-foreground'>stack de {stackSize} = <span className='tabular-nums font-medium text-foreground'>{formatCopper(v.gearCostBuyOrder)}</span></div>
          <GoldCaption v={v} />
        </div>
        <div className='text-right'>
          <div className={`text-sm font-medium ${st.text}`}>{st.label}</div>
          <div className='text-xs text-muted-foreground tabular-nums'>percentil {(b.percentile * 100).toFixed(0)} de {b.days}d</div>
        </div>
      </div>

      {/* Barra de rango: dónde cae hoy y dónde está el objetivo de compra */}
      <div className='mt-3'>
        <div className='relative h-2 rounded-full bg-gradient-to-r from-emerald-400/70 via-muted to-amber-400/70'>
          <div className='absolute -top-1 h-4 w-0.5 bg-foreground rounded' style={{ left: `${pos}%` }} title={`hoy ${formatCopper(b.current)}`} />
          <div className='absolute -top-0.5 h-3 w-0.5 bg-emerald-600 rounded opacity-70' style={{ left: `${targetPos}%` }} title={`objetivo ${formatCopper(b.targetBuy)}`} />
        </div>
        <div className='flex justify-between text-[10px] text-muted-foreground tabular-nums mt-1'>
          <span>{formatCopper(b.low)}</span>
          <span>media {formatCopper(Math.round(b.avg))}</span>
          <span>{formatCopper(b.high)}</span>
        </div>
      </div>

      <p className='text-xs mt-2 leading-snug'>
        Poné la orden en <strong className='tabular-nums'>{formatCopper(b.targetBuy)}</strong> — el cuartil barato de los últimos {b.days} días.
        A ese precio el stack te sale <span className='tabular-nums font-medium'>{formatCopper(v.bandStackTarget)}</span>
        {v.bandStackTarget < v.gearCostBuyOrder && (
          <span className='text-emerald-600 dark:text-emerald-400'> ({formatCopper(v.gearCostBuyOrder - v.bandStackTarget)} menos por stack que hoy)</span>
        )}.
      </p>
      <p className='text-xs mt-1.5 leading-snug border-t pt-1.5'>
        Comprando ahí, la ganancia por stack sería{' '}
        <strong className={`tabular-nums ${v.profitAtTarget > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {v.profitAtTarget >= 0 ? '+' : ''}{formatCopper(v.profitAtTarget)}
        </strong>
        {v.profitAtTarget > 0 && v.profitOptimized <= 0 && (
          <span className='text-muted-foreground'> — o sea que el negocio no está roto, el gear está caro. Poné órdenes y esperá a que bajen.</span>
        )}
        {v.profitAtTarget <= 0 && (
          <span className='text-muted-foreground'> — ni al precio bueno de los últimos {b.days} días da ganancia. Ojo acá.</span>
        )}
      </p>
    </div>
  )
}

/**
 * Timing semanal: el gear tiene su día barato y la canasta de materiales de
 * salida tiene su día caro. Comprar en uno y liquidar en el otro suma sobre
 * la ganancia base sin trabajar más.
 */
function WeeklyTiming({ v }: { v: VariantView }) {
  const buy = v.gearWeekly
  const sell = v.basketWeekly
  if (!buy && !sell) return null

  return (
    <div className='rounded-xl border p-4'>
      <div className='text-xs uppercase tracking-wide text-muted-foreground mb-2'>Timing semanal — comprar barato, liquidar caro</div>

      {buy && sell && (
        <p className='text-sm mb-3 leading-snug'>
          Comprá el gear el <strong className='text-emerald-600 dark:text-emerald-400'>{buy.cheapestLabel}</strong> y liquidá los materiales el{' '}
          <strong className='text-amber-600 dark:text-amber-500'>{sell.richestLabel}</strong>
          <span className='text-muted-foreground'> — el ciclo suma ~{((buy.spreadPct + sell.spreadPct) * 100).toFixed(1)}% sobre la ganancia base sin trabajo extra.</span>
        </p>
      )}

      <div className='grid gap-3 sm:grid-cols-2'>
        {buy && (
          <div>
            <div className='text-[11px] font-medium mb-1'>
              Gear — comprá <span className='text-emerald-600 dark:text-emerald-400'>{buy.cheapestLabel}</span>
            </div>
            <WeekBars stat={buy} />
            <div className='flex items-center justify-between text-[10px] mt-1'>
              <span className='tabular-nums text-muted-foreground'>edge {(buy.spreadPct * 100).toFixed(2)}%</span>
              {buy.weeks >= 2 && (
                <span className='inline-flex items-center gap-1 text-muted-foreground'>
                  <ConsistencyDot v={buy.consistency} /> {(buy.consistency * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        )}
        {sell && (
          <div>
            <div className='text-[11px] font-medium mb-1'>
              Materiales — vendé <span className='text-amber-600 dark:text-amber-500'>{sell.richestLabel}</span>
            </div>
            <WeekBars stat={sell} />
            <div className='flex items-center justify-between text-[10px] mt-1'>
              <span className='tabular-nums text-muted-foreground'>edge {(sell.spreadPct * 100).toFixed(2)}%</span>
              {sell.weeks >= 2 && (
                <span className='inline-flex items-center gap-1 text-muted-foreground'>
                  <ConsistencyDot v={sell.consistency} /> {(sell.consistency * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      <p className='text-[10px] text-muted-foreground mt-2 leading-snug'>
        La canasta de materiales pondera cada mat por lo que aporta a un stack, así que su día caro es el de tu ingreso real, no el de un material suelto.
      </p>
    </div>
  )
}

/**
 * Compra directa (instant-buy al ask, sin esperar a que llenen la orden). El
 * buy order tarda y a veces te cortan por +1c, pero si el ask de hoy ya deja
 * ganancia no hay nada que esperar — se compra ya, listado o no.
 */
function InstantBuyAlert({ v, stackSize, comodo }: { v: VariantView; stackSize: number; comodo: number }) {
  const profitInstant = v.incomeChosen - v.gearCostInstant
  const profitInstantOptimized = v.incomeOptimized - v.gearCostInstant
  const conviene = profitInstant > 0
  const showEctoMargin = !v.dustEnabled
  const instantStatus = ectoStatus(v, v.gearCostInstant, comodo)
  const targetUnit = unitPriceForMargin(v, stackSize, comodo)

  return (
    <div className={`rounded-xl border-2 p-4 ${conviene ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : 'border-dashed'}`}>
      <div className='flex items-center justify-between gap-3 flex-wrap'>
        <div>
          <div className={`text-xs uppercase tracking-wide font-semibold ${conviene ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            Compra directa — instantánea, sin esperar orden
          </div>
          <div className='text-xs text-muted-foreground mt-0.5'>
            Precio de compra instantánea: <span className={`tabular-nums font-medium ${v.goldEntry ? GOLD_PRICE : 'text-foreground'}`}>{formatCopper(v.gearUnitAsk)}</span>
            {' '}· stack de {stackSize} = <span className='tabular-nums font-medium text-foreground'>{formatCopper(v.gearCostInstant)}</span>
          </div>
          <GoldCaption v={v} />
        </div>
        {conviene && (
          <span className='text-xs px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold uppercase tracking-wide'>Comprá YA</span>
        )}
      </div>
      <div className='grid grid-cols-2 gap-4 mt-3'>
        <div>
          <div className={`text-2xl font-bold tabular-nums ${profitInstant >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {profitInstant >= 0 ? '+' : ''}{formatCopper(profitInstant)}
          </div>
          <div className='text-[11px] text-muted-foreground'>sin craftear</div>
        </div>
        <div>
          <div className={`text-lg font-semibold tabular-nums ${profitInstantOptimized >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {profitInstantOptimized >= 0 ? '+' : ''}{formatCopper(profitInstantOptimized)}
          </div>
          <div className='text-[11px] text-muted-foreground'>crafteando óptimo</div>
        </div>
      </div>
      <p className='text-xs mt-2 leading-snug'>
        {conviene
          ? 'Al precio de venta de hoy ya deja ganancia sin esperar a que llenen ninguna orden — comprá al instante, no hace falta pelear el bid.'
          : 'Hoy comprar al instante no deja ganancia: mejor esperar a que se llene la orden de compra (arriba).'}
      </p>
      {showEctoMargin && (
        <div className='text-[11px] mt-2 pt-2 border-t leading-snug'>
          <span className='text-muted-foreground'>Piso de ectos comprando instantáneo: </span>
          <span className={instantStatus.tone}>{instantStatus.text}</span>
          <span className='text-muted-foreground'> — para mantener {ectoFmt(comodo)} de margen, comprá hasta el precio </span>
          <span className='text-amber-600 dark:text-amber-400 tabular-nums text-sm'>{silverDecimal(targetUnit)}</span>
          <span className='text-muted-foreground'> (plata.cobre, stack de {stackSize} = </span>
          <strong className='text-foreground tabular-nums'>{formatCopper(targetUnit * stackSize)}</strong>
          <span className='text-muted-foreground'>), redondeado para arriba.</span>
        </div>
      )}
    </div>
  )
}

function VariantSection({ v, stackSize, bestPromo }: { v: VariantView; stackSize: number; bestPromo?: PromoRow }) {
  const rows = useMemo(() => [...v.materialRows].sort((a, b) => b.subtotalNet - a.subtotalNet), [v.materialRows])
  const rentable = v.profitChosen > 0
  const accion = v.dustEnabled ? (v.useDust ? 'procesarlos' : 'venderlos (los ectos directo, hoy no conviene procesar)') : 'venderlos (ectos directo)'

  // Umbral "cómodo" ajustable en vivo — el verde sobra por decenas de miles y
  // se procesa sin fricción, pero el amarillo es escaso: cuánto margen pedís
  // antes de competir por uno depende del día (cuánta pelea de +1c hay) y no
  // de un número fijo. Se ajusta acá y afecta a todo lo de abajo (el piso de
  // la tabla, el simulador y la compra directa).
  const [comodo, setComodo] = useState(ECTO_MARGIN_COMODO_DEFAULT)
  const ectoNet = v.ectoAsk * (1 - UNID.tpCut)
  const comodoGold = comodo * ectoNet

  return (
    <>
      {!v.dustEnabled && (
        <div className='flex items-center gap-2 flex-wrap text-xs rounded-lg border px-3 py-2 bg-muted/20'>
          <span className='text-muted-foreground'>Margen cómodo para competir por amarillos:</span>
          <input
            type='number'
            min={0}
            step={0.5}
            value={comodo}
            onChange={(e) => setComodo(Math.max(0, Number(e.target.value) || 0))}
            className='w-16 rounded border px-1.5 py-0.5 text-xs tabular-nums text-right bg-background'
          />
          <span className='text-muted-foreground'>ectos</span>
          <span className='text-muted-foreground'>
            ≈ <strong className='text-foreground tabular-nums'>{formatCopper(comodoGold)}</strong> por stack a precio de hoy
          </span>
        </div>
      )}

      {/* Compra directa — solo el amarillo: el verde es abundante, no hace falta pelear por conseguirlo */}
      {!v.dustEnabled && <InstantBuyAlert v={v} stackSize={stackSize} comodo={comodo} />}

      {/* Veredicto */}
      <div className={`rounded-xl border p-4 ${rentable ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40'}`}>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>Ganancia por stack — sin craftear</div>
            <div className={`text-2xl font-bold tabular-nums ${rentable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{v.profitChosen >= 0 ? '+' : ''}{formatCopper(v.profitChosen)}</div>
          </div>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>Ganancia por stack — crafteando óptimo</div>
            <div className={`text-2xl font-bold tabular-nums ${v.profitOptimized > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{v.profitOptimized >= 0 ? '+' : ''}{formatCopper(v.profitOptimized)}</div>
          </div>
        </div>
        <p className='text-sm mt-2'>
          {rentable ? `Sí conviene comprarlos y ${accion} por stack de ${stackSize}.` : 'No dejan ganancia ahora mismo (el gear cuesta más de lo que rinde).'}
        </p>
      </div>

      {/* Simulador de bid — solo el amarillo: el verde se gana fácil, no hay pelea de +1c */}
      {!v.dustEnabled && <PriceSimulator v={v} stackSize={stackSize} comodo={comodo} />}

      {/* Ruta de salida: procesar a dust vs vender ectos — solo aplica al verde */}
      <RutaSalida v={v} />

      {/* Cazador de precios + timing semanal */}
      <div className='grid gap-3 lg:grid-cols-2'>
        <PriceHunter v={v} stackSize={stackSize} />
        <WeeklyTiming v={v} />
      </div>

      {/* Resumen ingreso vs costo */}
      <div className={`grid grid-cols-2 gap-3 ${v.dustEnabled ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <Stat label={v.dustEnabled ? `Ingreso — ${v.routeLabel}` : 'Ingreso — vendiendo ectos'} value={formatCopper(v.incomeChosen)} />
        <Stat label='Ingreso — crafteando óptimo' value={formatCopper(v.incomeOptimized)} strong />
        <Stat label={`Costo — orden de compra (${stackSize})`} value={formatCopper(v.gearCostBuyOrder)} />
        {v.dustEnabled && (
          <Stat label={v.useDust ? 'Si vendieras ectos directo' : 'Si procesaras a dust'} value={formatCopper(v.useDust ? v.incomeEcto : v.incomeDust)} muted />
        )}
      </div>

      {/* Tabla de materiales con columna craft */}
      <div className='rounded-xl border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
              <th className='text-right px-4 py-2.5 font-medium w-24'>Cantidad</th>
              <th className='text-left px-3 py-2.5 font-medium'>Material</th>
              <th className='text-right px-4 py-2.5 font-medium'>Vender −15%</th>
              <th className='text-left px-4 py-2.5 font-medium'>Craftear</th>
              <th className='text-right px-4 py-2.5 font-medium'>Mejor acción</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {v.dustEnabled ? (
              <>
                {/* Crystalline Dust — resaltado solo si hoy conviene procesar */}
                <tr className={v.useDust ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'text-muted-foreground'}>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${v.useDust ? '' : 'line-through'}`}>{qtyFmt(v.dustRow.qty)}</td>
                  <td className='px-3 py-2.5'>
                    <div className='flex items-center gap-2'>
                      <ItemIcon src={v.dustRow.icon} alt={v.dustRow.name} />
                      <span className={v.useDust ? 'font-medium' : 'line-through'}>{v.dustRow.name}</span>
                      {v.useDust && <span className='text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase tracking-wide'>mejor hoy</span>}
                    </div>
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${v.useDust ? 'font-semibold' : 'line-through'}`}>{formatCopper(v.dustRow.subtotalNet)}</td>
                  <td className='px-4 py-2.5 text-xs text-muted-foreground' colSpan={2}>
                    {v.useDust ? `Mejor: promover a T6 ↓ (${bestPromo ? `${bestPromo.t6Name}, +${formatCopper(bestPromo.profitPerShard)}/shard` : '—'})` : ''}
                  </td>
                </tr>
                {/* Ecto — resaltado si hoy conviene vender directo */}
                <tr className={v.useDust ? 'text-muted-foreground' : 'bg-emerald-50/60 dark:bg-emerald-950/20'}>
                  <td className={`px-4 py-2 text-right tabular-nums ${v.useDust ? 'line-through' : 'font-medium'}`}>{qtyFmt(v.ectos)}</td>
                  <td className='px-3 py-2'>
                    <div className='flex items-center gap-2'>
                      <ItemIcon src={v.ectoRow.icon} alt={v.ectoRow.name} />
                      <span className={v.useDust ? 'line-through' : 'font-medium'}>{v.ectoRow.name}</span>
                      <span className='text-[10px]'>{v.ectoNote}</span>
                      {!v.useDust && <span className='text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase tracking-wide'>mejor hoy</span>}
                    </div>
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${v.useDust ? 'line-through' : 'font-semibold'}`}>{formatCopper(v.ectoRow.subtotalNet)}</td>
                  <td className='px-4 py-2' colSpan={2}></td>
                </tr>
              </>
            ) : (
              /* El amarillo no procesa: se vende el ecto directo, sin comparación con dust. */
              <tr className='bg-emerald-50/60 dark:bg-emerald-950/20'>
                <td className='px-4 py-2.5 text-right tabular-nums font-medium'>{qtyFmt(v.ectos)}</td>
                <td className='px-3 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <ItemIcon src={v.ectoRow.icon} alt={v.ectoRow.name} />
                    <span className='font-medium'>{v.ectoRow.name}</span>
                    <span className='text-[10px] text-muted-foreground'>{v.ectoNote}</span>
                  </div>
                  {(() => {
                    const margen = Math.round((v.ectos - v.ectosBreakeven) * 100) / 100
                    const tone = ectoMarginTone(margen, comodo)
                    return (
                      <div className='text-[10px] text-muted-foreground mt-0.5'>
                        Piso para salir tablas hoy: <strong className={tone}>{ectoFmt(v.ectosBreakeven)} ectos</strong> (<span className={tone}>{ectoMarginLabel(margen, comodo)}</span>)
                      </div>
                    )
                  })()}
                </td>
                <td className='px-4 py-2.5 text-right tabular-nums font-semibold'>{formatCopper(v.ectoRow.subtotalNet)}</td>
                <td className='px-4 py-2.5 text-xs text-muted-foreground' colSpan={2}>Se vende directo — no se procesa (el dust se queda semanas pegado).</td>
              </tr>
            )}
            {/* Materiales */}
            {rows.map((r) => (
              <tr key={r.id} className={r.craft?.isBetter ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}>
                <td className='px-4 py-2 text-right tabular-nums'>{qtyFmt(r.qty)}</td>
                <td className='px-3 py-2'>
                  <div className='flex items-center gap-2'>
                    <ItemIcon src={r.icon} alt={r.name} />
                    <span>{r.name}</span>
                  </div>
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${r.craft?.isBetter ? 'text-muted-foreground' : ''}`}>{formatCopper(r.subtotalNet)}</td>
                <td className='px-4 py-2 text-xs'>
                  {r.craft ? (
                    <div className='flex items-center gap-1.5 text-muted-foreground'>
                      <span>{r.craft.inputPer}→1</span>
                      <ItemIcon src={r.craft.outputIcon} alt={r.craft.outputName} size={16} />
                      <span className={`tabular-nums ${r.craft.isBetter ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>{formatCopper(r.craft.subtotalNet)}</span>
                    </div>
                  ) : (
                    <span className='text-muted-foreground/40'>—</span>
                  )}
                </td>
                <td className='px-4 py-2 text-right'>
                  {r.craft?.isBetter ? (
                    <span className='text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase tracking-wide'>Craftear +{formatCopper(r.craft.subtotalNet - r.subtotalNet)}</span>
                  ) : (
                    <span className='text-[10px] text-muted-foreground uppercase tracking-wide'>Vender</span>
                  )}
                </td>
              </tr>
            ))}
            {/* Suerte (Essence of Luck) — solo verdes */}
            {v.luckValueCopper > 0 && (
              <tr className='bg-amber-50/50 dark:bg-amber-950/10'>
                <td className='px-4 py-2 text-right tabular-nums text-amber-700 dark:text-amber-500'>✦</td>
                <td className='px-3 py-2'>
                  <span className='font-medium'>Suerte (Essence of Luck)</span>
                  <span className='text-[10px] text-muted-foreground ml-1.5'>los verdes sueltan mucha; ~duplica la ganancia base</span>
                </td>
                <td className='px-4 py-2 text-right tabular-nums text-amber-700 dark:text-amber-500 font-medium'>+{formatCopper(v.luckValueCopper)}</td>
                <td className='px-4 py-2' colSpan={2}></td>
              </tr>
            )}
            {/* Costos de salvage */}
            {v.salvageLines.map((l) => (
              <tr key={l.label} className='text-muted-foreground'>
                <td className='px-4 py-2 text-right tabular-nums'>{qtyFmt(l.uses)}</td>
                <td className='px-3 py-2'>Costo {l.label} ({l.costPerUse}c × salvage)</td>
                <td className='px-4 py-2 text-right tabular-nums text-red-500'>−{formatCopper(l.subtotal)}</td>
                <td className='px-4 py-2' colSpan={2}></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className='border-t-2 bg-muted/40 font-semibold'>
              <td></td>
              <td className='px-3 py-2.5'>
                Ingreso total ({v.dustEnabled ? v.routeLabel : 'vendiendo ectos'}{v.luckValueCopper > 0 ? ' + suerte' : ''})
              </td>
              <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(v.incomeChosen)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Ganancia por hora — cada stack tarda ~45s en procesarse, sea amarillo o verde, así que el techo real es el tiempo, no una meta de stacks. */}
      {(() => {
        const ok = v.profitPerHourCraft > 0
        const sign = (n: number) => (n >= 0 ? '+' : '')
        const tone = ok
          ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20'
          : 'border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20'
        const head = ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
        const big = ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        const small = ok ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-red-600/80 dark:text-red-400/80'
        return (
          <div className={`rounded-xl border-2 p-4 ${tone}`}>
            <div className={`text-xs uppercase tracking-wide font-medium ${head}`}>
              Ganancia por hora — comprar y {v.dustEnabled ? v.routeLabel : 'vender'} ~{v.stacksPerHour} stacks/h ({v.gearUnitsPerHour.toLocaleString('es-MX')} {v.label.split(' ')[0].toLowerCase()})
            </div>
            {/* Mismo orden que el veredicto de arriba: sin craftear primero, después crafteando. */}
            <div className='grid grid-cols-2 gap-4 mt-1.5'>
              <div>
                <div className={`text-2xl font-bold tabular-nums ${small}`}>{sign(v.profitPerHourNoCraft)}{formatCopper(v.profitPerHourNoCraft)}</div>
                <div className='text-xs text-muted-foreground'>sin craftear ({v.dustEnabled ? v.routeLabel : 'vendiendo ectos'})</div>
              </div>
              <div>
                <div className={`text-3xl font-bold tabular-nums ${big}`}>{sign(v.profitPerHourCraft)}{formatCopper(v.profitPerHourCraft)}</div>
                <div className='text-xs text-muted-foreground'>crafteando lo óptimo</div>
              </div>
            </div>
            <div className='text-[11px] text-muted-foreground mt-2'>
              Ganancia neta por hora (ya descontado el gear: {formatCopper(v.gearCostPerHour)}). Diferencia craft vs no-craft ={' '}
              <strong>{formatCopper(v.profitPerHourCraft - v.profitPerHourNoCraft)}</strong> extra por hora por hacer el crafteo.
              {!ok && (
                <> Hoy da <strong>negativo</strong> porque el gear está caro — mirá el precio objetivo de arriba antes de comprar.</>
              )}
            </div>
          </div>
        )
      })()}
    </>
  )
}

export default function UnidentifiedClient({ view: v }: { view: UnidView }) {
  const [sel, setSel] = useState<VariantView['key']>(v.variants[0]?.key ?? 'rare')
  const variant = v.variants.find((x) => x.key === sel) ?? v.variants[0]
  const bestPromo = v.promoRows[0]

  return (
    <div className='p-6 space-y-5 max-w-[1050px]'>
      <div className='max-w-3xl'>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='text-lg font-semibold'>Unidentified Gear — ¿conviene procesar?</h1>
          <AutoRefresh segundos={60} />
        </div>
        <p className='text-sm text-muted-foreground mt-0.5'>
          Abrir el gear y salvagear todo. El amarillo da tanto ecto que procesarlo a dust lo deja semanas pegado en el TP, así que se vende directo; el verde apenas da ectos y ahí sí conviene decidir <strong>procesar o vender</strong> según el precio de hoy. Cada material se evalúa además: <strong>vender crudo o craftear</strong> una versión más cara. Elegí la rareza:
        </p>
      </div>

      {/* Toggle rareza */}
      <div className='flex items-center gap-2'>
        {v.variants.map((x) => (
          <button
            key={x.key}
            onClick={() => setSel(x.key)}
            className={`px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-colors ${sel === x.key ? 'bg-foreground text-background border-foreground' : 'hover:bg-muted'}`}>
            {x.label}
          </button>
        ))}
      </div>

      <VariantSection v={variant} stackSize={v.stackSize} bestPromo={bestPromo} />

      {/* Promoción de Crystalline Dust a T6 — solo tiene sentido si tenés dust a mano (verde, o de otra fuente como metas) */}
      {sel === 'green' && (
      <div className='pt-2'>
        <h2 className='text-base font-semibold'>Promover {v.dustPerStack} Crystalline Dust a T6</h2>
        <p className='text-sm text-muted-foreground mt-0.5 mb-3 max-w-3xl'>
          Si te queda dust a mano (de esta ruta, de metas como Dragonfall, etc.), en vez de dumpearlo crudo (inunda el TP) metelo en la Mystic Forge: <strong>1 T6 + {v.promoT5Per} T5 + {v.promoDustPer} dust + {v.promoPhilStonePer} Philosopher&apos;s Stone → ~{v.promoYield} T6</strong>. Con <strong>{v.dustPerStack} dust</strong> alcanzan <strong>{v.promoCrafts} recetas</strong> → comprá <strong>{v.promoT5Stacks250} stacks de 250</strong> del T5 + <strong>{v.promoCrafts} semillas</strong> del T6, y gastá <strong>{v.promoShards} spirit shards</strong> (5 Philosopher&apos;s Stone × {v.promoCrafts} = {v.promoCrafts * 5} stones ÷ 10). La ganancia ya descuenta el dust a precio de mercado.
        </p>
        {bestPromo && bestPromo.profitStack > 0 && (
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 px-4 py-2.5 mb-3 text-sm flex items-center gap-2 flex-wrap'>
            <span className='text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wide'>Recomendado</span>
            <ItemIcon src={bestPromo.t6Icon} alt={bestPromo.t6Name} size={20} />
            <strong>{bestPromo.t6Name}</strong>
            <span className='text-muted-foreground'>— <strong className='text-emerald-600 dark:text-emerald-400'>+{formatCopper(bestPromo.profitStack)}</strong> con {v.dustPerStack} dust · comprá {bestPromo.t5Stacks} stacks de 250 de <strong>{bestPromo.t5Name}</strong> · {v.promoShards} spirit shards</span>
          </div>
        )}
        <div className='rounded-xl border overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
                <th className='text-left px-3 py-2.5 font-medium'>Resultado (~{v.promoYield} c/receta)</th>
                <th className='text-left px-4 py-2.5 font-medium'>Comprar (stacks de 250)</th>
                <th className='text-right px-4 py-2.5 font-medium'>Inversión</th>
                <th className='text-right px-4 py-2.5 font-medium'>Ganancia ({v.dustPerStack} dust)</th>
                <th className='text-right px-4 py-2.5 font-medium'>Oro / shard</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {v.promoRows.map((p, i) => (
                <tr key={p.t6Id} className={i === 0 && p.profitStack > 0 ? 'bg-emerald-50/40 dark:bg-emerald-950/15' : ''}>
                  <td className='px-3 py-2.5'>
                    <div className='flex items-center gap-2'>
                      <ItemIcon src={p.t6Icon} alt={p.t6Name} />
                      <span className='font-medium'>{p.t6Name}</span>
                    </div>
                  </td>
                  <td className='px-4 py-2.5 text-xs'>
                    <span className='font-medium'>{p.t5Stacks} ×</span> <span className='text-muted-foreground'>{p.t5Name}</span>
                  </td>
                  <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{formatCopper(p.investStack)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${p.profitStack > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{p.profitStack >= 0 ? '+' : ''}{formatCopper(p.profitStack)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${p.profitPerShard > 0 ? '' : 'text-red-500'}`}>{formatCopper(p.profitPerShard)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className='text-xs text-muted-foreground mt-2'>«Inversión» = el oro a frontear en T5 + semillas ({v.promoCrafts * v.promoT5Per} T5 + {v.promoCrafts} semillas); el dust ya lo tenés. «Ganancia» = lo que ganás <em>además</em> de vender esos {v.dustPerStack} dust crudos ({formatCopper(v.dustSellUnitNet)}/u). Si es negativa, conviene vender el dust crudo.</p>
      </div>
      )}

      <p className='text-xs text-muted-foreground'>
        Materiales valuados a precio de venta (ask) −15% del TP; el gear se costea por orden de compra. Ratios de refinamiento y promoción verificados contra la wiki y las recetas sincronizadas. Rendimientos = promedios; precios en vivo. Philosopher&apos;s Stones = spirit shards (sin costo en oro).
      </p>
    </div>
  )
}

function Stat({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className='rounded-lg border px-3 py-2'>
      <div className='text-[11px] text-muted-foreground leading-tight'>{label}</div>
      <div className={`tabular-nums mt-0.5 ${strong ? 'text-base font-semibold' : muted ? 'text-sm text-muted-foreground' : 'text-sm font-medium'}`}>{value}</div>
    </div>
  )
}
