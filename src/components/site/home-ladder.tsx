'use client'

import { useRef, useState, type ReactNode } from 'react'
import { ArrowDown } from 'lucide-react'
import type { LadderItem } from '@/content/services'
import DemoStage, { LevelBars } from './demo-stage'

// Step heights for the hero staircase — each level visibly higher than the last.
const STEP_H = ['h-[124px] sm:h-[132px]', 'h-[156px] sm:h-[172px]', 'h-[188px] sm:h-[212px]', 'h-[220px] sm:h-[252px]']

// Hero (server-rendered intro + clickable staircase) and the live demo stage
// share one selected level: clicking a step scrolls down to its demo.
export default function HomeLadder({ intro, items }: { intro: ReactNode; items: LadderItem[] }) {
  const [active, setActive] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)

  function showDemo(i: number) {
    setActive(i)
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div className='grid items-end gap-12 pt-[88px] lg:grid-cols-[1.05fr_0.95fr]'>
        {intro}

        <div className='site-rise-delay'>
          <div className='grid grid-cols-4 items-end gap-2'>
            {items.map((s, i) => {
              const top = s.tier === 4
              return (
                <button
                  key={s.tier}
                  type='button'
                  onClick={() => showDemo(i)}
                  aria-label={`Level ${s.tier}: ${s.name} — see its live demo`}
                  className={`site-lift flex cursor-pointer flex-col rounded-t-2xl rounded-b-md p-2 text-left sm:p-3.5 ${STEP_H[i]}`}
                  style={{
                    background: 'var(--card)',
                    border: top ? '1px solid var(--accent)' : '1px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                  }}>
                  <LevelBars tier={s.tier} />
                  <span
                    className='site-mono mt-2.5 text-[10px] font-bold uppercase sm:text-[10.5px]'
                    style={{ letterSpacing: '0.06em', color: 'var(--accent)' }}>
                    Level {s.tier}
                  </span>
                  <span className='mt-1 text-[11px] leading-snug font-semibold sm:text-[13.5px]'>{s.name}</span>
                  <span className='site-mono mt-auto hidden pt-2 text-[11px] sm:block' style={{ color: 'var(--muted)' }}>
                    {s.price}
                  </span>
                </button>
              )
            })}
          </div>
          <div className='mt-2 h-px' style={{ background: 'linear-gradient(90deg, var(--border), var(--accent))' }} />
          <p
            className='site-mono mt-3 flex items-center justify-center gap-1.5 text-[11px] uppercase'
            style={{ letterSpacing: '0.06em', color: 'var(--muted)' }}>
            Click a level to try its live demo
            <ArrowDown className='h-3 w-3' style={{ color: 'var(--accent)' }} />
          </p>
        </div>
      </div>

      <div className='mt-24'>
        <DemoStage
          id='demos'
          items={items}
          active={active}
          onSelect={setActive}
          heading='Try any level right now.'
          stageRef={stageRef}
        />
      </div>
    </>
  )
}
