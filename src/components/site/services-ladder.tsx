'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowRight, Check, PlayCircle } from 'lucide-react'
import type { LadderItem } from '@/content/services'
import DemoStage, { LevelBars } from './demo-stage'

// Desktop staircase: each tier starts a step higher than the one before.
const STEP_OFFSET = ['lg:pt-[96px]', 'lg:pt-[64px]', 'lg:pt-[32px]', 'lg:pt-0']

// Published recorded demos per level (only levels that have at least one).
export type RecordedDemos = Record<number, { count: number; href: string }>

export default function ServicesLadder({
  items,
  calendlyUrl,
  recorded = {},
}: {
  items: LadderItem[]
  calendlyUrl: string
  recorded?: RecordedDemos
}) {
  const [active, setActive] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)

  function showDemo(i: number) {
    setActive(i)
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
              <div key={s.tier} id={`level-${s.tier}`} className={`scroll-mt-24 ${STEP_OFFSET[i]}`}>
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
                    {recorded[s.tier] && (
                      <Link
                        href={recorded[s.tier].href}
                        className='inline-flex items-center justify-center gap-1.5 text-[12.5px]'
                        style={{ color: 'var(--muted)' }}>
                        <PlayCircle className='h-3.5 w-3.5' style={{ color: 'var(--accent)' }} />
                        {recorded[s.tier].count} recorded {recorded[s.tier].count === 1 ? 'demo' : 'demos'}
                      </Link>
                    )}
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
      <div className='mt-20'>
        <DemoStage
          items={items}
          active={active}
          onSelect={setActive}
          heading='See each level running.'
          stageRef={stageRef}
        />
      </div>
    </>
  )
}
