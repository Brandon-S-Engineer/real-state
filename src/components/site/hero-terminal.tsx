'use client'

import { useEffect, useRef, useState } from 'react'

type Line = { prefix: string; text: string; kind: 'cmd' | 'run' | 'ok' }

const SCRIPT: Line[] = [
  { prefix: '$', text: 'claude ship --spec acme-brief.md', kind: 'cmd' },
  { prefix: '→', text: 'scaffolding Next.js · TypeScript · Tailwind', kind: 'run' },
  { prefix: '→', text: 'wiring auth · Stripe · Postgres', kind: 'run' },
  { prefix: '→', text: 'building core feature + admin panel', kind: 'run' },
  { prefix: '✓', text: 'deployed to production  ·  42h 18m', kind: 'ok' },
]

const colorFor = (k: Line['kind']) =>
  k === 'cmd' ? 'var(--accent)' : k === 'ok' ? 'var(--live)' : 'var(--muted)'
const textFor = (k: Line['kind']) => (k === 'ok' ? 'var(--live)' : 'var(--code-fg)')

export default function HeroTerminal() {
  const [step, setStep] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setStep(SCRIPT.length)
      return
    }
    const total = SCRIPT.length + 1
    const tick = () => {
      setStep((prev) => {
        const next = prev + 1
        return next > total + 3 ? 0 : next
      })
    }
    const schedule = (s: number) => {
      const delay = s + 1 >= total ? 2600 : 850
      timer.current = setTimeout(() => {
        tick()
        schedule((s + 1 > total + 3 ? 0 : s + 1))
      }, delay)
    }
    schedule(0)
    return () => clearTimeout(timer.current)
  }, [])

  const shown = SCRIPT.slice(0, Math.min(step, SCRIPT.length))
  const done = step >= SCRIPT.length

  return (
    <div
      className='overflow-hidden rounded-2xl'
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      {/* Title bar */}
      <div
        className='flex items-center gap-2 px-4 py-[13px]'
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.72 0.17 25)' }} />
        <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.83 0.15 85)' }} />
        <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.75 0.15 150)' }} />
        <span className='site-mono ml-2 text-[11.5px]' style={{ color: 'var(--muted)' }}>
          spec → shipped
        </span>
        <span
          className='site-mono ml-auto inline-flex items-center gap-1.5 text-[11px]'
          style={{ color: 'var(--live)' }}>
          <span
            className='site-pulse h-1.5 w-1.5 rounded-full'
            style={{ background: 'var(--live)', animationDuration: '1.6s' }}
          />
          {done ? 'live' : 'building'}
        </span>
      </div>

      {/* Log body */}
      <div
        className='site-mono px-[18px] pt-[18px] pb-5 text-[13px]'
        style={{ lineHeight: 1.85, minHeight: 224, background: 'var(--code-bg)', color: 'var(--code-fg)' }}>
        {shown.map((line, i) => (
          <div key={i} className='flex gap-2.5 overflow-hidden whitespace-nowrap'>
            <span className='shrink-0' style={{ color: colorFor(line.kind) }}>
              {line.prefix}
            </span>
            <span className='overflow-hidden text-ellipsis' style={{ color: textFor(line.kind) }}>
              {line.text}
            </span>
          </div>
        ))}
        <span
          className='site-blink inline-block h-[15px] w-2 align-[-2px]'
          style={{ background: 'var(--accent)' }}
        />
      </div>
    </div>
  )
}
