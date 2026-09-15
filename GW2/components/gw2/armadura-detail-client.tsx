'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TwoSeriesChart } from '@/components/dashboard/charts'
import OrderBook from '@/components/gw2/order-book'
import FavoriteStar from '@/components/gw2/favorite-star'
import { formatCopper, formatPercent } from '@/lib/gw2/format'

type Listing = { listings: number; unit_price: number; quantity: number }
type HistoryRow = { periodStart: string; sold: number; bought: number; sellPriceAvg: number; buyPriceAvg: number }

type Detail = {
  opportunity: {
    armorBid: number | null
    armorAsk: number | null
    runaSellNeto: number
    salvageNeto: number
    valorTotal: number
    gananciaBuyOrder: number | null
    gananciaInstant: number | null
    roiBuyOrder: number | null
    itemSupply: number
    itemDemand: number
    runaSupply: number
  }
  baseItem: { id: number; name: string; icon: string | null; rarity: string; level: number; type: string } | null
  suffixItem: { id: number; name: string; icon: string | null; rarity: string } | null
  itemBook: { buys: Listing[]; sells: Listing[] } | null
  runeBook: { buys: Listing[]; sells: Listing[] } | null
  itemHistory: HistoryRow[]
  runeHistory: HistoryRow[]
}

function ItemIcon({ src, alt, size = 40 }: { src: string | null; alt: string; size?: number }) {
  if (!src) return <div className='rounded bg-muted shrink-0' style={{ width: size, height: size }} />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} className='rounded shrink-0' style={{ width: size, height: size }} />
}

function formatHour(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}h`
}

function VolumeAndPrice({ history, label }: { history: HistoryRow[]; label: string }) {
  const data = history.map((h) => ({ ...h, x: formatHour(h.periodStart) }))
  if (data.length === 0) return <p className='text-sm text-muted-foreground'>Sin historial de {label} todavía.</p>
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <div>
        <div className='text-xs text-muted-foreground mb-1'>Precio — 7 días</div>
        <TwoSeriesChart data={data} xKey='x' series={[{ key: 'buyPriceAvg', label: 'Buy' }, { key: 'sellPriceAvg', label: 'Sell' }]} yFormatter={(v) => formatCopper(v)} />
      </div>
      <div>
        <div className='text-xs text-muted-foreground mb-1'>Volumen — 7 días</div>
        <TwoSeriesChart data={data} xKey='x' series={[{ key: 'bought', label: 'Bought' }, { key: 'sold', label: 'Sold' }]} yFormatter={(v) => v.toLocaleString('es-MX')} />
      </div>
    </div>
  )
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className={`font-mono ${strong ? 'text-base font-semibold text-green-600 dark:text-green-500' : 'text-sm font-medium'}`}>{value}</div>
      {hint && <div className='text-[11px] text-muted-foreground'>{hint}</div>}
    </div>
  )
}

export default function ArmaduraDetailClient({ itemId }: { itemId: number }) {
  const [data, setData] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/gw2/armor/${itemId}`)
      .then(async (res) => {
        if (!res.ok) { setError('No se pudo cargar el detalle.'); return }
        const json = await res.json()
        if (active) setData(json)
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [itemId])

  return (
    <div className='p-6 space-y-6'>
      <Link href='/gw2/armaduras' className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'>
        <ArrowLeft className='h-3 w-3' /> Volver a Armaduras
      </Link>

      {loading ? (
        <div className='flex items-center gap-2 py-12 text-muted-foreground'><Loader2 className='h-5 w-5 animate-spin' /> Cargando order book en vivo...</div>
      ) : error || !data ? (
        <p className='text-sm text-destructive'>{error ?? 'No hay datos.'}</p>
      ) : (
        <>
          <div className='flex items-center gap-3'>
            <ItemIcon src={data.baseItem?.icon ?? null} alt={data.baseItem?.name ?? ''} size={44} />
            <div className='flex-1'>
              <h1 className='text-xl font-semibold'>{data.baseItem?.name ?? `#${itemId}`}</h1>
              <p className='text-sm text-muted-foreground'>{data.baseItem?.type === 'Armor' ? 'Armadura' : 'Arma'} · {data.baseItem?.rarity} · lvl {data.baseItem?.level}</p>
            </div>
            <FavoriteStar itemId={itemId} className='h-9 w-9' />
          </div>

          {/* Breakdown de la extracción */}
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>El play de extracción</CardTitle>
              <CardDescription className='flex items-center gap-1.5'>
                Comprar el arma → extraer <ItemIcon src={data.suffixItem?.icon ?? null} alt={data.suffixItem?.name ?? ''} size={16} /> {data.suffixItem?.name} → vender + salvage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4'>
                <Stat label='Comprar (buy order)' value={formatCopper(data.opportunity.armorBid)} hint={`o instant ${formatCopper(data.opportunity.armorAsk)}`} />
                <Stat label='Venta runa (neta)' value={`+${formatCopper(data.opportunity.runaSellNeto)}`} />
                <Stat label='Salvage (ectos)' value={`+${formatCopper(data.opportunity.salvageNeto)}`} />
                <Stat label='Valor total' value={formatCopper(data.opportunity.valorTotal)} />
                <Stat label='Ganancia' value={formatCopper(data.opportunity.gananciaBuyOrder)} strong />
                <Stat label='ROI' value={formatPercent(data.opportunity.roiBuyOrder)} />
              </div>
            </CardContent>
          </Card>

          {/* Liquidez */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <Card><CardContent className='pt-4'><Stat label='Vendedores del arma' value={data.opportunity.itemSupply.toLocaleString('es-MX')} hint='unidades a la venta' /></CardContent></Card>
            <Card><CardContent className='pt-4'><Stat label='Compradores del arma' value={data.opportunity.itemDemand.toLocaleString('es-MX')} hint='buy orders abiertas' /></CardContent></Card>
            <Card><CardContent className='pt-4'><Stat label='Liquidez de la runa' value={data.opportunity.runaSupply.toLocaleString('es-MX')} hint='unidades listadas' /></CardContent></Card>
            <Card><CardContent className='pt-4'><Stat label='Vendidos/día (runa)' value={data.runeHistory.length ? (data.runeHistory.reduce((s, r) => s + r.sold, 0) / new Set(data.runeHistory.map((r) => r.periodStart.slice(0, 10))).size).toFixed(0) : '—'} hint='promedio 7 días' /></CardContent></Card>
          </div>

          {/* Order book del arma */}
          <Card>
            <CardHeader><CardTitle className='text-sm'>Order book — {data.baseItem?.name}</CardTitle><CardDescription>Precio · cantidad (nº de órdenes) — en vivo</CardDescription></CardHeader>
            <CardContent><OrderBook book={data.itemBook} /></CardContent>
          </Card>

          {/* Gráficas del arma */}
          <Card>
            <CardHeader><CardTitle className='text-sm'>Historial — {data.baseItem?.name}</CardTitle></CardHeader>
            <CardContent><VolumeAndPrice history={data.itemHistory} label='el arma' /></CardContent>
          </Card>

          {/* Order book + historial de la runa */}
          <Card>
            <CardHeader><CardTitle className='text-sm'>Order book — {data.suffixItem?.name} (lo que vas a vender)</CardTitle></CardHeader>
            <CardContent className='space-y-6'>
              <OrderBook book={data.runeBook} />
              <VolumeAndPrice history={data.runeHistory} label='la runa' />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
