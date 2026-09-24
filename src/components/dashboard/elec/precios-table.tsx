'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PriceTableRow } from '@/lib/electronicos/stats'
import { ConfidenceDot, LINES, LINE_LABEL, configShort, downloadFile, money, moneyK } from './shared'

type SortKey = 'n' | 'spread' | 'buyMed' | 'sellMed' | 'exit' | 'days'

const BUDGET = { min: 25000, max: 35000, target: 2000 }

function Band({ b, fallbackNote }: { b: PriceTableRow['all']; fallbackNote?: boolean }) {
  if (!b.n) return <span className='text-muted-foreground text-xs'>sin data</span>
  return (
    <div className='whitespace-nowrap text-xs'>
      <span className='text-muted-foreground'>{moneyK(b.p10)}</span>
      <span className='mx-1 font-semibold text-sm text-foreground'>{moneyK(b.p50)}</span>
      <span className='text-muted-foreground'>{moneyK(b.p90)}</span>
      <span className='ml-1 text-muted-foreground/70'>n={b.n}{fallbackNote ? '' : ''}</span>
    </div>
  )
}

export default function ElecPreciosTable({
  rows, windowDays, fastSaleDays, onOpenConfig,
}: {
  rows: PriceTableRow[]
  windowDays: number
  fastSaleDays: number
  onOpenConfig: (configKey: string) => void
}) {
  const [line, setLine] = useState('')
  const [q, setQ] = useState('')
  const [hideLow, setHideLow] = useState(false)
  const [onlyBudget, setOnlyBudget] = useState(false)
  // Los posts de grupos casi nunca traen RAM/SSD — filtrar esos grupos por
  // default deja la tabla casi vacía y esconde justo los grupos con más
  // muestra (línea+chip agrupa bien aunque falte RAM/SSD). Por eso arranca
  // mostrando todo; "Solo specs completos" es un filtro que el usuario prende.
  const [onlyComplete, setOnlyComplete] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'n', desc: true })

  const val = (r: PriceTableRow, k: SortKey) =>
    k === 'n' ? r.n
      : k === 'spread' ? r.spread ?? -Infinity
        : k === 'buyMed' ? (r.buy.p50 ?? r.all.p50 ?? 0)
          : k === 'sellMed' ? (r.sell.p50 ?? r.all.p50 ?? 0)
            : k === 'exit' ? r.exitPrice ?? -Infinity
              : r.avgDaysOnMarket ?? Infinity

  const filtered = useMemo(() => rows
    .filter((r) => !onlyComplete || !r.configKey.includes('?'))
    .filter((r) => !line || r.line === line)
    .filter((r) => !hideLow || r.confidence !== 'baja')
    .filter((r) => !q || configShort(r).toLowerCase().includes(q.toLowerCase()))
    .filter((r) => {
      if (!onlyBudget) return true
      const buy = r.buy.n >= 2 ? r.buy.p25 : r.all.p25
      return buy != null && buy >= BUDGET.min && buy <= BUDGET.max
    })
    .sort((a, b) => (sort.desc ? val(b, sort.key) - val(a, sort.key) : val(a, sort.key) - val(b, sort.key))),
  [rows, line, q, hideLow, onlyBudget, onlyComplete, sort])

  const th = (label: string, key?: SortKey, title?: string) => (
    <th
      title={title}
      onClick={key ? () => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true })) : undefined}
      className={cn('px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap', key && 'cursor-pointer select-none')}
    >
      {label}{key && sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}
    </th>
  )

  const exportCsv = () => {
    const header = 'config,n,confianza,compra_p10,compra_p50,compra_p90,venta_p10,venta_p50,venta_p90,general_p25,general_p50,spread,spread_aprox,salida_probable,salida_n,mediana_activos,dias_en_mercado'
    const lines = filtered.map((r) => [
      `"${configShort(r)}"`, r.n, r.confidence, r.buy.p10, r.buy.p50, r.buy.p90, r.sell.p10, r.sell.p50, r.sell.p90,
      r.all.p25, r.all.p50, r.spread, r.spreadApprox, r.exitPrice, r.exitN, r.activeMedian, r.avgDaysOnMarket,
    ].map((v) => v ?? '').join(','))
    downloadFile([header, ...lines].join('\n'), `precios-macbook-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-2 items-center'>
        <Input placeholder='Buscar configuración...' value={q} onChange={(e) => setQ(e.target.value)} className='w-52' />
        <select value={line} onChange={(e) => setLine(e.target.value)} className='border rounded-md px-2 py-2 text-sm bg-background h-9'>
          <option value=''>Todos los modelos</option>
          {LINES.map((l) => <option key={l} value={l}>{LINE_LABEL[l]}</option>)}
        </select>
        <Button variant={onlyBudget ? 'default' : 'outline'} size='sm' onClick={() => setOnlyBudget((v) => !v)} title='Compra P25 entre $25k y $35k'>
          Mi presupuesto ($25–35k)
        </Button>
        <Button variant={hideLow ? 'default' : 'outline'} size='sm' onClick={() => setHideLow((v) => !v)}>
          Ocultar poca data
        </Button>
        <Button variant={onlyComplete ? 'default' : 'outline'} size='sm' onClick={() => setOnlyComplete((v) => !v)} title='Ocultar grupos sin RAM o SSD conocidos (agrupados solo por línea+chip)'>
          Solo specs completos
        </Button>
        <Button variant='outline' size='sm' className='ml-auto' onClick={exportCsv} disabled={!filtered.length}>CSV</Button>
      </div>

      <p className='text-xs text-muted-foreground'>
        Últimos {windowDays} días · rangos P10 <strong className='text-foreground'>mediana</strong> P90 ·
        Spread = mediana venta − P25 compra (≈ si falta data de zona y se usa el general) ·
        Salida probable = mediana de los que desaparecieron en &lt;{fastSaleDays} días
      </p>

      <div className='rounded-md border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50'>
              {th('Configuración')}
              {th('N', 'n', 'Listings con precio usable en la ventana')}
              {th('Zona compra', 'buyMed')}
              {th('Zona venta', 'sellMed')}
              {th('General')}
              {th('Spread', 'spread')}
              {th('Salida probable', 'exit', 'Mediana de listings que desaparecieron rápido — proxy del precio real de venta')}
              {th('Activos', undefined, 'Mediana de los que siguen publicados')}
              {th('Días en mercado', 'days')}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className='px-4 py-12 text-center text-muted-foreground'>
                {rows.length ? 'Nada con esos filtros' : 'Aún no hay suficientes capturas para armar precios'}
              </td></tr>
            ) : filtered.map((r) => {
              const good = r.spread != null && r.spread >= BUDGET.target
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
                  <td className='px-4 py-3'><Band b={r.buy} /></td>
                  <td className='px-4 py-3'><Band b={r.sell} /></td>
                  <td className='px-4 py-3'><Band b={r.all} /></td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    {r.spread == null ? '—' : (
                      <span className={cn('font-medium', good ? 'text-green-600 dark:text-green-400' : r.spread < 0 ? 'text-red-600 dark:text-red-400' : '')}>
                        {r.spreadApprox ? '≈' : ''}{money(r.spread)}
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    {r.exitPrice != null ? <span>{money(r.exitPrice)} <span className='text-xs text-muted-foreground'>n={r.exitN}</span></span> : <span className='text-muted-foreground'>—</span>}
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap'>{money(r.activeMedian)} <span className='text-xs text-muted-foreground'>({r.active})</span></td>
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
