'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFavorites } from '@/lib/gw2/favorites-store'
import { formatCopper, formatPercent } from '@/lib/gw2/format'

type FavRow = {
  itemId: number
  note: string | null
  name: string
  icon: string | null
  rarity: string
  bid: number
  ask: number
  spread: number
  spreadPct: number
  profitFlip: number
  roiFlip: number
  supply: number
  demand: number
}

function ItemIcon({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className='h-8 w-8 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={32} height={32} className='h-8 w-8 rounded shrink-0' loading='lazy' />
}

export default function FavoritosClient() {
  const router = useRouter()
  const [rows, setRows] = useState<FavRow[]>([])
  const [loading, setLoading] = useState(true)
  const { toggle } = useFavorites()

  const fetchFavs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gw2/favorites')
      if (res.ok) setRows(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFavs() }, [fetchFavs])

  const remove = async (itemId: number) => {
    await toggle(itemId)
    setRows((prev) => prev.filter((r) => r.itemId !== itemId))
  }

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-lg font-semibold'>Favoritos</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>Ítems que vigilás — spread y precios en vivo. Ej. Black Lion Chests.</p>
        </div>
        <Button size='sm' variant='outline' onClick={fetchFavs} disabled={loading}>
          {loading ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5 mr-1.5' />}
          Actualizar precios
        </Button>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12 text-muted-foreground'><Loader2 className='h-5 w-5 animate-spin' /></div>
      ) : rows.length === 0 ? (
        <div className='rounded-xl border-2 border-dashed py-12 text-center text-muted-foreground space-y-1'>
          <p>Sin favoritos todavía.</p>
          <p className='text-xs'>Tocá la estrella <Star className='inline h-3 w-3' /> de cualquier ítem en las otras pestañas para guardarlo acá.</p>
        </div>
      ) : (
        <div className='rounded-xl border overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
                <th className='w-8'></th>
                <th className='text-left px-3 py-2.5 font-medium'>Ítem</th>
                <th className='text-right px-4 py-2.5 font-medium'>Comprar (bid)</th>
                <th className='text-right px-4 py-2.5 font-medium'>Vender (ask)</th>
                <th className='text-right px-4 py-2.5 font-medium'>Spread</th>
                <th className='text-right px-4 py-2.5 font-medium'>Profit/u</th>
                <th className='text-right px-4 py-2.5 font-medium'>ROI</th>
                <th className='text-right px-4 py-2.5 font-medium'>Supply/Demand</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {rows.map((r) => (
                <tr key={r.itemId} onClick={() => router.push(`/gw2/item/${r.itemId}`)} className='hover:bg-muted/40 cursor-pointer'>
                  <td className='pl-2' onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => remove(r.itemId)} title='Quitar de favoritos' className='h-7 w-7 rounded-md flex items-center justify-center text-yellow-500 hover:text-yellow-600'>
                      <Star className='h-4 w-4 fill-current' />
                    </button>
                  </td>
                  <td className='px-3 py-2.5'>
                    <div className='flex items-center gap-2.5'>
                      <ItemIcon src={r.icon} alt={r.name} />
                      <div className='min-w-0'>
                        <div className='font-medium truncate'>{r.name}</div>
                        <div className='text-xs text-muted-foreground'>{r.rarity}</div>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(r.bid)}</td>
                  <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(r.ask)}</td>
                  <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{formatCopper(r.spread)} <span className='text-xs'>({formatPercent(r.spreadPct)})</span></td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${r.profitFlip > 0 ? 'text-green-600 dark:text-green-500' : ''}`}>{formatCopper(r.profitFlip)}</td>
                  <td className='px-4 py-2.5 text-right tabular-nums'>{formatPercent(r.roiFlip)}</td>
                  <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>{r.supply.toLocaleString('es-MX')}/{r.demand.toLocaleString('es-MX')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
