'use client'

// Rango real de precios por modelo: barra = 50% central de los precios
// pedidos (P25–P75), marca = mediana. Una sola serie, así que no hay leyenda
// de colores; el detalle de la fila activa aparece abajo (hover o foco).

import { useState } from 'react'
import { CATEGORY_LABEL, MARKET_CATEGORIES, type MarketCategory, type ModelBand } from '@/lib/resale/types'

const mxn = (n: number) => `$${n.toLocaleString('en-US')}`

export default function MarketRanges({ bands }: { bands: Record<MarketCategory, ModelBand[]> }) {
  const cats = MARKET_CATEGORIES.filter((c) => bands[c].length)
  const [cat, setCat] = useState<MarketCategory>(cats[0] ?? 'IPHONE')
  const [hover, setHover] = useState(0)
  const rows = bands[cat]
  if (!rows.length) return null
  const lo = Math.min(...rows.map((r) => r.p25)) * 0.9
  const hi = Math.max(...rows.map((r) => r.p75)) * 1.04
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  const active = rows[Math.min(hover, rows.length - 1)]

  return (
    <div className='rounded-[16px] p-4 sm:p-5' style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <p className='site-kicker'>What used Apple devices really sell for in Mexico City</p>
          <p className='mt-1 text-[13px]' style={{ color: 'var(--muted)' }}>
            Bar = middle 50% of asking prices (P25–P75) · tick = median · MXN
          </p>
        </div>
        <div className='flex flex-wrap gap-1.5' role='tablist'>
          {cats.map((c) => (
            <button
              key={c}
              type='button'
              role='tab'
              aria-selected={c === cat}
              onClick={() => {
                setCat(c)
                setHover(0)
              }}
              className='rounded-full px-3 py-1 text-[12.5px]'
              style={{
                border: '1px solid var(--border)',
                background: c === cat ? 'var(--accent-soft)' : 'transparent',
                color: c === cat ? 'var(--accent)' : 'var(--muted)',
              }}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <ul className='mt-4 space-y-0.5'>
        {rows.map((r, i) => (
          <li
            key={r.key}
            tabIndex={0}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            className='grid cursor-default grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-[8px] px-1.5 py-1.5 outline-none sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_5.5rem]'
            style={{ background: i === hover ? 'var(--bg-2)' : 'transparent' }}>
            <span className='truncate text-[13px] font-medium'>{r.label}</span>
            <span className='relative order-3 col-span-2 h-[16px] sm:order-2 sm:col-span-1'>
              <span className='absolute top-1/2 h-px w-full -translate-y-1/2' style={{ background: 'var(--border)' }} />
              <span
                className='absolute top-1/2 h-[10px] -translate-y-1/2 rounded-[4px]'
                style={{
                  left: x(r.p25),
                  width: `calc(${x(r.p75)} - ${x(r.p25)})`,
                  background: 'color-mix(in oklch, var(--accent) 38%, transparent)',
                }}
              />
              <span
                className='absolute top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full'
                style={{ left: x(r.p50), background: 'var(--accent)' }}
              />
            </span>
            <span className='site-mono order-2 text-right text-[12px] sm:order-3'>{mxn(r.p50)}</span>
          </li>
        ))}
      </ul>

      <div
        className='site-mono mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] px-3 py-2 text-[11.5px]'
        style={{ background: 'var(--bg-2)', color: 'var(--muted)' }}
        aria-live='polite'>
        <span style={{ color: 'var(--fg)' }}>{active.label}</span>
        <span>P25 {mxn(active.p25)}</span>
        <span>median {mxn(active.p50)}</span>
        <span>P75 {mxn(active.p75)}</span>
        <span>{active.n.toLocaleString('en-US')} listings</span>
        <span>{active.gone.toLocaleString('en-US')} sold</span>
        {active.medianDays != null && <span>sells in ~{active.medianDays} d</span>}
      </div>
    </div>
  )
}
