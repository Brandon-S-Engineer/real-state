'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FavoriteStar from '@/components/gw2/favorite-star'
import { useBackgroundScan } from '@/components/gw2/use-background-scan'
import { formatCopper, formatPercent } from '@/lib/gw2/format'

export type RefRow = {
  outputItemId: number
  name: string
  icon: string | null
  family: string
  costoBuyOrder: number
  ingresoListado: number
  gananciaBuyOrder: number
  roiBuyOrder: number
  gananciaInstant: number
  refinedSoldDiario: number
  oroPotencialDiario: number
}

type SortKey = 'oroPotencialDiario' | 'gananciaBuyOrder' | 'roiBuyOrder' | 'refinedSoldDiario' | 'costoBuyOrder'

const COLS: { key: SortKey; label: string }[] = [
  { key: 'costoBuyOrder', label: 'Costo mats' },
  { key: 'gananciaBuyOrder', label: 'Ganancia/u' },
  { key: 'roiBuyOrder', label: 'ROI' },
  { key: 'refinedSoldDiario', label: 'Vendidos/día' },
  { key: 'oroPotencialDiario', label: 'Oro/día' },
]

const FAMILIES = ['Metal', 'Cloth', 'Leather', 'Wood'] as const
const FAMILY_ES: Record<string, string> = { Metal: 'Metal', Cloth: 'Tela', Leather: 'Cuero', Wood: 'Madera' }

function ItemIcon({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className='h-8 w-8 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={32} height={32} className='h-8 w-8 rounded shrink-0' loading='lazy' />
}

export default function RefinamientoClient({ initialRows, lastComputedAt }: { initialRows: RefRow[]; lastComputedAt: string | null }) {
  const router = useRouter()
  const { scanning, start: rescan } = useBackgroundScan('/api/gw2/refinement/scan')
  const [family, setFamily] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('oroPotencialDiario')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() => {
    let out = family === 'all' ? initialRows : initialRows.filter((r) => r.family === family)
    out = [...out].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return out
  }, [initialRows, family, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div className='max-w-3xl'>
          <h1 className='text-lg font-semibold'>Refinamiento</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>
            La &quot;renta fija&quot;: comprar material base, refinar (parado en ciudad, cero gameplay), vender el refinado. Margen delgado pero constante y de altísima liquidez. Solo pares con mercado vivo — sin muertos.
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
          <p>Todavía no corrió el scan de refinamiento.</p>
          <p className='text-xs'>Corré <code className='px-1 py-0.5 rounded bg-muted'>npm run sync:gw2-refinement</code> y luego el botón Recalcular.</p>
        </div>
      ) : (
        <>
          <div className='flex rounded-md border overflow-hidden text-sm w-fit'>
            <button onClick={() => setFamily('all')} className={`px-3 py-1.5 transition-colors ${family === 'all' ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>Todo</button>
            {FAMILIES.map((f) => (
              <button key={f} onClick={() => setFamily(f)} className={`px-3 py-1.5 transition-colors ${family === f ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>{FAMILY_ES[f]}</button>
            ))}
          </div>

          <div className='text-xs text-muted-foreground'>{filtered.length} pares rentables con mercado vivo</div>

          <div className='rounded-xl border overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
                  <th className='w-8'></th>
                  <th className='text-left px-3 py-2.5 font-medium'>Refinado</th>
                  {COLS.map((col) => (
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
                  <tr key={r.outputItemId} onClick={() => router.push(`/gw2/item/${r.outputItemId}`)} className='hover:bg-muted/40 cursor-pointer'>
                    <td className='pl-2' onClick={(e) => e.stopPropagation()}><FavoriteStar itemId={r.outputItemId} /></td>
                    <td className='px-3 py-2.5'>
                      <div className='flex items-center gap-2.5'>
                        <ItemIcon src={r.icon} alt={r.name} />
                        <div className='min-w-0'>
                          <div className='font-medium truncate'>{r.name}</div>
                          <div className='text-xs text-muted-foreground'>{FAMILY_ES[r.family] ?? r.family}</div>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{formatCopper(r.costoBuyOrder)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(r.gananciaBuyOrder)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>{formatPercent(r.roiBuyOrder)}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{r.refinedSoldDiario.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums font-medium text-green-600 dark:text-green-500'>{formatCopper(r.oroPotencialDiario)}</td>
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
