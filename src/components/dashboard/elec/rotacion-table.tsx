'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RotationRow, RotationTable } from '@/lib/electronicos/stats'
import { isModelOnlyLine, isStorageOnlyLine } from '@/lib/electronicos/parse-specs'
import { CATEGORY_META, ConfidenceDot, downloadFile, formatSsd, lineLabel, money, type Category } from './shared'

type SortKey = 'gone' | 'index' | 'tracked' | 'days' | 'price'

function rowLabel(r: RotationRow, byConfig: boolean) {
  const parts = [lineLabel(r.line)]
  if (r.chip && !isStorageOnlyLine(r.line) && !isModelOnlyLine(r.line)) parts.push(r.chip)
  if (byConfig) parts.push(r.ssdGb ? formatSsd(r.ssdGb) : '? GB')
  return parts.join(' · ')
}

/** Solo las keys que coinciden con un configKey real se pueden abrir en Listings. */
function asConfigKey(r: RotationRow, byConfig: boolean): string | null {
  if (isModelOnlyLine(r.line)) return r.line
  if (byConfig && isStorageOnlyLine(r.line) && r.ssdGb) return r.key
  return null
}

function IndexBadge({ v }: { v: number | null }) {
  if (v == null) return <span className='text-muted-foreground'>—</span>
  const cls = v >= 1.15 ? 'text-green-600 dark:text-green-400' : v <= 0.85 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
  return <span className={cn('font-medium', cls)}>{v.toFixed(2)}×</span>
}

export default function ElecRotacionTable({
  category, table, windowDays, onOpenConfig,
}: {
  category: Category
  table: RotationTable
  windowDays: number
  onOpenConfig: (configKey: string) => void
}) {
  const meta = CATEGORY_META[category]
  const [byConfig, setByConfig] = useState(false)
  const [hideLow, setHideLow] = useState(true)
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'gone', desc: true })

  const val = (r: RotationRow, k: SortKey) =>
    k === 'gone' ? r.gone
      : k === 'index' ? r.index ?? -Infinity
        : k === 'tracked' ? r.tracked
          : k === 'days' ? r.medianDays ?? Infinity
            : r.goneMedianPrice ?? -Infinity

  const rows = useMemo(() => (byConfig ? table.byConfig : table.byModel)
    .filter((r) => !hideLow || r.confidence !== 'baja')
    .sort((a, b) => (sort.desc ? val(b, sort.key) - val(a, sort.key) : val(a, sort.key) - val(b, sort.key))),
  [table, byConfig, hideLow, sort])

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
    const header = 'modelo,publicados,seguidos,se_fueron,por_semana,tasa,indice,dias_mediana,precio_salida,precio_activos,confianza'
    const lines = rows.map((r) => [
      `"${rowLabel(r, byConfig)}"`, r.seen, r.tracked, r.gone, r.gonePerWeek, r.goneRate?.toFixed(3), r.index,
      r.medianDays, r.goneMedianPrice, r.activeMedianPrice, r.confidence,
    ].map((v) => v ?? '').join(','))
    downloadFile([header, ...lines].join('\n'), `rotacion-${category.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
  }

  const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`)

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-2 items-center'>
        {meta.hasStorage && (
          <div className='inline-flex rounded-md border p-0.5 bg-muted/40'>
            {[false, true].map((v) => (
              <button
                key={String(v)}
                onClick={() => setByConfig(v)}
                className={cn('px-3 py-1 text-sm rounded transition-colors', byConfig === v ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground')}
              >
                {v ? `Modelo + ${meta.storageLabel.toLowerCase()}` : 'Modelo'}
              </button>
            ))}
          </div>
        )}
        <Button variant={hideLow ? 'default' : 'outline'} size='sm' onClick={() => setHideLow((v) => !v)}>
          Ocultar poca data
        </Button>
        <Button variant='outline' size='sm' className='ml-auto' onClick={exportCsv} disabled={!rows.length}>CSV</Button>
      </div>

      <p className='text-xs text-muted-foreground'>
        {table.coverageDays} días de captura (ventana {windowDays}) · {table.tracked} listings seguidos, {table.gone} se fueron
        ({pct(table.baseRate)} promedio) · {table.onceOnly} vistos una sola vez no cuentan: si no vuelven a salir no sabemos si se vendieron o solo
        no aparecieron en la búsqueda. Desaparecer ≠ vender seguro; la tasa absoluta sale inflada, compara el <strong className='text-foreground'>índice</strong> entre
        modelos (1.00× = promedio).
      </p>

      <div className='rounded-md border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50'>
              {th('Modelo')}
              {th('Se fueron', 'gone', 'Listings seguidos que desaparecieron — volumen de salida')}
              {th('Seguidos', 'tracked', 'Vistos durante ≥20 h / publicados en la ventana')}
              {th('Tasa')}
              {th('Índice', 'index', 'Tasa suavizada vs el promedio de la categoría. >1 rota más rápido que el promedio')}
              {th('Días', 'days', 'Mediana de días en mercado de los que se fueron')}
              {th('Precio salida', 'price', 'Mediana de precio de los que se fueron')}
              {th('Activos', undefined, 'Mediana de precio de los que siguen publicados')}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className='px-4 py-12 text-center text-muted-foreground'>
                {table.tracked ? 'Nada con esos filtros' : 'Aún no hay listings seguidos por más de un día'}
              </td></tr>
            ) : rows.map((r) => {
              const key = asConfigKey(r, byConfig)
              return (
                <tr
                  key={r.key}
                  onClick={key ? () => onOpenConfig(key) : undefined}
                  title={key ? 'Ver listings de esta configuración' : undefined}
                  className={cn('border-b hover:bg-muted/30 transition-colors', key && 'cursor-pointer', r.confidence === 'baja' && 'opacity-50')}
                >
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2 font-medium whitespace-nowrap'>
                      <ConfidenceDot level={r.confidence} />
                      {rowLabel(r, byConfig)}
                    </div>
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    <span className='font-medium'>{r.gone}</span>
                    <span className='ml-1 text-xs text-muted-foreground'>~{r.gonePerWeek}/sem</span>
                  </td>
                  <td className='px-4 py-3 text-muted-foreground whitespace-nowrap'>{r.tracked} <span className='text-xs'>/ {r.seen}</span></td>
                  <td className='px-4 py-3 text-muted-foreground'>{pct(r.goneRate)}</td>
                  <td className='px-4 py-3'><IndexBadge v={r.index} /></td>
                  <td className='px-4 py-3 text-muted-foreground whitespace-nowrap'>{r.medianDays != null ? `${r.medianDays.toFixed(1)}d` : '—'}</td>
                  <td className='px-4 py-3 whitespace-nowrap'>{money(r.goneMedianPrice)}</td>
                  <td className='px-4 py-3 whitespace-nowrap text-muted-foreground'>{money(r.activeMedianPrice)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
