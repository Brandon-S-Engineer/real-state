'use client'

import { formatCopper } from '@/lib/gw2/format'

type Listing = { listings: number; unit_price: number; quantity: number }
type Book = { buys: Listing[]; sells: Listing[] } | null

function Side({ title, rows, accent }: { title: string; rows: Listing[]; accent: string }) {
  // sells vienen ascendente (más barato primero) = lo que verías al comprar;
  // buys descendente (mejor oferta primero) — la API ya los ordena así.
  const top = rows.slice(0, 15)
  const maxQty = Math.max(...top.map((r) => r.quantity), 1)
  return (
    <div className='flex-1 min-w-0'>
      <div className='text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5'>{title}</div>
      <div className='space-y-px'>
        {top.length === 0 ? (
          <div className='text-sm text-muted-foreground py-2'>Sin órdenes.</div>
        ) : (
          top.map((r, i) => (
            <div key={i} className='relative flex items-center justify-between text-sm px-2 py-1 rounded overflow-hidden'>
              <div className='absolute inset-y-0 left-0 opacity-10' style={{ width: `${(r.quantity / maxQty) * 100}%`, background: accent }} />
              <span className='relative tabular-nums font-mono'>{formatCopper(r.unit_price)}</span>
              <span className='relative tabular-nums text-muted-foreground text-xs'>
                {r.quantity.toLocaleString('es-MX')} <span className='opacity-60'>({r.listings})</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function OrderBook({ book }: { book: Book }) {
  if (!book) return <div className='text-sm text-muted-foreground'>Sin order book disponible.</div>
  return (
    <div className='flex gap-6'>
      <Side title='Compradores (bid)' rows={book.buys} accent='#2a78d6' />
      <Side title='Vendedores (ask)' rows={book.sells} accent='#eb6834' />
    </div>
  )
}
