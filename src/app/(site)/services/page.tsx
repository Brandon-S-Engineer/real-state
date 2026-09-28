import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react'
import { site } from '@/content/site'
import { aiServices, getAiServiceDetails, otherServices } from '@/content/services'

export const metadata: Metadata = {
  title: 'Services — AI builds at a fixed price',
  description:
    'Four levels of AI, from simple workflow automation to multi-agent systems — fixed price, fixed timeline, each with a live demo.',
}

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

export default function ServicesPage() {
  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-20'>
      <div className='site-rise max-w-[62ch]'>
        <span className='site-kicker'>Services</span>
        <h1
          className='site-display mt-3.5 font-bold'
          style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: '-0.035em', lineHeight: 1.03 }}>
          AI that does real work. Fixed price.
        </h1>
        <p className='mt-[18px] text-[18px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          Four levels, from a simple automation to a team of AI agents. Find the one that
          matches your problem, try its live demo, and get a fixed quote.
        </p>
      </div>

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
          {aiServices.map((s, i) => {
            const d = getAiServiceDetails(s)
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
                    {d.tierLabel}
                  </p>

                  <div className='mt-4 flex items-baseline justify-between gap-2'>
                    <span
                      className='site-display text-[26px] font-bold'
                      style={{ letterSpacing: '-0.03em' }}>
                      {s.price}
                    </span>
                    <span className='site-mono text-xs whitespace-nowrap' style={{ color: 'var(--muted)' }}>
                      {d.timeline}
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
                    {d.stack.slice(0, 3).map((t) => (
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
                      href={site.calendlyUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={`site-btn ${top ? 'site-btn-accent' : 'site-btn-outline'} h-10 text-[14px]`}>
                      Start this
                    </a>
                    <Link
                      href={`/work/${s.work}`}
                      className='inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold'>
                      See it running
                      <ArrowUpRight className='h-3.5 w-3.5' style={{ color: 'var(--accent)' }} />
                    </Link>
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

      {/* ── Secondary offers ──────────────────────────────────────────── */}
      <div className='mt-20'>
        <span className='site-kicker'>Also available</span>
        <h2
          className='site-display mt-3 font-bold'
          style={{ fontSize: 'clamp(24px,3vw,30px)', letterSpacing: '-0.03em' }}>
          The product around the AI.
        </h2>
        <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
          {otherServices.map((s) => (
            <Link
              key={s.name}
              href={`/work#${s.workAnchor}`}
              className='site-lift flex flex-col rounded-[18px] p-[22px]'
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className='flex items-baseline justify-between gap-3'>
                <h3 className='site-display text-[18px] font-semibold' style={{ letterSpacing: '-0.02em' }}>
                  {s.name}
                </h3>
                <span className='site-mono text-[13px] font-semibold whitespace-nowrap'>{s.price}</span>
              </div>
              <p className='mt-2 flex-1 text-[14px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
                {s.summary}
              </p>
              <span className='mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold'>
                See examples
                <ArrowUpRight className='h-3.5 w-3.5' style={{ color: 'var(--accent)' }} />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div
        className='relative mt-16 mb-24 overflow-hidden rounded-[22px] px-10 py-12 text-center'
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <h3
          className='site-display font-bold'
          style={{ fontSize: 'clamp(24px,3vw,32px)', letterSpacing: '-0.03em' }}>
          Something else in mind?
        </h3>
        <p className='mx-auto mt-3.5 max-w-[46ch] text-base' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          If your project doesn’t fit a box, send the details. Most builds get a fixed quote within
          a day.
        </p>
        <a
          href={`mailto:${site.email}`}
          className='site-btn site-btn-inverse mt-6 h-12 px-6 text-[15.5px]'>
          Email me the scope
        </a>
      </div>
    </section>
  )
}
