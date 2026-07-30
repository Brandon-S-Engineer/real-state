'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TwoSeriesChart } from '@/components/dashboard/charts'
import OrderBook from '@/components/gw2/order-book'
import FavoriteStar from '@/components/gw2/favorite-star'
import { formatCopper, formatPercent } from '@/lib/gw2/format'

type Listing = { listings: number; unit_price: number; quantity: number }
type HistoryRow = { periodStart: string; sold: number; bought: number; sellPriceAvg: number; buyPriceAvg: number }
type DailyRow = { date: string; sold: number; bought: number; sellPriceAvg: number; buyPriceAvg: number; supply: number; demand: number }
type Price = { buys?: { unit_price: number; quantity: number }; sells?: { unit_price: number; quantity: number } }

type Detail = {
  item: { id: number; name: string; icon: string | null; rarity: string; level: number; type: string } | null
  price: Price | null
  book: { buys: Listing[]; sells: Listing[] } | null
  history: HistoryRow[]
}

const TP_CUT = 0.15

function ItemIcon({ src, alt, size = 44 }: { src: string | null; alt: string; size?: number }) {
  if (!src) return <div className='rounded bg-muted shrink-0' style={{ width: size, height: size }} />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} className='rounded shrink-0' style={{ width: size, height: size }} />
}

function formatHour(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}h`
}

function formatDay(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

const RANGES = [
  { key: '1a', label: '1 año', days: 365 },
  { key: '2a', label: '2 años', days: 730 },
  { key: 'todo', label: 'Todo', days: Infinity },
] as const
type RangeKey = (typeof RANGES)[number]['key']

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className={`font-mono ${strong ? 'text-base font-semibold text-green-600 dark:text-green-500' : 'text-sm font-medium'}`}>{value}</div>
    </div>
  )
}

export default function ItemDetailClient({ itemId }: { itemId: number }) {
  const router = useRouter()
  const [data, setData] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [daily, setDaily] = useState<DailyRow[] | null>(null)
  const [dailyLoading, setDailyLoading] = useState(true)
  const [range, setRange] = useState<RangeKey>('2a')

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/gw2/items/${itemId}/history`)
      .then(async (res) => {
        if (!res.ok) { setError('No se pudo cargar el ítem.'); return }
        const json = await res.json()
        if (active) setData(json)
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [itemId])

  // Historial largo (años) — se trae aparte para no frenar la vista de 7 días.
  useEffect(() => {
    let active = true
    setDailyLoading(true)
    fetch(`/api/gw2/items/${itemId}/daily`)
      .then(async (res) => {
        if (!res.ok) return
        const json = await res.json()
        if (active) setDaily(json.daily ?? [])
      })
      .finally(() => active && setDailyLoading(false))
    return () => { active = false }
  }, [itemId])

  const longData = useMemo(() => {
    if (!daily) return []
    const days = RANGES.find((r) => r.key === range)!.days
    const cutoff = days === Infinity ? 0 : Date.now() - days * 24 * 60 * 60 * 1000
    return daily
      .filter((d) => days === Infinity || new Date(d.date).getTime() >= cutoff)
      .map((d) => ({ ...d, x: formatDay(d.date) }))
  }, [daily, range])

  const bid = data?.price?.buys?.unit_price ?? 0
  const ask = data?.price?.sells?.unit_price ?? 0
  const spread = ask - bid
  const profitFlip = bid > 0 ? Math.round(ask * (1 - TP_CUT) - bid) : 0
  const chartData = data?.history.map((h) => ({ ...h, x: formatHour(h.periodStart) })) ?? []

  return (
    <div className='p-6 space-y-6'>
      <button onClick={() => router.back()} className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'>
        <ArrowLeft className='h-3 w-3' /> Volver
      </button>

      {loading ? (
        <div className='flex items-center gap-2 py-12 text-muted-foreground'><Loader2 className='h-5 w-5 animate-spin' /> Cargando order book en vivo...</div>
      ) : error || !data ? (
        <p className='text-sm text-destructive'>{error ?? 'No hay datos.'}</p>
      ) : (
        <>
          <div className='flex items-center gap-3'>
            <ItemIcon src={data.item?.icon ?? null} alt={data.item?.name ?? ''} />
            <div className='flex-1'>
              <h1 className='text-xl font-semibold'>{data.item?.name ?? `#${itemId}`}</h1>
              <p className='text-sm text-muted-foreground'>{data.item?.rarity} · {data.item?.type} · lvl {data.item?.level}</p>
            </div>
            <FavoriteStar itemId={itemId} className='h-9 w-9' />
          </div>

          {/* Flip math */}
          <Card>
            <CardHeader><CardTitle className='text-sm'>Flip actual</CardTitle><CardDescription>Comprar al bid, vender al ask, 15% de impuesto del TP en la venta</CardDescription></CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4'>
                <Stat label='Comprar (bid)' value={formatCopper(bid)} />
                <Stat label='Vender (ask)' value={formatCopper(ask)} />
                <Stat label='Spread' value={formatCopper(spread)} />
                <Stat label='Profit / unidad' value={formatCopper(profitFlip)} strong />
                <Stat label='ROI' value={formatPercent(bid > 0 ? profitFlip / bid : null)} />
                <Stat label='Supply / Demand' value={`${(data.price?.sells?.quantity ?? 0).toLocaleString('es-MX')} / ${(data.price?.buys?.quantity ?? 0).toLocaleString('es-MX')}`} />
              </div>
            </CardContent>
          </Card>

          {/* Order book */}
          <Card>
            <CardHeader><CardTitle className='text-sm'>Order book — en vivo</CardTitle><CardDescription>Precio · cantidad (nº de órdenes)</CardDescription></CardHeader>
            <CardContent><OrderBook book={data.book} /></CardContent>
          </Card>

          {/* Charts */}
          <Card>
            <CardHeader><CardTitle className='text-sm'>Historial — 7 días</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className='text-sm text-muted-foreground'>Sin historial todavía.</p>
              ) : (
                <div className='grid gap-4 lg:grid-cols-2'>
                  <div>
                    <div className='text-xs text-muted-foreground mb-1'>Precio</div>
                    <TwoSeriesChart data={chartData} xKey='x' series={[{ key: 'buyPriceAvg', label: 'Buy' }, { key: 'sellPriceAvg', label: 'Sell' }]} yFormatter={(v) => formatCopper(v)} />
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground mb-1'>Volumen (Sold / Bought)</div>
                    <TwoSeriesChart data={chartData} xKey='x' series={[{ key: 'bought', label: 'Bought' }, { key: 'sold', label: 'Sold' }]} yFormatter={(v) => v.toLocaleString('es-MX')} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial largo — años (fuente: DataWars2 diario) */}
          <Card>
            <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0'>
              <div>
                <CardTitle className='text-sm'>Historial largo — años</CardTitle>
                <CardDescription>El ciclo a través de varios festivales: la oferta se dispara durante el evento y el precio toca fondo.</CardDescription>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${range === r.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {dailyLoading ? (
                <div className='flex items-center gap-2 py-8 text-sm text-muted-foreground'><Loader2 className='h-4 w-4 animate-spin' /> Cargando años de historial...</div>
              ) : longData.length < 2 ? (
                <p className='text-sm text-muted-foreground'>DataWars2 no tiene historial diario largo para este ítem todavía.</p>
              ) : (
                <div className='grid gap-4 lg:grid-cols-2'>
                  <div>
                    <div className='text-xs text-muted-foreground mb-1'>Precio ({longData.length} días)</div>
                    <TwoSeriesChart data={longData} xKey='x' series={[{ key: 'buyPriceAvg', label: 'Buy' }, { key: 'sellPriceAvg', label: 'Sell' }]} yFormatter={(v) => formatCopper(v)} />
                  </div>
                  <div>
                    <div className='text-xs text-muted-foreground mb-1'>Volumen diario (Sold / Bought)</div>
                    <TwoSeriesChart data={longData} xKey='x' series={[{ key: 'bought', label: 'Bought' }, { key: 'sold', label: 'Sold' }]} yFormatter={(v) => v.toLocaleString('es-MX')} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
