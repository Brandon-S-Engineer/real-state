'use client'

import { useMemo } from 'react'
import { formatCopper } from '@/lib/gw2/format'

export type MatRow = {
  id: number
  name: string
  icon: string | null
  qty: number
  sellUnitNet: number
  subtotalNet: number
}

export type UnidView = {
  stackSize: number
  materialRows: MatRow[]
  dustRow: MatRow
  ectoRow: MatRow
  ectos: number
  salvageCost: number
  materialsSubtotal: number
  incomeDust: number
  incomeEcto: number
  gearCostBuyOrder: number
  gearCostInstant: number
  profitDust: number
  profitEcto: number
  profitDustInstant: number
  sigilBonusFull: number
  sigilBonus: { qty: number; bonus: number }[]
}

function ItemIcon({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className='h-6 w-6 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={24} height={24} className='h-6 w-6 rounded shrink-0' loading='lazy' />
}

function qtyFmt(n: number) {
  return n % 1 === 0 ? n.toLocaleString('es-MX') : n.toLocaleString('es-MX', { maximumFractionDigits: 3 })
}

export default function UnidentifiedClient({ view: v }: { view: UnidView }) {
  const rows = useMemo(() => [...v.materialRows].sort((a, b) => b.subtotalNet - a.subtotalNet), [v.materialRows])
  const rentable = v.profitDust > 0
  const profitConSellos = v.profitDust + v.sigilBonusFull

  return (
    <div className='p-6 space-y-5 max-w-[1000px]'>
      <div className='max-w-3xl'>
        <h1 className='text-lg font-semibold'>Unidentified Gear — ¿conviene procesar el amarillo?</h1>
        <p className='text-sm text-muted-foreground mt-0.5'>
          Comprar <strong>Rare Unidentified Gear</strong> por orden de compra, abrirlo y salvagear todo con el Silver-Fed. La corrección clave: los ectos <strong>no se venden directo</strong> — se procesan a <strong>Crystalline Dust</strong> (222.75 ectos × 1.85 = {qtyFmt(v.dustRow.qty)} dust), que deja más oro. Se compara el valor de procesar un stack de {v.stackSize} contra su precio de compra en vivo.
        </p>
      </div>

      {/* Veredicto */}
      <div className={`rounded-xl border p-4 ${rentable ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40'}`}>
        <div className='flex items-baseline justify-between gap-4 flex-wrap'>
          <div>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>Ganancia por procesar un stack de {v.stackSize}</div>
            <div className={`text-2xl font-bold tabular-nums ${rentable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {v.profitDust >= 0 ? '+' : ''}{formatCopper(v.profitDust)}
            </div>
          </div>
          <div className='text-right'>
            <div className='text-xs uppercase tracking-wide text-muted-foreground'>Con sellos extraídos (+{formatCopper(v.sigilBonusFull)})</div>
            <div className={`text-2xl font-bold tabular-nums ${profitConSellos > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {profitConSellos >= 0 ? '+' : ''}{formatCopper(profitConSellos)}
            </div>
          </div>
        </div>
        <p className='text-sm mt-2'>
          {rentable
            ? 'Sí conviene procesarlos: el valor de los materiales (con dust) supera el costo de comprar el stack.'
            : 'No conviene procesarlos ahora mismo: comprar el stack cuesta más de lo que rinden los materiales.'}
        </p>
      </div>

      {/* Resumen ingreso vs costo */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <Stat label='Ingreso al procesar (con dust)' value={formatCopper(v.incomeDust)} strong />
        <Stat label={`Costo — orden de compra (${v.stackSize})`} value={formatCopper(v.gearCostBuyOrder)} />
        <Stat label={`Costo — compra instant (ask ${v.stackSize})`} value={formatCopper(v.gearCostInstant)} muted />
        <Stat label='Ingreso si vendieras ectos directo' value={formatCopper(v.incomeEcto)} muted />
      </div>

      {/* Tabla de materiales (réplica del calculador, con dust en vez de ectos) */}
      <div className='rounded-xl border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
              <th className='text-right px-4 py-2.5 font-medium w-28'>Cantidad</th>
              <th className='text-left px-3 py-2.5 font-medium'>Material</th>
              <th className='text-right px-4 py-2.5 font-medium'>Venta −15% (u)</th>
              <th className='text-right px-4 py-2.5 font-medium'>Subtotal / stack</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {/* Crystalline Dust — la corrección, resaltada */}
            <tr className='bg-emerald-50/60 dark:bg-emerald-950/20'>
              <td className='px-4 py-2.5 text-right tabular-nums font-medium'>{qtyFmt(v.dustRow.qty)}</td>
              <td className='px-3 py-2.5'>
                <div className='flex items-center gap-2'>
                  <ItemIcon src={v.dustRow.icon} alt={v.dustRow.name} />
                  <span className='font-medium'>{v.dustRow.name}</span>
                  <span className='text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase tracking-wide'>ectos procesados</span>
                </div>
              </td>
              <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{formatCopper(v.dustRow.sellUnitNet)}</td>
              <td className='px-4 py-2.5 text-right tabular-nums font-semibold'>{formatCopper(v.dustRow.subtotalNet)}</td>
            </tr>
            {/* Ecto — comparación, en gris tachado */}
            <tr className='text-muted-foreground'>
              <td className='px-4 py-2 text-right tabular-nums line-through'>{qtyFmt(v.ectos)}</td>
              <td className='px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <ItemIcon src={v.ectoRow.icon} alt={v.ectoRow.name} />
                  <span className='line-through'>{v.ectoRow.name}</span>
                  <span className='text-[10px]'>si los vendieras directo</span>
                </div>
              </td>
              <td className='px-4 py-2 text-right tabular-nums'>{formatCopper(v.ectoRow.sellUnitNet)}</td>
              <td className='px-4 py-2 text-right tabular-nums line-through'>{formatCopper(v.ectoRow.subtotalNet)}</td>
            </tr>
            {/* Resto de materiales */}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className='px-4 py-2 text-right tabular-nums'>{qtyFmt(r.qty)}</td>
                <td className='px-3 py-2'>
                  <div className='flex items-center gap-2'>
                    <ItemIcon src={r.icon} alt={r.name} />
                    <span>{r.name}</span>
                  </div>
                </td>
                <td className='px-4 py-2 text-right tabular-nums text-muted-foreground'>{formatCopper(r.sellUnitNet)}</td>
                <td className='px-4 py-2 text-right tabular-nums'>{formatCopper(r.subtotalNet)}</td>
              </tr>
            ))}
            {/* Costo salvage */}
            <tr className='text-muted-foreground'>
              <td className='px-4 py-2 text-right tabular-nums'>{v.stackSize}</td>
              <td className='px-3 py-2'>Costo Silver-Fed (60c × salvage)</td>
              <td className='px-4 py-2 text-right tabular-nums'>−{formatCopper(60)}</td>
              <td className='px-4 py-2 text-right tabular-nums text-red-500'>−{formatCopper(v.salvageCost)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className='border-t-2 bg-muted/40 font-semibold'>
              <td></td>
              <td className='px-3 py-2.5'>Ingreso total al procesar (con dust)</td>
              <td></td>
              <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(v.incomeDust)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Diferencia dust vs ecto */}
      <div className='rounded-xl border p-4 text-sm'>
        <div className='font-medium mb-1'>Por qué dust y no ecto</div>
        <p className='text-muted-foreground'>
          Valuar los ectos directo da <span className='text-foreground tabular-nums'>{formatCopper(v.ectoRow.subtotalNet)}</span>; procesarlos a dust da{' '}
          <span className='text-foreground tabular-nums'>{formatCopper(v.dustRow.subtotalNet)}</span> — una diferencia de{' '}
          <span className='text-emerald-600 dark:text-emerald-400 font-medium tabular-nums'>{formatCopper(v.dustRow.subtotalNet - v.ectoRow.subtotalNet)}</span> por stack. Por eso la tabla estándar (con ectos) subestima la ganancia real.
        </p>
      </div>

      {/* Bonus de extraer sellos/runas */}
      <div className='rounded-xl border overflow-hidden'>
        <div className='px-4 py-3 border-b bg-muted/20'>
          <div className='text-sm font-medium'>Bonus por extraer sellos/runas antes de salvagear</div>
          <div className='text-xs text-muted-foreground mt-0.5'>Con el extractor infinito (gratis). ~{formatCopper(v.sigilBonusFull)} extra por stack de {v.stackSize}, prorrateado por múltiplos de 50 — para decidir si vale la pena el click extra.</div>
        </div>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide'>
              <th className='text-left px-4 py-2 font-medium'>Ítems extraídos</th>
              <th className='text-right px-4 py-2 font-medium'>Oro extra</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {v.sigilBonus.map((s) => (
              <tr key={s.qty}>
                <td className='px-4 py-2 tabular-nums'>{s.qty}</td>
                <td className='px-4 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium'>+{formatCopper(s.bonus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className='text-xs text-muted-foreground'>
        Materiales valuados a precio de venta (ask) −15% del TP, como el calculador de referencia. El gear se costea por orden de compra. Rendimientos de materiales = promedios empíricos por stack; precios en vivo del snapshot. El costo de salvagear los ectos a dust se ignora porque se cancela con la suerte (Lucent Motes) que suelta.
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
