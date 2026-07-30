'use client'

// The Loop — membership portal demo. Gated lesson library: free previews +
// locked premium content, Stripe subscription unlock, and a member billing bar.
// Production syncs access to subscription status via Stripe webhooks.

import { useState } from 'react'
import { Check, CreditCard, Lock, Play, Sparkles } from 'lucide-react'
import StripeCheckout from '@/components/demos/shared/stripe-checkout'

const C = {
  bg: 'oklch(0.16 0.015 285)',
  panel: 'oklch(0.205 0.018 285)',
  panelUp: 'oklch(0.25 0.02 285)',
  border: 'oklch(1 0 0 / 0.09)',
  fg: 'oklch(0.93 0.008 285)',
  muted: 'oklch(0.63 0.015 285)',
  accent: 'oklch(0.72 0.16 60)',
  accentSoft: 'oklch(0.72 0.16 60 / 0.14)',
  green: 'oklch(0.75 0.15 158)',
}

const LESSONS = [
  { n: '01', title: 'Positioning: pick a niche that pays', mins: 18, free: true, hue: 60 },
  { n: '02', title: 'The offer: productize your service', mins: 24, free: true, hue: 25 },
  { n: '03', title: 'Pricing psychology for freelancers', mins: 21, free: false, hue: 300 },
  { n: '04', title: 'Outreach systems that don’t feel gross', mins: 27, free: false, hue: 210 },
  { n: '05', title: 'Closing calls: the 20-minute framework', mins: 19, free: false, hue: 150 },
  { n: '06', title: 'Retainers: from projects to recurring', mins: 23, free: false, hue: 350 },
]

export default function MembershipDemo() {
  const [member, setMember] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [playing, setPlaying] = useState<string | null>('01')

  const unlocked = LESSONS.filter((l) => member || l.free)
  const progress = Math.round((unlocked.filter((l) => l.n <= (playing ?? '01')).length / LESSONS.length) * 100)

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      {/* Header */}
      <header className='flex h-14 items-center justify-between px-5' style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold' style={{ background: C.accent, color: 'oklch(0.2 0.04 60)', fontFamily: 'var(--font-space-grotesk)' }}>
            ∞
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>The Loop</span>
          <span className='ml-1 text-[12px]' style={{ color: C.muted }}>· freelance business school</span>
        </div>
        {member ? (
          <span className='inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold' style={{ background: C.accentSoft, color: C.accent }}>
            <Sparkles className='h-3.5 w-3.5' /> Member
          </span>
        ) : (
          <button
            onClick={() => setCheckout(true)}
            className='rounded-lg px-3.5 py-1.5 text-[13px] font-semibold'
            style={{ background: C.accent, color: 'oklch(0.2 0.04 60)' }}>
            Join — $15/mo
          </button>
        )}
      </header>

      {/* Member billing bar */}
      {member && (
        <div className='flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[12.5px]' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
          <span className='inline-flex items-center gap-2' style={{ color: C.muted }}>
            <Check className='h-3.5 w-3.5' style={{ color: C.green }} />
            Plan active · renews Aug 12, 2026 · $15/mo
          </span>
          <span className='inline-flex cursor-pointer items-center gap-1.5 font-medium transition-opacity hover:opacity-80' style={{ color: C.fg }}>
            <CreditCard className='h-3.5 w-3.5' /> Manage billing (Stripe portal)
          </span>
        </div>
      )}

      <div className='mx-auto max-w-4xl px-5 py-8'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-[24px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>
              The Freelance Escape Path
            </h1>
            <p className='mt-1 text-[14px]' style={{ color: C.muted }}>
              6 lessons · 2h 12m total {member ? '· full access' : '· 2 free previews'}
            </p>
          </div>
          <div className='min-w-40'>
            <div className='flex justify-between text-[11.5px]' style={{ color: C.muted }}>
              <span>Progress</span>
              <span>{member ? progress : 17}%</span>
            </div>
            <div className='mt-1 h-1.5 rounded-full' style={{ background: C.panelUp }}>
              <div className='h-1.5 rounded-full transition-all' style={{ width: `${member ? progress : 17}%`, background: C.accent }} />
            </div>
          </div>
        </div>

        <div className='mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {LESSONS.map((l) => {
            const locked = !member && !l.free
            const active = playing === l.n
            return (
              <button
                key={l.n}
                onClick={() => (locked ? setCheckout(true) : setPlaying(l.n))}
                className='flex flex-col overflow-hidden rounded-xl text-left transition-transform hover:-translate-y-0.5'
                style={{ background: C.panel, border: active ? `1px solid ${C.accent}` : `1px solid ${C.border}` }}>
                <div
                  className='relative grid place-items-center'
                  style={{ height: 110, background: `linear-gradient(135deg, oklch(0.32 0.06 ${l.hue}), oklch(0.22 0.05 ${l.hue + 40}))` }}>
                  <span className='grid h-11 w-11 place-items-center rounded-full' style={{ background: locked ? 'oklch(0 0 0 / 0.45)' : C.accent, color: locked ? C.fg : 'oklch(0.2 0.04 60)' }}>
                    {locked ? <Lock className='h-4.5 w-4.5' style={{ height: 18, width: 18 }} /> : <Play className='ml-0.5 h-4.5 w-4.5' style={{ height: 18, width: 18 }} />}
                  </span>
                  {l.free && !member && (
                    <span className='absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase' style={{ background: C.green, color: 'oklch(0.2 0.05 158)' }}>
                      Free
                    </span>
                  )}
                  {active && !locked && (
                    <span className='absolute right-2.5 bottom-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold' style={{ background: 'oklch(0 0 0 / 0.5)', color: C.accent }}>
                      ▶ playing
                    </span>
                  )}
                </div>
                <div className='flex flex-1 flex-col p-3.5'>
                  <span className='text-[11px] font-semibold' style={{ color: C.accent, fontFamily: 'var(--font-jetbrains), monospace' }}>
                    LESSON {l.n}
                  </span>
                  <p className='mt-1 text-[13.5px] leading-snug font-semibold'>{l.title}</p>
                  <p className='mt-auto pt-2 text-[11.5px]' style={{ color: C.muted }}>
                    {l.mins} min {locked && '· members only'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {!member && (
          <div className='mt-8 rounded-2xl p-6 text-center' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <h2 className='text-[19px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>
              Unlock all 6 lessons + monthly live Q&A
            </h2>
            <p className='mx-auto mt-1.5 max-w-[42ch] text-[13.5px]' style={{ color: C.muted }}>
              Cancel anytime from your own billing portal. Your access syncs with your subscription
              automatically.
            </p>
            <button
              onClick={() => setCheckout(true)}
              className='mt-4 rounded-xl px-6 py-3 text-[14.5px] font-bold transition-transform hover:-translate-y-0.5'
              style={{ background: C.accent, color: 'oklch(0.2 0.04 60)' }}>
              Become a member — $15/mo
            </button>
          </div>
        )}
      </div>

      <StripeCheckout
        open={checkout}
        onClose={() => setCheckout(false)}
        onSuccess={() => setMember(true)}
        title='The Loop — membership'
        amount='$15.00'
        per='/month'
        accent='oklch(0.6 0.14 60)'
        successNote='Welcome in! Stripe webhooks flip your access on instantly — try the locked lessons now.'
      />
    </div>
  )
}
