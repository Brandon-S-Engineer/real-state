'use client'

// Alignly — assessment funnel demo (mirrors a real captured Upwork job: quiz →
// scored results → Stripe paywall unlock). Five questions, instant scoring,
// free teaser + locked premium sections, one-click Stripe unlock.

import { useEffect, useRef, useState } from 'react'
import { Check, Heart, Loader2, Lock, Sparkles } from 'lucide-react'
import StripeCheckout from '@/components/demos/shared/stripe-checkout'

const C = {
  bg: 'oklch(0.98 0.005 350)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.3 0.03 350 / 0.13)',
  fg: 'oklch(0.26 0.03 345)',
  muted: 'oklch(0.52 0.02 345)',
  accent: 'oklch(0.6 0.19 355)',
  accentSoft: 'oklch(0.6 0.19 355 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
}

const QUESTIONS = [
  { q: 'When you disagree, what happens most often?', opts: ['We talk it through the same day', 'One of us goes quiet for a while', 'It turns into a bigger argument', 'We avoid the topic entirely'] },
  { q: 'How do you usually make big decisions?', opts: ['Together, after real discussion', 'One of us leads, the other agrees', 'Separately, then we sync', 'We tend to postpone them'] },
  { q: 'How often do you laugh together in a normal week?', opts: ['Every day', 'A few times a week', 'Mostly on weekends', 'Less than we used to'] },
  { q: 'When one of you is stressed, the other usually…', opts: ['Notices and steps in', 'Helps if asked directly', 'Gives space (maybe too much)', 'Doesn’t always notice'] },
  { q: 'Your future plans are…', opts: ['Aligned and explicit', 'Roughly similar, never discussed', 'Different but negotiable', 'We haven’t gone there'] },
]

const LOCKED = [
  { title: 'Communication pattern deep-dive', body: 'Your specific conflict loop, what triggers it, and the 3-step repair script tailored to your answers.' },
  { title: 'The 4-week alignment plan', body: 'One micro-exercise per week, calibrated to your weakest dimension. Takes under 15 minutes each.' },
  { title: 'Conversation starters that actually work', body: '12 prompts matched to your profile — designed to open the topics you’ve been avoiding.' },
]

export default function AssessmentDemo() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [phase, setPhase] = useState<'quiz' | 'computing' | 'results'>('quiz')
  const [paid, setPaid] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function pickAnswer(i: number) {
    const next = [...answers, i]
    setAnswers(next)
    if (step + 1 < QUESTIONS.length) setStep(step + 1)
    else {
      setPhase('computing')
      timer.current = setTimeout(() => setPhase('results'), 2200)
    }
  }

  // Deterministic-ish score from answers (demo): better answers (index 0) score higher.
  const score = phase === 'results'
    ? Math.max(48, Math.min(94, Math.round(94 - answers.reduce((s, a) => s + a, 0) * 4.5)))
    : 0

  const R = 52
  const circ = 2 * Math.PI * R

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Heart className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Alignly</span>
        </div>
        <span className='text-[12.5px]' style={{ color: C.muted }}>The 2-minute relationship check-in</span>
      </header>

      <div className='mx-auto max-w-xl px-5 py-10'>
        {phase === 'quiz' && (
          <div className='rounded-2xl p-6 shadow-sm' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            {/* progress */}
            <div className='flex items-center justify-between text-[12px]' style={{ color: C.muted }}>
              <span>Question {step + 1} of {QUESTIONS.length}</span>
              <span>~{QUESTIONS.length - step} min left</span>
            </div>
            <div className='mt-2 h-1.5 rounded-full' style={{ background: C.accentSoft }}>
              <div className='h-1.5 rounded-full transition-all duration-300' style={{ width: `${(step / QUESTIONS.length) * 100}%`, background: C.accent }} />
            </div>

            <h2 className='mt-5 text-[19px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>
              {QUESTIONS[step].q}
            </h2>
            <div className='mt-4 flex flex-col gap-2'>
              {QUESTIONS[step].opts.map((o, i) => (
                <button
                  key={o}
                  onClick={() => pickAnswer(i)}
                  className='rounded-xl px-4 py-3 text-left text-[14px] font-medium transition-all hover:-translate-y-0.5'
                  style={{ border: `1px solid ${C.border}`, background: C.bg }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentSoft }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'oklch(0.3 0.03 350 / 0.13)'; e.currentTarget.style.background = 'oklch(0.98 0.005 350)' }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'computing' && (
          <div className='rounded-2xl p-10 text-center shadow-sm' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <Loader2 className='mx-auto h-8 w-8 animate-spin' style={{ color: C.accent }} />
            <p className='mt-4 text-[15px] font-semibold'>Scoring your answers…</p>
            <p className='mt-1 text-[13px]' style={{ color: C.muted }}>Comparing against 12,000+ assessed couples</p>
          </div>
        )}

        {phase === 'results' && (
          <>
            {/* Score */}
            <div className='rounded-2xl p-6 text-center shadow-sm' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className='relative mx-auto h-32 w-32'>
                <svg viewBox='0 0 120 120' className='h-full w-full -rotate-90'>
                  <circle cx='60' cy='60' r={R} fill='none' stroke={C.accentSoft} strokeWidth='10' />
                  <circle
                    cx='60' cy='60' r={R} fill='none' stroke={C.accent} strokeWidth='10' strokeLinecap='round'
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <span className='absolute inset-0 grid place-items-center text-[30px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  {score}
                </span>
              </div>
              <h2 className='mt-3 text-[20px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>
                Your compatibility score
              </h2>
              <p className='mx-auto mt-2 max-w-[40ch] text-[13.5px] leading-relaxed' style={{ color: C.muted }}>
                {score >= 75
                  ? 'Strong foundation — your friction points are specific and fixable. The full report shows exactly where.'
                  : 'There’s real connection here, and clear patterns worth working on. The full report maps them out.'}
              </p>
              <div className='mt-4 flex flex-col gap-2 text-left'>
                <div className='flex items-start gap-2 rounded-xl p-3 text-[13.5px]' style={{ background: C.bg }}>
                  <Check className='mt-0.5 h-4 w-4 shrink-0' style={{ color: C.green }} />
                  <span><b>Free insight:</b> your strongest dimension is shared humor — protect the rituals that create it.</span>
                </div>
                <div className='flex items-start gap-2 rounded-xl p-3 text-[13.5px]' style={{ background: C.bg }}>
                  <Check className='mt-0.5 h-4 w-4 shrink-0' style={{ color: C.green }} />
                  <span><b>Free insight:</b> decisions are where you lose each other — one structured conversation would move your score most.</span>
                </div>
              </div>
            </div>

            {/* Locked sections */}
            <div className='mt-4 flex flex-col gap-3'>
              {LOCKED.map((s) => (
                <div key={s.title} className='relative overflow-hidden rounded-2xl p-5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                  <h3 className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>{s.title}</h3>
                  <p className='mt-1.5 text-[13.5px] leading-relaxed' style={{ color: C.muted, filter: paid ? 'none' : 'blur(5px)', userSelect: paid ? 'auto' : 'none' }}>
                    {s.body}
                  </p>
                  {!paid && (
                    <span className='absolute top-1/2 right-5 -translate-y-1/2'>
                      <Lock className='h-5 w-5' style={{ color: C.accent }} />
                    </span>
                  )}
                </div>
              ))}
            </div>

            {!paid ? (
              <button
                onClick={() => setCheckout(true)}
                className='mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5'
                style={{ background: C.accent }}>
                <Sparkles className='h-4 w-4' /> Unlock the full report — $9
              </button>
            ) : (
              <div className='mt-4 rounded-xl p-3.5 text-center text-[13.5px] font-medium' style={{ background: 'oklch(0.58 0.15 155 / 0.1)', color: C.green, border: `1px solid oklch(0.58 0.15 155 / 0.3)` }}>
                ✓ Full report unlocked — sent to your email too
              </div>
            )}
            <p className='mt-3 text-center text-[11.5px]' style={{ color: C.muted }}>
              One-time payment · instant access · 14-day money-back guarantee
            </p>
          </>
        )}
      </div>

      <StripeCheckout
        open={checkout}
        onClose={() => setCheckout(false)}
        onSuccess={() => setPaid(true)}
        title='Alignly — full report'
        amount='$9.00'
        accent={C.accent}
        successNote='Report unlocked! In the real build Stripe webhooks grant access and trigger the email.'
      />
    </div>
  )
}
