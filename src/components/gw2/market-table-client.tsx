'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import FavoriteStar from '@/components/gw2/favorite-star'
import { useBackgroundScan } from '@/components/gw2/use-background-scan'
import { formatCopper, formatPercent } from '@/lib/gw2/format'

export type MarketRow = {
  itemId: number
  name: string
  icon: string | null
  rarity: string
  type: string
  bid: number
  ask: number
  spread: number
  spreadPct: number
  supply: number
  demand: number
  soldDiario: number
  boughtDiario: number
  flujoDiario: number
  diasParaVender: number | null
  profitFlip: number
  roiFlip: number
  oroPotencialDiario: number
  demandChangePct: number
  priceChangePct: number
}

type Variant = 'spreads' | 'demanda'
type SortKey = keyof Pick<MarketRow, 'oroPotencialDiario' | 'profitFlip' | 'roiFlip' | 'spreadPct' | 'flujoDiario' | 'demandChangePct' | 'priceChangePct' | 'bid'>

function ItemIcon({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className='h-8 w-8 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={32} height={32} className='h-8 w-8 rounded shrink-0' loading='lazy' />
}

function Pct({ v }: { v: number }) {
  const cls = v > 0 ? 'text-green-600 dark:text-green-500' : v < 0 ? 'text-red-500' : 'text-muted-foreground'
  return <span className={cls}>{v > 0 ? '+' : ''}{(v * 100).toFixed(0)}%</span>
}

const SPREAD_COLS: { key: SortKey; label: string }[] = [
  { key: 'bid', label: 'Comprar (bid)' },
  { key: 'spreadPct', label: 'Spread' },
  { key: 'profitFlip', label: 'Profit/u' },
  { key: 'flujoDiario', label: 'Vendidos/día' },
  { key: 'oroPotencialDiario', label: 'Oro/día' },
  { key: 'roiFlip', label: 'ROI' },
]

const DEMANDA_COLS: { key: SortKey; label: string }[] = [
  { key: 'demandChangePct', label: 'Demanda subió' },
  { key: 'priceChangePct', label: 'Precio subió' },
  { key: 'bid', label: 'Precio (bid)' },
  { key: 'flujoDiario', label: 'Vendidos/día' },
  { key: 'spreadPct', label: 'Spread' },
]

export default function MarketTableClient({
  variant,
  initialRows,
  lastComputedAt,
  types,
}: {
  variant: Variant
  initialRows: MarketRow[]
  lastComputedAt: string | null
  types: string[]
}) {
  const router = useRouter()
  const { scanning, start: rescan } = useBackgroundScan('/api/gw2/market/scan')
  const [search, setSearch] = useState('')
  const [minProfit, setMinProfit] = useState('')
  const [minFlujo, setMinFlujo] = useState(variant === 'spreads' ? '20' : '10')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>(variant === 'spreads' ? 'oroPotencialDiario' : 'demandChangePct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const cols = variant === 'spreads' ? SPREAD_COLS : DEMANDA_COLS
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

  const filtered = useMemo(() => {
    const minProfitCopper = minProfit.trim() ? Number(minProfit) * 10000 : null
    const minFlujoNum = minFlujo.trim() ? Number(minFlujo) : null
    let out = initialRows.filter((r) => {
      if (search.trim() && !normalize(r.name).includes(normalize(search))) return false
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (minFlujoNum != null && r.flujoDiario < minFlujoNum) return false
      if (variant === 'spreads') {
        if (r.profitFlip <= 0) return false
        if (minProfitCopper != null && r.oroPotencialDiario < minProfitCopper) return false
      } else {
        if (r.demandChangePct <= 0) return false
      }
      return true
    })
    out = [...out].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })
    return out
  }, [initialRows, search, minProfit, minFlujo, typeFilter, sortKey, sortDir, variant])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const title = variant === 'spreads' ? 'Grandes Spreads' : 'Demanda Subiendo'
  const desc = variant === 'spreads'
    ? 'Flipping — comprar al bid, vender al ask. Rankeado por oro realizable por día (spread × volumen real), no por % vacíos. Solo ítems con transacciones reales.'
    : 'Momentum — ítems cuya demanda se disparó vs su base de la semana. La señal aparece antes de que el precio termine de moverse. Solo con transacciones reales.'

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div className='max-w-3xl'>
          <h1 className='text-lg font-semibold'>{title}</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>{desc}</p>
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
          <p>Todavía no corrió el scan de mercado.</p>
          <p className='text-xs'>Corré <code className='px-1 py-0.5 rounded bg-muted'>npm run scan:gw2-market</code> (tarda unos minutos la primera vez).</p>
        </div>
      ) : (
        <>
          <div className='flex gap-3 flex-wrap items-center'>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Buscar ítem...' className='max-w-xs' />
            <div className='flex items-center gap-1.5'>
              <span className='text-xs text-muted-foreground'>Mín. vendidos/día</span>
              <Input value={minFlujo} onChange={(e) => setMinFlujo(e.target.value)} type='number' className='w-20' />
            </div>
            {variant === 'spreads' && (
              <div className='flex items-center gap-1.5'>
                <span className='text-xs text-muted-foreground'>Mín. oro/día</span>
                <Input value={minProfit} onChange={(e) => setMinProfit(e.target.value)} type='number' placeholder='oro' className='w-24' />
              </div>
            )}
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className='w-44'>
              <option value='all'>Todos los tipos</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          <div className='text-xs text-muted-foreground'>{filtered.length} de {initialRows.length}</div>

          <div className='rounded-xl border overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
                  <th className='w-8'></th>
                  <th className='text-left px-3 py-2.5 font-medium'>Ítem</th>
                  {cols.map((col) => (
                    <th key={col.key} className='text-right px-4 py-2.5 font-medium whitespace-nowrap'>
                      <button onClick={() => toggleSort(col.key)} className='inline-flex items-center gap-1 hover:text-foreground'>
                        {col.label}
                        {sortKey === col.key ? (sortDir === 'desc' ? <ArrowDown className='h-3 w-3' /> : <ArrowUp className='h-3 w-3' />) : <ArrowUpDown className='h-3 w-3 opacity-40' />}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y'>
                {filtered.map((r) => (
                  <tr key={r.itemId} onClick={() => router.push(`/gw2/item/${r.itemId}`)} className='hover:bg-muted/40 cursor-pointer'>
                    <td className='pl-2' onClick={(e) => e.stopPropagation()}><FavoriteStar itemId={r.itemId} /></td>
                    <td className='px-3 py-2.5'>
                      <div className='flex items-center gap-2.5'>
                        <ItemIcon src={r.icon} alt={r.name} />
                        <div className='min-w-0'>
                          <div className='font-medium truncate max-w-xs'>{r.name}</div>
                          <div className='text-xs text-muted-foreground'>{r.rarity} · {r.type}</div>
                        </div>
                      </div>
                    </td>
                    {variant === 'spreads' ? (
                      <>
                        <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(r.bid)}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{formatPercent(r.spreadPct)}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(r.profitFlip)}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{r.flujoDiario.toFixed(0)}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums font-medium text-green-600 dark:text-green-500'>{formatCopper(r.oroPotencialDiario)}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums'>{formatPercent(r.roiFlip)}</td>
                      </>
                    ) : (
                      <>
                        <td className='px-4 py-2.5 text-right tabular-nums font-medium'><Pct v={r.demandChangePct} /></td>
                        <td className='px-4 py-2.5 text-right tabular-nums'><Pct v={r.priceChangePct} /></td>
                        <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{formatCopper(r.bid)}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{r.flujoDiario.toFixed(0)}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{formatPercent(r.spreadPct)}</td>
                      </>
                    )}
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
