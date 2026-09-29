'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Check, ExternalLink } from 'lucide-react'

export type LadderItem = {
  tier: 1 | 2 | 3 | 4
  name: string
  pickIf: string
  youGet: string[]
  price: string
  timeline: string
  tierLabel: string
  stack: string[]
  tagline: string
  // title of the concrete example project shown in the demo stage
  exampleTitle: string
  demoUrl: string
}

// Stage iframe height — the budget every demo is designed to fit on desktop.
const FRAME_MIN = 560

// Desktop staircase: each tier starts a step higher than the one before.
const STEP_OFFSET = ['lg:pt-[96px]', 'lg:pt-[64px]', 'lg:pt-[32px]', 'lg:pt-0']

function LevelBars({ tier }: { tier: number }) {
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

export default function ServicesLadder({ items, calendlyUrl }: { items: LadderItem[]; calendlyUrl: string }) {
  const [active, setActive] = useState(0)
  const [frameH, setFrameH] = useState(FRAME_MIN)
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const current = items[active]

  function select(i: number) {
    // same level = same iframe, nothing reloads, so keep its fitted height
    if (i === active) return
    setActive(i)
    setFrameH(FRAME_MIN)
  }

  function showDemo(i: number) {
    select(i)
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // The iframe grows to fit its demo so it never scrolls internally (demos
  // are same-origin). Grow-only: demo pages are min-h-screen, so their
  // height never reads smaller than the frame itself.
  function fitFrame(frame: HTMLIFrameElement) {
    const win = frame.contentWindow as (Window & typeof globalThis) | null
    const doc = frame.contentDocument
    if (!win || !doc || doc.readyState !== 'complete' || doc.URL === 'about:blank') return
    const fit = () => setFrameH((h) => Math.max(h, doc.documentElement.scrollHeight))
    fit()
    new win.ResizeObserver(fit).observe(doc.body)
  }

  // The first demo can finish loading before hydration attaches onLoad.
  useEffect(() => {
    if (frameRef.current) fitFrame(frameRef.current)
  }, [])

  return (
    <>
      {/* ── AI ladder ─────────────────────────────────────────────────── */}
      <div className='mt-14'>
        <div
          className='site-mono hidden items-center gap-3 text-[11px] uppercase lg:flex'
          style={{ letterSpacing: '0.06em', color: 'var(--muted)' }}>
          <span>Simpler · faster to ship</span>
          <span
            className='h-px flex-1'
            style={{ background: 'linear-gradient(90deg, var(--border), var(--accent))' }}
          />
          <ArrowRight className='h-3.5 w-3.5' style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--accent)' }}>More autonomous · more capable</span>
        </div>

        <div className='mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-4'>
          {items.map((s, i) => {
            const top = s.tier === 4
            return (
              <div key={s.tier} className={STEP_OFFSET[i]}>
                <div
                  className='flex h-full flex-col rounded-[20px] p-[22px]'
                  style={{
                    background: 'var(--card)',
                    border: top ? '1px solid var(--accent)' : '1px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                  }}>
                  <div className='flex items-center justify-between gap-2'>
                    <span
                      className='site-mono text-[11px] font-bold uppercase'
                      style={{ letterSpacing: '0.06em', color: 'var(--accent)' }}>
                      Level {s.tier}
                    </span>
                    <LevelBars tier={s.tier} />
                  </div>
                  <h2
                    className='site-display mt-3 text-[20px] font-semibold'
                    style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {s.name}
                  </h2>
                  <p className='site-mono mt-1.5 text-[11px]' style={{ color: 'var(--muted)' }}>
                    {s.tierLabel}
                  </p>

                  <div className='mt-4 flex items-baseline justify-between gap-2'>
                    <span className='site-display text-[26px] font-bold' style={{ letterSpacing: '-0.03em' }}>
                      {s.price}
                    </span>
                    <span className='site-mono text-xs whitespace-nowrap' style={{ color: 'var(--muted)' }}>
                      {s.timeline}
                    </span>
                  </div>

                  <p
                    className='mt-4 rounded-xl px-3 py-2.5 text-[13.5px]'
                    style={{ lineHeight: 1.45, background: 'var(--bg-2)' }}>
                    <span className='font-semibold'>Pick this if </span>
                    <span style={{ color: 'var(--muted)' }}>{s.pickIf}</span>
                  </p>

                  <ul className='mt-4 flex list-none flex-col gap-2 p-0'>
                    {s.youGet.map((g) => (
                      <li key={g} className='flex items-start gap-2 text-[13.5px]' style={{ lineHeight: 1.45 }}>
                        <Check
                          className='mt-0.5 h-3.5 w-3.5 shrink-0'
                          style={{ color: 'var(--live)' }}
                          strokeWidth={2.8}
                        />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>

                  <div className='mt-4 flex flex-wrap gap-1.5'>
                    {s.stack.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className='site-mono rounded-md px-2 py-[2px] text-[10.5px]'
                        style={{ color: 'var(--muted)', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className='mt-auto flex flex-col gap-2.5 pt-5'>
                    <a
                      href={calendlyUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={`site-btn ${top ? 'site-btn-accent' : 'site-btn-outline'} h-10 text-[14px]`}>
                      Start this
                    </a>
                    <button
                      type='button'
                      onClick={() => showDemo(i)}
                      className='inline-flex cursor-pointer items-center justify-center gap-1.5 text-[13px] font-semibold'>
                      See it running
                      <ArrowDown className='h-3.5 w-3.5' style={{ color: 'var(--accent)' }} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className='mt-5 text-[14px]' style={{ color: 'var(--muted)' }}>
          Not sure which level you need? Describe the problem — I’ll tell you the lowest level that
          solves it.
        </p>
      </div>

      {/* ── Live demo stage ───────────────────────────────────────────── */}
      <div ref={stageRef} className='mt-20 scroll-mt-20'>
        <span className='site-kicker'>Live demo</span>
        <h2
          className='site-display mt-3 font-bold'
          style={{ fontSize: 'clamp(24px,3vw,30px)', letterSpacing: '-0.03em' }}>
          See each level running.
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
                onClick={() => select(i)}
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
          {/* key forces a fresh demo (idle state) on every level switch */}
          <iframe
            key={current.demoUrl}
            src={`${current.demoUrl}?embed=1`}
            title={`Live demo — Level ${current.tier} example: ${current.exampleTitle}`}
            loading='lazy'
            ref={frameRef}
            onLoad={(e) => fitFrame(e.currentTarget)}
            scrolling='no'
            className='block w-full'
            style={{ height: frameH, border: 0, background: 'var(--bg-2)' }}
          />
        </div>
      </div>
    </>
  )
}
