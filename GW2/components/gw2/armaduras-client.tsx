'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FavoriteStar from '@/components/gw2/favorite-star'
import { useBackgroundScan } from '@/components/gw2/use-background-scan'
import { formatCopper, formatPercent } from '@/lib/gw2/format'

type Row = {
  itemId: number
  itemName: string
  itemIcon: string | null
  itemType: string
  itemLevel: number
  suffixName: string
  suffixIcon: string | null
  armorAsk: number | null
  armorBid: number | null
  runaSellNeto: number
  salvageNeto: number
  valorTotal: number
  gananciaInstant: number | null
  gananciaBuyOrder: number | null
  roiBuyOrder: number | null
  itemSupply: number
  itemDemand: number
  runaSupply: number
}

type SortKey = 'gananciaBuyOrder' | 'roiBuyOrder' | 'valorTotal' | 'armorBid' | 'itemSupply' | 'runaSupply'
type TypeFilter = 'all' | 'Armor' | 'Weapon'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'armorBid', label: 'Comprar (buy order)' },
  { key: 'valorTotal', label: 'Valor total' },
  { key: 'gananciaBuyOrder', label: 'Ganancia' },
  { key: 'roiBuyOrder', label: 'ROI' },
  { key: 'itemSupply', label: 'Liquidez ítem' },
  { key: 'runaSupply', label: 'Liquidez runa' },
]

function ItemIcon({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className='h-8 w-8 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={32} height={32} className='h-8 w-8 rounded shrink-0' loading='lazy' />
}

export default function ArmaduasClient({ initialRows, lastComputedAt }: { initialRows: Row[]; lastComputedAt: string | null }) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [computedAt, setComputedAt] = useState(lastComputedAt)
  const { scanning, start: rescan } = useBackgroundScan('/api/gw2/armor/scan')
  const [search, setSearch] = useState('')
  const [minGanancia, setMinGanancia] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('gananciaBuyOrder')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()


  const filtered = useMemo(() => {
    const minGananciaCopper = minGanancia.trim() ? Number(minGanancia) * 10000 : null
    let out = rows.filter((r) => {
      if (typeFilter !== 'all' && r.itemType !== typeFilter) return false
      if (search.trim() && !normalize(r.itemName).includes(normalize(search)) && !normalize(r.suffixName).includes(normalize(search))) return false
      if (minGananciaCopper != null && (r.gananciaBuyOrder ?? 0) < minGananciaCopper) return false
      return true
    })
    out = [...out].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return out
  }, [rows, search, minGanancia, typeFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div className='max-w-3xl'>
          <h1 className='text-lg font-semibold'>Armaduras</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>
            Comprá el exótico barato, extraé la runa/sigilo con el Endless Extractor (sale vendible), vendé el upgrade y salvageá el arma por ectos.
            <span className='block mt-0.5'>Ganancia = venta neta del upgrade + salvage (~0.875 ecto) − precio de compra. Rankeado por comprar con buy order al bid.</span>
          </p>
        </div>
        <div className='flex flex-col items-end gap-1 shrink-0'>
          <Button size='sm' onClick={rescan} disabled={scanning}>
            {scanning ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5 mr-1.5' />}
            {scanning ? 'Recalculando…' : 'Recalcular con precios en vivo'}
          </Button>
          {computedAt && <span className='text-xs text-muted-foreground'>Último scan: {new Date(computedAt).toLocaleString('es-MX')}</span>}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className='rounded-xl border-2 border-dashed py-12 text-center text-muted-foreground space-y-2'>
          <p>Todavía no corrió el scan de armaduras.</p>
          <Button size='sm' onClick={rescan} disabled={scanning}>
            {scanning ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5 mr-1.5' />}
            Correr scan ahora
          </Button>
        </div>
      ) : (
        <>
          <div className='flex gap-3 flex-wrap items-center'>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Buscar arma o runa...' className='max-w-xs' />
            <Input value={minGanancia} onChange={(e) => setMinGanancia(e.target.value)} placeholder='Ganancia mín. (oro)' type='number' className='max-w-40' />
            <div className='flex rounded-md border overflow-hidden text-sm'>
              {(['all', 'Armor', 'Weapon'] as TypeFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 transition-colors ${typeFilter === t ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>
                  {t === 'all' ? 'Todo' : t === 'Armor' ? 'Armadura' : 'Arma'}
                </button>
              ))}
            </div>
            {(search || minGanancia || typeFilter !== 'all') && (
              <button onClick={() => { setSearch(''); setMinGanancia(''); setTypeFilter('all') }} className='text-xs text-muted-foreground hover:text-foreground underline underline-offset-2'>
                Limpiar
              </button>
            )}
          </div>

          <div className='text-xs text-muted-foreground'>{filtered.length} de {rows.length} oportunidades rentables</div>

          <div className='rounded-xl border overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
                  <th className='w-8'></th>
                  <th className='text-left px-4 py-2.5 font-medium'>Ítem</th>
                  <th className='text-left px-3 py-2.5 font-medium'>Contiene</th>
                  {COLUMNS.map((col) => (
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
                  <tr
                    key={r.itemId}
                    onClick={() => router.push(`/gw2/armaduras/${r.itemId}`)}
                    className='hover:bg-muted/40 cursor-pointer'>
                    <td className='pl-2' onClick={(e) => e.stopPropagation()}><FavoriteStar itemId={r.itemId} /></td>
                    <td className='px-4 py-2.5'>
                      <div className='flex items-center gap-2.5'>
                        <ItemIcon src={r.itemIcon} alt={r.itemName} />
                        <div className='min-w-0'>
                          <div className='font-medium truncate'>{r.itemName}</div>
                          <div className='text-xs text-muted-foreground'>{r.itemType === 'Armor' ? 'Armadura' : 'Arma'} · lvl {r.itemLevel}</div>
                        </div>
                      </div>
                    </td>
                    <td className='px-3 py-2.5'>
                      <div className='flex items-center gap-2'>
                        <ItemIcon src={r.suffixIcon} alt={r.suffixName} />
                        <span className='text-xs text-muted-foreground truncate max-w-45'>{r.suffixName}</span>
                      </div>
                    </td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(r.armorBid)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground' title={`Runa ${formatCopper(r.runaSellNeto)} + salvage ${formatCopper(r.salvageNeto)}`}>{formatCopper(r.valorTotal)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-medium text-green-600 dark:text-green-500'>{formatCopper(r.gananciaBuyOrder)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>{formatPercent(r.roiBuyOrder)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground' title={`${r.itemDemand.toLocaleString('es-MX')} buy orders abiertas`}>{r.itemSupply.toLocaleString('es-MX')}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{r.runaSupply.toLocaleString('es-MX')}</td>
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
