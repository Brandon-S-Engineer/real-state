'use client'

// Loomwork — recurring subscription billing demo. Subscribing runs a scripted
// commerce flow (invoice → charge → webhook → subscription updated →
// customer notified), same as a one-time purchase. The difference — and the
// one thing worth showing at this tier — is what happens on the SECOND
// charge, months later, when a card fails: a naive system cancels access
// immediately. This one flips to "past due", keeps access, retries
// automatically, and recovers the subscription without the customer ever
// knowing anything went wrong. No AI, no real Stripe/DB — a faithful,
// self-contained simulation of the subscription status state machine.

import { useEffect, useRef, useState } from 'react'
import {
  Check, Clock, CreditCard, Loader2, Lock, Mail, Receipt, RefreshCw, Repeat, ShieldCheck, Webhook,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.006 250)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 250 / 0.12)',
  fg: 'oklch(0.24 0.02 250)',
  muted: 'oklch(0.5 0.015 250)',
  accent: 'oklch(0.58 0.18 250)',
  accentSoft: 'oklch(0.58 0.18 250 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  greenSoft: 'oklch(0.58 0.15 155 / 0.1)',
  amber: 'oklch(0.72 0.14 85)',
  amberSoft: 'oklch(0.72 0.14 85 / 0.14)',
}

type StepId = 'invoice' | 'charge' | 'webhook' | 'subscription' | 'notify'
type StepStatus = 'pending' | 'active' | 'retrying' | 'done'
type LogLine = { kind: 'ok' | 'info' | 'fail' | 'retry' }
type LogEntry = LogLine & { text: string }
type SubStatus = 'none' | 'active' | 'past_due'
type Outcome = 'none' | 'subscribed' | 'renewed' | 'recovered'

const STEPS: { id: StepId; label: string; icon: LucideIcon }[] = [
  { id: 'invoice', label: 'Invoice created', icon: Receipt },
  { id: 'charge', label: 'Charge attempted', icon: CreditCard },
  { id: 'webhook', label: 'Webhook received', icon: Webhook },
  { id: 'subscription', label: 'Subscription updated', icon: RefreshCw },
  { id: 'notify', label: 'Customer notified', icon: Mail },
]

const INITIAL_STATUSES: Record<StepId, StepStatus> = {
  invoice: 'pending', charge: 'pending', webhook: 'pending', subscription: 'pending', notify: 'pending',
}

const FEATURES = ['Unlimited projects', 'Priority support', '3 team seats']

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function SubscriptionBillingDunningDemo() {
  const [name, setName] = useState('Priya Shah')
  const [email, setEmail] = useState('priya.shah@example.com')
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [busy, setBusy] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [status, setStatus] = useState<SubStatus>('none')
  const [outcome, setOutcome] = useState<Outcome>('none')
  const [statuses, setStatuses] = useState<Record<StepId, StepStatus>>(INITIAL_STATUSES)
  const [log, setLog] = useState<LogEntry[]>([])
  const runId = useRef(0)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  async function run(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const id = ++runId.current
    const isFirst = !subscribed
    const willFail = subscribed && simulateFailure
    setBusy(true)
    setStatuses(INITIAL_STATUSES)
    setLog((l) => [
      ...l,
      { kind: 'info', text: isFirst
        ? `checkout.session.completed — creating subscription for ${name.trim() || 'Customer'}`
        : 'invoice.created — next monthly billing cycle' },
    ])

    for (const step of STEPS) {
      if (runId.current !== id) return
      setStatuses((s) => ({ ...s, [step.id]: 'active' }))
      await delay(550)
      if (runId.current !== id) return

      if (step.id === 'charge' && willFail) {
        setStatuses((s) => ({ ...s, charge: 'retrying' }))
        setStatus('past_due')
        setLog((l) => [...l, { kind: 'fail', text: 'charge.failed — card declined (insufficient funds)' }])
        setLog((l) => [...l, { kind: 'retry', text: 'subscription.past_due — access kept, retrying automatically' }])
        await delay(950)
        if (runId.current !== id) return
        setStatuses((s) => ({ ...s, charge: 'done' }))
        setLog((l) => [...l, { kind: 'ok', text: 'charge.succeeded — retry 1, card charged $29.00' }])
      } else {
        setStatuses((s) => ({ ...s, [step.id]: 'done' }))
        setLog((l) => [...l, { kind: 'ok', text: stepLogText(step.id, isFirst) }])
      }
      if (runId.current !== id) return
    }

    setStatus('active')
    setSubscribed(true)
    setOutcome(isFirst ? 'subscribed' : willFail ? 'recovered' : 'renewed')
    setBusy(false)
  }

  const submitLabel = busy ? 'Processing…' : subscribed ? 'Simulate next billing cycle' : 'Subscribe — $29/mo'
  const pillLabel = status === 'active' ? 'Active' : status === 'past_due' ? 'Past due — retrying' : 'Not subscribed'
  const pillColor = status === 'active' ? C.green : status === 'past_due' ? C.amber : C.muted
  const pillSoft = status === 'active' ? C.greenSoft : status === 'past_due' ? C.amberSoft : C.bg

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Repeat className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Loomwork</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            subscription billing · dunning
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          1,406 active subscribers · 3 recovered this week
        </span>
      </header>

      <div className='mx-auto grid max-w-5xl gap-3 p-3 sm:grid-cols-[0.85fr_1.15fr]'>
        {/* Left: plan + subscribe form */}
        <div className='flex flex-col gap-2.5'>
          <div className='rounded-xl p-3.5' style={{ background: C.panel, border: `1px solid ${outcome === 'recovered' ? C.green : C.border}` }}>
            <p
              className='flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase'
              style={{ color: outcome === 'none' ? C.muted : outcome === 'recovered' ? C.green : C.accent, letterSpacing: '0.06em' }}>
              {outcome === 'recovered' && <ShieldCheck className='h-3.5 w-3.5' />}
              {outcome === 'none' ? 'New subscription'
                : outcome === 'subscribed' ? 'Subscription active'
                  : outcome === 'renewed' ? 'Renewed'
                    : 'Payment recovered'}
            </p>
            <p className='mt-1 text-[13px]' style={{ color: outcome === 'none' ? C.muted : C.fg, lineHeight: 1.5 }}>
              {outcome === 'none' && 'Fill this out, then subscribe to see billing kick in on the right.'}
              {outcome === 'subscribed' && 'Card charged and access granted — renews automatically every month.'}
              {outcome === 'renewed' && 'Billed automatically — zero manual work, zero customer friction.'}
              {outcome === 'recovered' && 'The card declined, so billing retried automatically — the customer never lost access.'}
            </p>

            <form onSubmit={run} className='mt-3 flex flex-col gap-2'>
              <div className='overflow-hidden rounded-lg' style={{ border: `1px solid ${status === 'active' ? C.green : status === 'past_due' ? C.amber : C.border}` }}>
                <div className='flex items-center justify-between px-2.5 py-2' style={{ background: pillSoft }}>
                  <span className='flex items-center gap-2 text-[12.5px] font-semibold'>
                    <Repeat className='h-4 w-4' style={{ color: pillColor }} />
                    Loomwork Pro — $29/mo
                  </span>
                  <span className='shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold' style={{ color: pillColor, background: C.panel }}>
                    {pillLabel}
                  </span>
                </div>
                <div className='flex flex-col gap-1 p-2.5' style={{ background: C.panel }}>
                  {FEATURES.map((f) => {
                    const Icon = status === 'active' ? Check : status === 'past_due' ? Clock : Lock
                    const color = status === 'active' ? C.green : status === 'past_due' ? C.amber : C.muted
                    return (
                      <div key={f} className='flex items-center gap-1.5 text-[11.5px]' style={{ color: status === 'none' ? C.muted : C.fg }}>
                        <Icon className='h-3 w-3 shrink-0' style={{ color }} />
                        {f}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <label className='flex flex-col gap-1 text-[12px] font-medium'>
                  Name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className='rounded-lg px-2.5 py-1.5 text-[13px] outline-none'
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
                  />
                </label>
                <label className='flex flex-col gap-1 text-[12px] font-medium'>
                  Email
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='rounded-lg px-2.5 py-1.5 text-[13px] outline-none'
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
                  />
                </label>
              </div>

              <button
                type='button'
                onClick={() => setSimulateFailure((v) => !v)}
                className='flex items-center justify-between gap-3 rounded-lg p-2 text-left'
                style={{ background: simulateFailure ? C.accentSoft : C.bg, border: `1px solid ${simulateFailure ? C.accent : C.border}` }}>
                <span className='text-[11.5px] font-semibold'>Simulate a failed renewal charge</span>
                <span
                  className='relative h-5 w-9 shrink-0 rounded-full transition-colors'
                  style={{ background: simulateFailure ? C.accent : C.border }}>
                  <span
                    className='absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform'
                    style={{ transform: simulateFailure ? 'translateX(15px)' : 'translateX(2px)' }}
                  />
                </span>
              </button>

              <button
                type='submit'
                disabled={busy}
                className='inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold text-white disabled:opacity-50'
                style={{ background: C.accent }}>
                {busy ? <Loader2 className='h-4 w-4 animate-spin' /> : subscribed ? <RefreshCw className='h-4 w-4' /> : <CreditCard className='h-4 w-4' />}
                {submitLabel}
              </button>
            </form>
          </div>
        </div>

        {/* Right: flow + log */}
        <div className='flex flex-col gap-2.5'>
          <div className='rounded-xl p-3.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <p className='text-[12px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
              Billing flow
            </p>
            <div className='relative mt-1.5 flex flex-col'>
              <div className='absolute top-4 bottom-4 left-4.25 w-0.5' style={{ background: C.border }} />
              {STEPS.map((step) => {
                const st = statuses[step.id]
                const Icon =
                  st === 'active' ? Loader2
                    : st === 'retrying' ? Clock
                    : st === 'done' ? Check
                    : step.icon
                const circleBg =
                  st === 'done' ? C.green
                    : st === 'active' ? C.accent
                    : st === 'retrying' ? C.amber
                    : C.panel
                const captionColor =
                  st === 'done' ? C.green
                    : st === 'active' ? C.accent
                    : st === 'retrying' ? C.amber
                    : C.muted
                const caption =
                  st === 'pending' ? 'waiting'
                    : st === 'active' ? 'running…'
                    : st === 'retrying' ? 'retrying…'
                    : 'done'
                return (
                  <div key={step.id} className='relative flex items-start gap-3 py-1'>
                    <span
                      className='relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full'
                      style={{ background: circleBg, color: st === 'pending' ? C.muted : 'white', border: st === 'pending' ? `1px solid ${C.border}` : 'none' }}>
                      <Icon className={`h-4 w-4 ${st === 'active' ? 'animate-spin' : ''}`} />
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
              stripe.billing.log
            </div>
            <div ref={logRef} className='flex flex-col gap-1 overflow-y-auto p-3 text-[12px]' style={{ background: 'oklch(0.21 0.015 250)', minHeight: 72, maxHeight: 100, fontFamily: 'var(--font-jetbrains), monospace' }}>
              {log.length === 0 ? (
                <span style={{ color: 'oklch(0.6 0.01 250)' }}>{'// subscribe to see the billing cycle run'}</span>
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

function stepLogText(id: StepId, isFirst: boolean) {
  switch (id) {
    case 'invoice': return isFirst ? 'invoice.created — first billing period' : 'invoice.created — recurring cycle'
    case 'charge': return 'charge.succeeded — card charged $29.00'
    case 'webhook': return 'webhook.received — invoice.paid'
    case 'subscription': return `subscription.updated — status: active`
    case 'notify': return 'email.sent — receipt to customer'
  }
}

function logColor(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return 'oklch(0.75 0.15 155)'
    case 'fail': return 'oklch(0.72 0.17 25)'
    case 'retry': return 'oklch(0.8 0.13 85)'
    default: return 'oklch(0.75 0.01 250)'
  }
}

function logPrefix(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return '✓'
    case 'fail': return '✕'
    case 'retry': return '⟳'
    default: return '·'
  }
}
