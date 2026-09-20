'use client'

// Millbrook Reports — one-time-purchase unlock demo. Paying for the report
// runs a scripted commerce flow: checkout → payment confirmed → webhook
// received → access granted → receipt emailed. No AI, no real Stripe/DB — a
// faithful, self-contained simulation of the flow and the one real-world
// failure mode that matters at this tier: Stripe delivers webhooks *at least
// once*, so the same event can arrive twice. The demo shows the handler
// deduping by event ID instead of double-granting access or double-charging.

import { useEffect, useRef, useState } from 'react'
import {
  Ban, BadgeDollarSign, Check, CreditCard, FileCheck2, Loader2, Lock, Mail, ShieldCheck, Unlock, Webhook,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.006 330)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 330 / 0.12)',
  fg: 'oklch(0.24 0.02 330)',
  muted: 'oklch(0.5 0.015 330)',
  accent: 'oklch(0.6 0.18 330)',
  accentSoft: 'oklch(0.6 0.18 330 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  greenSoft: 'oklch(0.58 0.15 155 / 0.1)',
  gray: 'oklch(0.88 0.006 330)',
  grayFg: 'oklch(0.5 0.01 330)',
}

type StepId = 'checkout' | 'payment' | 'webhook' | 'access' | 'receipt'
type StepStatus = 'pending' | 'active' | 'done' | 'duplicate'
type LogLine = { kind: 'ok' | 'info' | 'skip'; text: string }

const STEPS: { id: StepId; label: string; icon: LucideIcon }[] = [
  { id: 'checkout', label: 'Checkout started', icon: CreditCard },
  { id: 'payment', label: 'Payment confirmed', icon: BadgeDollarSign },
  { id: 'webhook', label: 'Webhook received', icon: Webhook },
  { id: 'access', label: 'Access granted', icon: Unlock },
  { id: 'receipt', label: 'Receipt emailed', icon: Mail },
]

const INITIAL_STATUSES: Record<StepId, StepStatus> = {
  checkout: 'pending', payment: 'pending', webhook: 'pending', access: 'pending', receipt: 'pending',
}

const EVENT_ID = 'evt_3F9kQ2Lm8Xh1'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function OneTimeCheckoutUnlockDemo() {
  const [name, setName] = useState('Priya Shah')
  const [email, setEmail] = useState('priya.shah@example.com')
  const [simulateDuplicate, setSimulateDuplicate] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [statuses, setStatuses] = useState<Record<StepId, StepStatus>>(INITIAL_STATUSES)
  const [duplicateHandled, setDuplicateHandled] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [elapsed, setElapsed] = useState(0)
  const runId = useRef(0)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  async function run(e: React.FormEvent) {
    e.preventDefault()
    if (phase === 'running') return
    const id = ++runId.current
    const started = Date.now()
    setPhase('running')
    setStatuses(INITIAL_STATUSES)
    setDuplicateHandled(false)
    setLog([{ kind: 'info', text: `checkout.session.created — ${name.trim() || 'Customer'} <${email.trim() || 'no email'}> · $19.00` }])

    for (const step of STEPS) {
      if (runId.current !== id) return
      setStatuses((s) => ({ ...s, [step.id]: 'active' }))
      await delay(600)
      if (runId.current !== id) return
      setStatuses((s) => ({ ...s, [step.id]: 'done' }))
      setLog((l) => [...l, { kind: 'ok', text: stepLogText(step.id) }])
    }
    if (runId.current !== id) return

    if (simulateDuplicate) {
      await delay(650)
      if (runId.current !== id) return
      setLog((l) => [...l, { kind: 'info', text: `webhook.received — ${EVENT_ID} (redelivered by Stripe, +3.1s)` }])
      setStatuses((s) => ({ ...s, webhook: 'active' }))
      await delay(750)
      if (runId.current !== id) return
      setLog((l) => [...l, { kind: 'skip', text: `idempotency check — ${EVENT_ID} already processed, skipping` }])
      setStatuses((s) => ({ ...s, webhook: 'duplicate' }))
      setDuplicateHandled(true)
      await delay(300)
      if (runId.current !== id) return
    }

    setElapsed(Date.now() - started)
    setPhase('done')
  }

  const submitLabel = phase === 'running' ? 'Processing…' : phase === 'done' ? 'Buy another report' : 'Pay $19 & unlock'

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <FileCheck2 className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Millbrook Reports</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            one-time purchase · no subscription
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          3,214 reports sold · 0 duplicate charges
        </span>
      </header>

      <div className='mx-auto grid max-w-5xl gap-3 p-3 sm:grid-cols-[0.85fr_1.15fr]'>
        {/* Left: product + checkout form */}
        <div className='flex flex-col gap-2.5'>
          <div
            className='rounded-xl p-3.5'
            style={{ background: C.panel, border: `1px solid ${phase === 'done' ? C.green : C.border}` }}>
            <p
              className='flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase'
              style={{ color: phase === 'done' ? C.green : C.muted, letterSpacing: '0.06em' }}>
              {phase === 'done' && (duplicateHandled ? <ShieldCheck className='h-3.5 w-3.5' /> : <Check className='h-3.5 w-3.5' />)}
              {phase === 'done' ? (duplicateHandled ? 'Duplicate webhook ignored' : 'Access granted') : 'New purchase'}
            </p>
            <p className='mt-1 text-[13px]' style={{ color: phase === 'done' ? C.fg : C.muted, lineHeight: 1.5 }}>
              {phase === 'done'
                ? duplicateHandled
                  ? 'Stripe re-sent the same webhook — already granted, so it was skipped.'
                  : `Paid and unlocked in ${(elapsed / 1000).toFixed(1)}s — one webhook, handled exactly once.`
                : 'Fill this out, then check out to watch checkout → webhook → access run.'}
            </p>
            <form onSubmit={run} className='mt-3 flex flex-col gap-2.5'>
              <div className='rounded-lg p-2.5' style={{ background: phase === 'done' ? C.greenSoft : C.accentSoft }}>
                <div className='flex items-center justify-between'>
                  <span className='flex items-center gap-2 text-[13px] font-semibold'>
                    <FileCheck2 className='h-4 w-4' style={{ color: phase === 'done' ? C.green : C.accent }} />
                    Resume ATS Score Report
                  </span>
                  <span className='text-[13px] font-bold' style={{ color: phase === 'done' ? C.green : C.accent }}>
                    {phase === 'done' ? 'Unlocked' : '$19'}
                  </span>
                </div>
                <div className='mt-1.5 flex items-center gap-1.5 text-[11.5px]' style={{ color: C.muted }}>
                  {phase === 'done' ? (
                    <>
                      <Check className='h-3 w-3 shrink-0' style={{ color: C.green }} />
                      <span style={{ color: C.fg }}>ATS score: <b>82/100</b> — full breakdown + 12 fixes, ready to download</span>
                    </>
                  ) : (
                    <>
                      <Lock className='h-3 w-3 shrink-0' />
                      <span>ATS score: <b style={{ filter: 'blur(3px)' }}>82/100</b> — breakdown locked until purchase</span>
                    </>
                  )}
                </div>
              </div>
              <label className='flex flex-col gap-1.5 text-[12.5px] font-medium'>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className='rounded-lg px-3 py-2 text-[13.5px] outline-none'
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
                />
              </label>
              <label className='flex flex-col gap-1.5 text-[12.5px] font-medium'>
                Email
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='rounded-lg px-3 py-2 text-[13.5px] outline-none'
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
                />
              </label>

              <button
                type='button'
                onClick={() => setSimulateDuplicate((v) => !v)}
                className='mt-1.5 flex items-center justify-between gap-3 rounded-lg p-2.5 text-left'
                style={{ background: simulateDuplicate ? C.accentSoft : C.bg, border: `1px solid ${simulateDuplicate ? C.accent : C.border}` }}>
                <span>
                  <span className='block text-[12.5px] font-semibold'>Simulate a duplicate webhook</span>
                  <span className='block text-[11px]' style={{ color: C.muted }}>
                    Stripe can redeliver the same event — watch it get ignored, not reprocessed
                  </span>
                </span>
                <span
                  className='relative h-6 w-10 shrink-0 rounded-full transition-colors'
                  style={{ background: simulateDuplicate ? C.accent : C.border }}>
                  <span
                    className='absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform'
                    style={{ transform: simulateDuplicate ? 'translateX(17px)' : 'translateX(2px)' }}
                  />
                </span>
              </button>

              <button
                type='submit'
                disabled={phase === 'running'}
                className='mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50'
                style={{ background: C.accent }}>
                {phase === 'running' ? <Loader2 className='h-4 w-4 animate-spin' /> : <CreditCard className='h-4 w-4' />}
                {submitLabel}
              </button>
            </form>
          </div>
        </div>

        {/* Right: flow + log */}
        <div className='flex flex-col gap-2.5'>
          <div className='rounded-xl p-3.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <p className='text-[12px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
              Checkout flow
            </p>
            <div className='relative mt-1.5 flex flex-col'>
              <div className='absolute top-4 bottom-4 left-[17px] w-[2px]' style={{ background: C.border }} />
              {STEPS.map((step) => {
                const status = statuses[step.id]
                const Icon =
                  status === 'active' ? Loader2
                    : status === 'done' ? Check
                    : status === 'duplicate' ? Ban
                    : step.icon
                const circleBg =
                  status === 'done' ? C.green
                    : status === 'active' ? C.accent
                    : status === 'duplicate' ? C.gray
                    : C.panel
                const iconColor = status === 'pending' ? C.muted : status === 'duplicate' ? C.grayFg : 'white'
                const captionColor =
                  status === 'done' ? C.green
                    : status === 'active' ? C.accent
                    : status === 'duplicate' ? C.grayFg
                    : C.muted
                const caption =
                  status === 'pending' ? 'waiting'
                    : status === 'active' ? 'running…'
                    : status === 'duplicate' ? 'duplicate — ignored'
                    : 'done'
                return (
                  <div key={step.id} className='relative flex items-start gap-3 py-1'>
                    <span
                      className='relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full'
                      style={{
                        background: circleBg,
                        color: iconColor,
                        border: status === 'pending' ? `1px solid ${C.border}` : 'none',
                      }}>
                      <Icon className={`h-4 w-4 ${status === 'active' ? 'animate-spin' : ''}`} />
                    </span>
                    <div className='pt-1'>
                      <p className='text-[13px] font-semibold'>{step.label}</p>
                      <p className='text-[11px]' style={{ color: captionColor }}>{caption}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className='overflow-hidden rounded-xl' style={{ border: `1px solid ${C.border}` }}>
            <div className='px-4 py-2.5 text-[12px] font-semibold' style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, fontFamily: 'var(--font-jetbrains), monospace' }}>
              stripe.webhook.log
            </div>
            <div ref={logRef} className='flex flex-col gap-1 overflow-y-auto p-3 text-[12px]' style={{ background: 'oklch(0.21 0.015 330)', minHeight: 72, maxHeight: 100, fontFamily: 'var(--font-jetbrains), monospace' }}>
              {log.length === 0 ? (
                <span style={{ color: 'oklch(0.6 0.01 330)' }}>{'// check out to see the webhook handler run'}</span>
              ) : (
                log.map((l, i) => (
                  <div key={i} className='flex items-start gap-2' style={{ color: logColor(l.kind) }}>
                    <span>{logPrefix(l.kind)}</span>
                    <span>{l.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function stepLogText(id: StepId) {
  switch (id) {
    case 'checkout': return 'checkout.session.created — evt id assigned'
    case 'payment': return 'payment_intent.succeeded — card charged $19.00'
    case 'webhook': return `webhook.received — ${EVENT_ID} (checkout.session.completed)`
    case 'access': return 'access.granted — report unlocked for customer'
    case 'receipt': return 'email.sent — receipt + download link'
  }
}

function logColor(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return 'oklch(0.75 0.15 155)'
    case 'skip': return 'oklch(0.78 0.06 330)'
    default: return 'oklch(0.75 0.01 330)'
  }
}

function logPrefix(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return '✓'
    case 'skip': return '⊘'
    default: return '·'
  }
}
