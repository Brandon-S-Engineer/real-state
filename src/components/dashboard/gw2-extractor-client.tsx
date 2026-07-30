'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCopper, formatPercent } from '@/lib/gw2/format'
import type { Gw2ItemLite } from '@/components/dashboard/gw2-item-picker'

type Opportunity = {
  sourceItemId: number
  upgradeItemId: number
  precioCompraActual: number | null
  buyOrderSugerido: number
  mejorSalidaUpgrade: number
  salvageUsado: number
  valorTotal: number
  gananciaActual: number | null
  roiActual: number | null
  soldDiario: number | null
  liquidezDias: number | null
  sourceItem: Gw2ItemLite | null
  upgradeItem: Gw2ItemLite | null
}

export default function Gw2ExtractorClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchScan = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gw2/extractor/scan')
      if (!res.ok) {
        setError('No se pudo correr el scan.')
        return
      }
      setOpportunities(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchScan() }, [fetchScan])

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-start justify-between gap-3 flex-wrap'>
        <div>
          <h1 className='text-xl font-semibold'>Extractor</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Ganancia = venta neta del upgrade (sigilo/runa) + salvage esperado del arma − precio de compra.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => fetchScan(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5 mr-1.5' />}
            Actualizar precios
          </Button>
          <Link href='/gw2/extractor/config'>
            <Button variant='outline' size='sm'>
              <Settings className='h-3.5 w-3.5 mr-1.5' />
              Configurar
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin' />
        </div>
      ) : error ? (
        <p className='text-sm text-destructive py-8 text-center'>{error}</p>
      ) : opportunities.length === 0 ? (
        <div className='rounded-xl border-2 border-dashed py-12 text-center text-muted-foreground space-y-3'>
          <p>Todavía no hay oportunidades — faltan fuentes (arma → upgrade) y/o tasas de salvage.</p>
          <Link href='/gw2/extractor/config'>
            <Button size='sm'>
              <Settings className='h-3.5 w-3.5 mr-1.5' />
              Configurar fuentes
            </Button>
          </Link>
        </div>
      ) : (
        <div className='rounded-xl border overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
                <th className='text-left px-4 py-2.5 font-medium'>Arma</th>
                <th className='text-left px-4 py-2.5 font-medium'>Upgrade</th>
                <th className='text-right px-4 py-2.5 font-medium'>Precio actual</th>
                <th className='text-right px-4 py-2.5 font-medium'>Buy order sugerido</th>
                <th className='text-right px-4 py-2.5 font-medium'>Ganancia actual</th>
                <th className='text-right px-4 py-2.5 font-medium'>ROI</th>
                <th className='text-right px-4 py-2.5 font-medium'>Liquidez</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {opportunities.map((o) => (
                <tr key={`${o.sourceItemId}-${o.upgradeItemId}`} className='hover:bg-muted/30'>
                  <td className='px-4 py-2.5'>
                    <div className='font-medium'>{o.sourceItem?.name ?? `#${o.sourceItemId}`}</div>
                    <div className='text-xs text-muted-foreground'>{o.sourceItem?.rarity}</div>
                  </td>
                  <td className='px-4 py-2.5 text-muted-foreground'>{o.upgradeItem?.name ?? `#${o.upgradeItemId}`}</td>
                  <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(o.precioCompraActual)}</td>
                  <td className='px-4 py-2.5 text-right tabular-nums'>{formatCopper(o.buyOrderSugerido)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${o.gananciaActual != null && o.gananciaActual > 0 ? 'text-green-600 dark:text-green-500' : ''}`}>
                    {formatCopper(o.gananciaActual)}
                  </td>
                  <td className='px-4 py-2.5 text-right tabular-nums'>{formatPercent(o.roiActual)}</td>
                  <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground' title={o.soldDiario != null ? `${o.soldDiario.toFixed(1)} vendidos/día (promedio, DataWars2)` : 'Sin historial ingerido todavía'}>
                    {o.liquidezDias != null ? `${o.liquidezDias.toFixed(1)}d` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
