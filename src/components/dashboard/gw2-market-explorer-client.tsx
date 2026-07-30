'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TwoSeriesChart } from '@/components/dashboard/charts'
import Gw2ItemPicker, { type Gw2ItemLite } from '@/components/dashboard/gw2-item-picker'
import { formatCopper } from '@/lib/gw2/format'

type HistoryRow = {
  periodStart: string
  sold: number
  bought: number
  sellPriceAvg: number
  buyPriceAvg: number
}

type HistoryResponse = {
  item: Gw2ItemLite
  price: { buys: { unit_price: number; quantity: number }; sells: { unit_price: number; quantity: number } } | null
  history: HistoryRow[]
}

function formatHour(iso: string) {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  return `${day}/${month} ${hour}h`
}

export default function Gw2MarketExplorerClient() {
  const [selected, setSelected] = useState<Gw2ItemLite | null>(null)
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (item: Gw2ItemLite | null) => {
    setSelected(item)
    setData(null)
    setError(null)
    if (!item) return

    setLoading(true)
    try {
      const res = await fetch(`/api/gw2/items/${item.id}/history`)
      if (!res.ok) {
        setError('No se pudo traer el historial de este ítem.')
        return
      }
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const chartData = data?.history.map((h) => ({ ...h, x: formatHour(h.periodStart) })) ?? []

  return (
    <div className='space-y-4'>
      <div className='max-w-md'>
        <Gw2ItemPicker value={selected} onChange={handleSelect} placeholder='Buscar cualquier ítem — ej. Superior Sigil of Force' />
      </div>

      {loading && (
        <div className='flex items-center gap-2 py-8 text-muted-foreground text-sm'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Trayendo historial real de DataWars2...
        </div>
      )}

      {error && <p className='text-sm text-destructive py-4'>{error}</p>}

      {!loading && !error && data && (
        <div className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>{data.item.name}</CardTitle>
                <CardDescription>{data.item.rarity} · lvl {data.item.level}</CardDescription>
              </CardHeader>
              <CardContent className='flex gap-6 text-sm'>
                <div>
                  <div className='text-xs text-muted-foreground'>Comprar (ask)</div>
                  <div className='font-mono font-semibold'>{formatCopper(data.price?.sells?.unit_price)}</div>
                </div>
                <div>
                  <div className='text-xs text-muted-foreground'>Vender (bid)</div>
                  <div className='font-mono font-semibold'>{formatCopper(data.price?.buys?.unit_price)}</div>
                </div>
                <div>
                  <div className='text-xs text-muted-foreground'>Supply actual</div>
                  <div className='font-mono font-semibold'>{data.price?.sells?.quantity?.toLocaleString('es-MX') ?? '—'}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {chartData.length === 0 ? (
            <p className='text-sm text-muted-foreground py-4'>Sin historial todavía para este ítem — puede que recién se haya ingerido, probá de nuevo en un momento.</p>
          ) : (
            <div className='grid gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-sm'>Precio — últimos 7 días</CardTitle>
                  <CardDescription>Promedio por hora, buy vs sell</CardDescription>
                </CardHeader>
                <CardContent>
                  <TwoSeriesChart
                    data={chartData}
                    xKey='x'
                    series={[
                      { key: 'buyPriceAvg', label: 'Buy' },
                      { key: 'sellPriceAvg', label: 'Sell' },
                    ]}
                    yFormatter={(v) => formatCopper(v)}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className='text-sm'>Volumen — últimos 7 días</CardTitle>
                  <CardDescription>Sold (instant-buy) vs Bought (fill de buy order), real — vía DataWars2</CardDescription>
                </CardHeader>
                <CardContent>
                  <TwoSeriesChart
                    data={chartData}
                    xKey='x'
                    series={[
                      { key: 'bought', label: 'Bought' },
                      { key: 'sold', label: 'Sold' },
                    ]}
                    yFormatter={(v) => v.toLocaleString('es-MX')}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
