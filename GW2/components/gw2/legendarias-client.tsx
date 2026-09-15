'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, RefreshCw, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FavoriteStar from '@/components/gw2/favorite-star'
import { useBackgroundScan } from '@/components/gw2/use-background-scan'
import { formatCopper, formatPercent } from '@/lib/gw2/format'

export type LegRow = {
  itemId: number
  name: string
  icon: string | null
  bid: number
  ask: number
  spreadPct: number
  supply: number
  demand: number
  soldSemana: number
  boughtSemana: number
  profitFlip: number
  roiFlip: number
  diasParaVender: number | null
  oroPotencialDiario: number
  phantomRatio: number
  viable: boolean
}

type SortKey = 'oroPotencialDiario' | 'profitFlip' | 'spreadPct' | 'soldSemana' | 'boughtSemana' | 'demand'

const COLS: { key: SortKey; label: string }[] = [
  { key: 'spreadPct', label: 'Spread' },
  { key: 'soldSemana', label: 'Vendidos/sem' },
  { key: 'boughtSemana', label: 'Comprados/sem' },
  { key: 'demand', label: 'Demanda' },
  { key: 'profitFlip', label: 'Profit/flip' },
  { key: 'oroPotencialDiario', label: 'Oro/día' },
]

function ItemIcon({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className='h-8 w-8 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={32} height={32} className='h-8 w-8 rounded shrink-0' loading='lazy' />
}

function Badge({ row }: { row: LegRow }) {
  if (row.viable) return <span className='px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'>Viable</span>
  if (row.phantomRatio >= 100) return <span className='px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'>Demanda fantasma</span>
  if (row.profitFlip <= 0) return <span className='px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-muted text-muted-foreground'>Spread &lt; impuesto</span>
  return <span className='px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-muted text-muted-foreground'>Poco volumen</span>
}

export default function LegendariasClient({ initialRows, lastComputedAt }: { initialRows: LegRow[]; lastComputedAt: string | null }) {
  const router = useRouter()
  const { scanning, start: rescan } = useBackgroundScan('/api/gw2/legendary/scan')
  const [soloViables, setSoloViables] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('oroPotencialDiario')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const viableCount = initialRows.filter((r) => r.viable).length

  const filtered = useMemo(() => {
    let out = soloViables ? initialRows.filter((r) => r.viable) : initialRows
    out = [...out].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity, bv = b[sortKey] ?? -Infinity
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })
    return out
  }, [initialRows, soloViables, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div className='max-w-3xl'>
          <h1 className='text-lg font-semibold'>Legendarias</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>
            Market-making sobre las que <strong>de verdad se mueven</strong>. Lo que importa es el volumen ejecutado (<span className='text-foreground'>Vendidos</span> y <span className='text-foreground'>Comprados</span> por semana), no la demanda — muchas muestran miles de buy orders fantasma contra ~5 ventas reales. El spread también tiene que vencer el 15% de impuesto del TP.
          </p>
        </div>
        <div className='flex flex-col items-end gap-1 shrink-0'>
          <Button size='sm' onClick={rescan} disabled={scanning}>
            {scanning ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5 mr-1.5' />}
            {scanning ? 'Recalculando…' : 'Recalcular'}
          </Button>
          {lastComputedAt && <span className='text-xs text-muted-foreground'>Último scan: {new Date(lastComputedAt).toLocaleString('es-MX')}</span>}
        </div>
      </div>

      {initialRows.length === 0 ? (
        <div className='rounded-xl border-2 border-dashed py-12 text-center text-muted-foreground space-y-2'>
          <p>Todavía no corrió el scan de legendarias.</p>
          <p className='text-xs'>Tocá Recalcular (tarda ~30s).</p>
        </div>
      ) : (
        <>
          <div className='flex items-center gap-3 flex-wrap'>
            <button
              onClick={() => setSoloViables((v) => !v)}
              className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${soloViables ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
              {soloViables ? `Solo viables (${viableCount})` : `Mostrando todas (${initialRows.length})`}
            </button>
            <span className='text-xs text-muted-foreground'>{filtered.length} legendarias · {viableCount} viables de {initialRows.length} tradeables</span>
          </div>

          <div className='rounded-xl border overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
                  <th className='w-8'></th>
                  <th className='text-left px-3 py-2.5 font-medium'>Legendaria</th>
                  <th className='text-right px-4 py-2.5 font-medium'>Precio</th>
                  {COLS.map((col) => (
                    <th key={col.key} className='text-right px-4 py-2.5 font-medium whitespace-nowrap'>
                      <button onClick={() => toggleSort(col.key)} className='inline-flex items-center gap-1 hover:text-foreground'>
                        {col.label}
                        {sortKey === col.key ? (sortDir === 'desc' ? <ArrowDown className='h-3 w-3' /> : <ArrowUp className='h-3 w-3' />) : <ArrowUpDown className='h-3 w-3 opacity-40' />}
                      </button>
                    </th>
                  ))}
                  <th className='text-right px-4 py-2.5 font-medium'>Estado</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {filtered.map((r) => (
                  <tr key={r.itemId} onClick={() => router.push(`/gw2/item/${r.itemId}`)} className='hover:bg-muted/40 cursor-pointer'>
                    <td className='pl-2' onClick={(e) => e.stopPropagation()}><FavoriteStar itemId={r.itemId} /></td>
                    <td className='px-3 py-2.5'>
                      <div className='flex items-center gap-2.5'>
                        <ItemIcon src={r.icon} alt={r.name} />
                        <div className='font-medium truncate max-w-xs'>{r.name}</div>
                      </div>
                    </td>
                    <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap'>
                      <span className='inline-flex items-center gap-1 text-xs'>{formatCopper(r.bid)} <ArrowRight className='h-3 w-3' /> {formatCopper(r.ask)}</span>
                    </td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>{formatPercent(r.spreadPct)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-medium'>{r.soldSemana.toLocaleString('es-MX')}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-medium'>{r.boughtSemana.toLocaleString('es-MX')}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${r.phantomRatio >= 100 ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`} title={r.phantomRatio >= 100 ? `${r.phantomRatio.toFixed(0)}× más buy orders que ventas reales — demanda fantasma` : undefined}>
                      {r.demand.toLocaleString('es-MX')}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${r.profitFlip > 0 ? '' : 'text-red-500'}`}>{formatCopper(r.profitFlip)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-medium text-green-600 dark:text-green-500'>{r.oroPotencialDiario > 0 ? formatCopper(r.oroPotencialDiario) : '—'}</td>
                    <td className='px-4 py-2.5 text-right'><Badge row={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
