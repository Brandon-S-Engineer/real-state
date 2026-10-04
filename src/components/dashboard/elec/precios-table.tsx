'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PriceTableRow } from '@/lib/electronicos/stats'
import { marginTarget } from '@/lib/electronicos/math'
import { CATEGORY_META, ConfidenceDot, configShort, downloadFile, money, moneyK, type Category } from './shared'

type SortKey = 'n' | 'buy' | 'sell' | 'margin' | 'exit' | 'days'

export default function ElecPreciosTable({
  category, rows, windowDays, fastSaleDays, onOpenConfig,
}: {
  category: Category
  rows: PriceTableRow[]
  windowDays: number
  fastSaleDays: number
  onOpenConfig: (configKey: string) => void
}) {
  const meta = CATEGORY_META[category]
  const [line, setLine] = useState('')
  const [q, setQ] = useState('')
  const [hideLow, setHideLow] = useState(true)
  // Los posts de grupos casi nunca traen RAM/SSD — filtrar esos grupos por
  // default deja la tabla casi vacía y esconde justo los grupos con más
  // muestra (línea+chip agrupa bien aunque falte RAM/SSD). Por eso arranca
  // mostrando todo; "Solo specs completos" es un filtro que el usuario prende.
  const [onlyComplete, setOnlyComplete] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'n', desc: true })

  const val = (r: PriceTableRow, k: SortKey) =>
    k === 'n' ? r.n
      : k === 'buy' ? r.buyPrice ?? -Infinity
        : k === 'sell' ? r.sellPrice ?? -Infinity
          : k === 'margin' ? r.margin ?? -Infinity
            : k === 'exit' ? r.exitPrice ?? -Infinity
              : r.avgDaysOnMarket ?? Infinity

  const filtered = useMemo(() => rows
    .filter((r) => !onlyComplete || !r.configKey.includes('?'))
    .filter((r) => !line || r.line === line)
    .filter((r) => !hideLow || r.confidence !== 'baja')
    .filter((r) => !q || configShort(r).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort.desc ? val(b, sort.key) - val(a, sort.key) : val(a, sort.key) - val(b, sort.key))),
  [rows, line, q, hideLow, onlyComplete, sort])

  const th = (label: string, key?: SortKey, title?: string, sub?: string) => (
    <th
      title={title}
      onClick={key ? () => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true })) : undefined}
      className={cn('px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap', key && 'cursor-pointer select-none')}
    >
      {label}{key && sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}
      {sub && <div className='text-[11px] font-normal text-muted-foreground/70'>{sub}</div>}
    </th>
  )

  const exportCsv = () => {
    const header = 'config,anuncios,confianza,compra_p25,venta_p75,margen,mediana,p10,p90,salida_rapida,salida_n,mediana_activos,dias_en_mercado'
    const lines = filtered.map((r) => [
      `"${configShort(r)}"`, r.n, r.confidence, r.buyPrice, r.sellPrice, r.margin, r.all.p50, r.all.p10, r.all.p90,
      r.exitPrice, r.exitN, r.activeMedian, r.avgDaysOnMarket,
    ].map((v) => v ?? '').join(','))
    downloadFile([header, ...lines].join('\n'), `precios-${category.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-2 items-center'>
        <Input placeholder='Buscar configuración...' value={q} onChange={(e) => setQ(e.target.value)} className='w-52' />
        <select value={line} onChange={(e) => setLine(e.target.value)} className='border rounded-md px-2 py-2 text-sm bg-background h-9'>
          <option value=''>Todos los modelos</option>
          {meta.lines.map((l) => <option key={l} value={l}>{meta.lineLabel[l]}</option>)}
        </select>
        <Button variant={hideLow ? 'default' : 'outline'} size='sm' onClick={() => setHideLow((v) => !v)}>
          Ocultar poca data
        </Button>
        {meta.hasStorage && <Button variant={onlyComplete ? 'default' : 'outline'} size='sm' onClick={() => setOnlyComplete((v) => !v)} title={meta.hasChip ? 'Ocultar grupos sin RAM o SSD conocidos (agrupados solo por línea+chip)' : 'Ocultar grupos sin almacenamiento conocido (agrupados solo por modelo)'}>
          Solo specs completos
        </Button>}
        <Button variant='outline' size='sm' className='ml-auto' onClick={exportCsv} disabled={!filtered.length}>CSV</Button>
      </div>

      <p className='text-xs text-muted-foreground'>
        Precios pedidos en toda la ciudad, últimos {windowDays} días.{' '}
        <strong className='text-foreground'>Compra</strong> = P25 (el 25% más barato; lo consigues contactando rápido) ·{' '}
        <strong className='text-foreground'>Venta</strong> = P75 (la parte alta; la justifican buen estado, caja y batería) ·{' '}
        <strong className='text-foreground'>Margen</strong> = venta − compra, en verde si alcanza la meta por equipo.
        Comprar abajo del P25 agranda el margen.
      </p>

      <div className='rounded-md border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50'>
              {th('Configuración')}
              {th('Anuncios', 'n', 'Anuncios con precio usable en la ventana — profundidad del mercado')}
              {th('Compra', 'buy', 'P25 de los precios pedidos', 'P25')}
              {th('Venta', 'sell', 'P75 de los precios pedidos', 'P75')}
              {th('Margen', 'margin', 'Venta − compra por equipo', 'por equipo')}
              {th('Rango', undefined, 'P10 · mediana · P90', 'P10 · mediana · P90')}
              {th('Salida rápida', 'exit', `Mediana de los que desaparecieron en menos de ${fastSaleDays} días`, `< ${fastSaleDays} días`)}
              {th('Días', 'days', 'Días promedio en el mercado', 'en mercado')}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className='px-4 py-12 text-center text-muted-foreground'>
                {rows.length ? 'Nada con esos filtros' : 'Aún no hay suficientes capturas para armar precios'}
              </td></tr>
            ) : filtered.map((r) => {
              const good = r.margin != null && r.sellPrice != null && r.margin >= marginTarget(r.line, r.sellPrice)
              return (
                <tr
                  key={r.configKey}
                  onClick={() => onOpenConfig(r.configKey)}
                  title='Ver listings de esta configuración'
                  className={cn('border-b hover:bg-muted/30 transition-colors cursor-pointer', r.confidence === 'baja' && 'opacity-50')}
                >
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2 font-medium whitespace-nowrap'>
                      <ConfidenceDot level={r.confidence} />
                      {configShort(r)}
                    </div>
                  </td>
                  <td className='px-4 py-3 text-muted-foreground'>{r.n}</td>
                  <td className='px-4 py-3 whitespace-nowrap font-medium'>{money(r.buyPrice)}</td>
                  <td className='px-4 py-3 whitespace-nowrap font-medium'>{money(r.sellPrice)}</td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    {r.margin == null ? '—' : (
                      <span className={cn('font-semibold', good ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>{money(r.margin)}</span>
                    )}
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap text-xs text-muted-foreground'>
                    {moneyK(r.all.p10)} · <span className='text-foreground'>{moneyK(r.all.p50)}</span> · {moneyK(r.all.p90)}
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    {r.exitPrice != null ? <span>{money(r.exitPrice)} <span className='text-xs text-muted-foreground'>n={r.exitN}</span></span> : <span className='text-muted-foreground'>—</span>}
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap text-muted-foreground' title={r.avgDaysSource === 'activos' ? 'Edad promedio de los activos (aún no hay desaparecidos)' : 'Promedio de los que desaparecieron'}>
                    {r.avgDaysOnMarket != null ? `${r.avgDaysOnMarket}d${r.avgDaysSource === 'activos' ? '+' : ''}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
