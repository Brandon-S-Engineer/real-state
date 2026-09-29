'use client'

import { useEffect, useRef, useState, type Ref } from 'react'
import { ExternalLink } from 'lucide-react'
import type { LadderItem } from '@/content/services'

// Stage iframe height — the budget every demo is designed to fit on desktop.
const FRAME_MIN = 560

export function LevelBars({ tier }: { tier: number }) {
  return (
    <span className='flex items-end gap-[3px]' aria-hidden>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className='w-[5px] rounded-sm'
          style={{
            height: 5 + n * 3,
            background: n <= tier ? 'var(--accent)' : 'var(--border)',
          }}
        />
      ))}
    </span>
  )
}

// The iframe grows to fit its demo so it never scrolls internally (demos are
// same-origin). Grow-only: demo pages are min-h-screen, so their height never
// reads smaller than the frame itself. Keyed per demo by the caller, so the
// height resets on every level switch.
function FittedFrame({ src, title }: { src: string; title: string }) {
  const [height, setHeight] = useState(FRAME_MIN)
  const ref = useRef<HTMLIFrameElement>(null)

  function fit(frame: HTMLIFrameElement) {
    const win = frame.contentWindow as (Window & typeof globalThis) | null
    const doc = frame.contentDocument
    if (!win || !doc || doc.readyState !== 'complete' || doc.URL === 'about:blank') return
    const measure = () => setHeight((h) => Math.max(h, doc.documentElement.scrollHeight))
    measure()
    new win.ResizeObserver(measure).observe(doc.body)
  }

  // The first demo can finish loading before hydration attaches onLoad.
  useEffect(() => {
    if (ref.current) fit(ref.current)
  }, [])

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      loading='lazy'
      onLoad={(e) => fit(e.currentTarget)}
      scrolling='no'
      className='block w-full'
      style={{ height, border: 0, background: 'var(--bg-2)' }}
    />
  )
}

export default function DemoStage({
  items,
  active,
  onSelect,
  heading,
  stageRef,
  id,
}: {
  items: LadderItem[]
  active: number
  onSelect: (i: number) => void
  heading: string
  stageRef?: Ref<HTMLDivElement>
  id?: string
}) {
  const current = items[active]

  return (
    <div ref={stageRef} id={id} className='scroll-mt-20'>
      <span className='site-kicker'>Live demo</span>
      <h2
        className='site-display mt-3 font-bold'
        style={{ fontSize: 'clamp(24px,3vw,30px)', letterSpacing: '-0.03em' }}>
        {heading}
      </h2>

      <div className='mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4' role='tablist'>
        {items.map((s, i) => {
          const on = i === active
          return (
            <button
              key={s.tier}
              type='button'
              role='tab'
              aria-selected={on}
              onClick={() => onSelect(i)}
              className='flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors'
              style={{
                background: on ? 'var(--card)' : 'transparent',
                border: on ? '1px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: on ? 'var(--shadow)' : 'none',
              }}>
              <LevelBars tier={s.tier} />
              <span className='min-w-0'>
                <span
                  className='site-mono block text-[10.5px] font-bold uppercase'
                  style={{ letterSpacing: '0.06em', color: on ? 'var(--accent)' : 'var(--muted)' }}>
                  Level {s.tier}
                  <span className='hidden sm:inline'> · Example</span>
                </span>
                <span className='block text-[13px] leading-snug font-semibold'>{s.exampleTitle}</span>
              </span>
            </button>
          )
        })}
      </div>

      <p className='mt-5 max-w-[70ch] text-[15px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
        {current.tagline}
      </p>

      <div
        className='mx-auto mt-5 max-w-[820px] overflow-hidden rounded-[20px]'
        style={{ border: '1px solid var(--border)', background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
        {/* Browser chrome */}
        <div className='flex items-center gap-2 px-4 py-3' style={{ borderBottom: '1px solid var(--border)' }}>
          <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.72 0.17 25)' }} />
          <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.83 0.15 85)' }} />
          <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.75 0.15 150)' }} />
          <span
            className='site-mono ml-2 hidden flex-1 truncate rounded-md px-2.5 py-1 text-[11.5px] sm:block'
            style={{ background: 'var(--bg-2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            {current.demoUrl}
          </span>
          <span
            className='site-mono ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px]'
            style={{ color: 'var(--live)' }}>
            <span className='site-pulse h-1.5 w-1.5 rounded-full' style={{ background: 'var(--live)' }} />
            live · interactive
          </span>
          <a
            href={current.demoUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='site-mono inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-semibold'
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
            Full screen
            <ExternalLink className='h-3 w-3' />
          </a>
        </div>
        {/* key forces a fresh demo (idle state + fresh height) on every level switch */}
        <FittedFrame
          key={current.demoUrl}
          src={`${current.demoUrl}?embed=1`}
          title={`Live demo — Level ${current.tier} example: ${current.exampleTitle}`}
        />
      </div>
    </div>
  )
}
