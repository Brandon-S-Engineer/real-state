// "Resale Intelligence" completo: el mismo componente se ve como página
// (/resale) y embebido en el home dentro de un marco de navegador.

import { ArrowRight } from 'lucide-react'
import type { MarketSnapshot } from '@/lib/resale/types'
import MarketRanges from './market-ranges'
import ResaleWorkbench from './resale-workbench'

const fmtN = (n: number) => n.toLocaleString('en-US')
const fmtDate = (iso: string, withTime = false) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    timeZone: 'America/Mexico_City',
  }).format(new Date(iso))

const PIPELINE = [
  ['Chrome extension', 'captures the Marketplace listings I browse'],
  ['Ingest API', 'zod-validated, deduped, price history'],
  ['Parser + scoring', 'deterministic specs, P25/P75, sold detection'],
  ['Postgres', 'listings, price changes, zones'],
  ['Agents', 'LLM judgment on top of the numbers'],
]

export default function ResaleIntel({ snapshot }: { snapshot: MarketSnapshot | null }) {
  if (!snapshot) {
    return (
      <p className='text-[14px]' style={{ color: 'var(--muted)' }}>
        Live market data is temporarily unavailable.
      </p>
    )
  }
  const { totals } = snapshot
  const kpis = [
    ['Listings tracked', fmtN(totals.tracked), snapshot.firstCapture ? `since ${fmtDate(snapshot.firstCapture)}` : ''],
    ['Likely sold', fmtN(totals.gone), 'tracked ≥20 h, then gone'],
    ['Price changes logged', fmtN(totals.priceChanges), 'every re-capture'],
    ['New in last 7 days', fmtN(totals.new7d), 'iPhone, iPad, Mac, audio'],
  ]

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='max-w-[64ch] text-[15px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          I resell used Apple devices in Mexico City. This is the system I built to run it: a Chrome extension feeds every
          listing I browse into Postgres, deterministic code turns them into a live price model, and a multi-agent desk
          decides which deals are worth buying.
        </p>
        {snapshot.lastCapture && (
          <span
            className='site-mono inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px]'
            style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
            <span className='site-pulse h-[7px] w-[7px] rounded-full' style={{ background: 'var(--live)' }} />
            real data · last capture {fmtDate(snapshot.lastCapture, true)}
          </span>
        )}
      </div>

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {kpis.map(([k, v, sub]) => (
          <div key={k} className='rounded-[14px] p-4' style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className='text-[12.5px]' style={{ color: 'var(--muted)' }}>
              {k}
            </p>
            <p className='site-display mt-1 text-[26px] font-bold' style={{ letterSpacing: '-0.03em' }}>
              {v}
            </p>
            <p className='site-mono text-[11px]' style={{ color: 'var(--muted)' }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      <ol className='grid gap-2 sm:grid-cols-5'>
        {PIPELINE.map(([name, desc], i) => (
          <li
            key={name}
            className='relative rounded-[12px] px-3 py-2.5'
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <span className='site-mono text-[10.5px]' style={{ color: 'var(--accent)' }}>
              0{i + 1}
            </span>
            <p className='text-[13px] font-medium'>{name}</p>
            <p className='mt-0.5 text-[11.5px]' style={{ color: 'var(--muted)', lineHeight: 1.4 }}>
              {desc}
            </p>
            {i < PIPELINE.length - 1 && (
              <ArrowRight
                className='absolute top-1/2 -right-[13px] z-10 hidden h-4 w-4 -translate-y-1/2 sm:block'
                style={{ color: 'var(--muted)' }}
              />
            )}
          </li>
        ))}
      </ol>

      <MarketRanges bands={snapshot.bands} />
      <ResaleWorkbench opportunities={snapshot.opportunities} />
    </div>
  )
}
