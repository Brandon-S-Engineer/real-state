import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { site } from '@/content/site'

export const metadata: Metadata = {
  title: `About — ${site.name}`,
  description: site.subhead,
}

const principles = [
  'I ship a working demo before you commit — you buy proof, not promises.',
  'Fixed price and fixed timeline, agreed up front.',
  'Clean, typed, documented code you fully own. No lock-in.',
  'Fast, direct communication — no account managers, no hand-offs.',
]

const initials = site.name
  .split(' ')
  .map((w) => w[0])
  .join('')
  .slice(0, 2)

export default function AboutPage() {
  return (
    <section className='site-rise mx-auto max-w-[820px] px-6 pt-20'>
      {/* Header */}
      <div className='flex items-center gap-[18px]'>
        <span
          className='site-display grid h-16 w-16 shrink-0 place-items-center rounded-[18px] text-[26px] font-bold'
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {initials}
        </span>
        <div>
          <span className='site-kicker'>About</span>
          <h1
            className='site-display mt-2 font-bold'
            style={{ fontSize: 'clamp(30px,4vw,44px)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            {site.name}
          </h1>
        </div>
      </div>

      {/* Intro */}
      <div className='mt-9 flex flex-col gap-[22px]'>
        <p className='text-[20px]' style={{ lineHeight: 1.6, textWrap: 'pretty' }}>
          I’m {site.name}, a full-stack &amp; AI engineer who builds production-ready web apps fast.
          My focus is narrow on purpose:{' '}
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>
            MVPs, AI agents and chatbots, and SaaS dashboards
          </span>{' '}
          — the things clients need shipped quickly and correctly.
        </p>
        <p className='text-[18px]' style={{ lineHeight: 1.6, color: 'var(--muted)', textWrap: 'pretty' }}>
          Most projects stall in planning. I flip that: you get a clickable demo within a couple of
          days, so we’re talking about something real instead of a document. That speed comes from a
          tight, modern stack — Next.js, TypeScript, and the current generation of AI tools — not
          from cutting corners.
        </p>
      </div>

      {/* Principles */}
      <h2 className='site-kicker mt-[52px]'>How I operate</h2>
      <div className='mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2'>
        {principles.map((p) => (
          <div
            key={p}
            className='flex items-start gap-3 rounded-[14px] px-[22px] py-5'
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <Check
              className='mt-0.5 h-[18px] w-[18px] shrink-0'
              style={{ color: 'var(--live)' }}
              strokeWidth={2.4}
            />
            <span className='text-[15.5px]' style={{ lineHeight: 1.5, textWrap: 'pretty' }}>
              {p}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className='mt-12 mb-24 flex flex-wrap gap-3'>
        <a
          href={site.calendlyUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='site-btn site-btn-accent h-12 px-6 text-[15.5px]'>
          Book a call
        </a>
        <a
          href={site.upworkUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='site-btn site-btn-outline h-12 px-6 text-[15.5px]'>
          Hire me on Upwork
        </a>
      </div>
    </section>
  )
}
