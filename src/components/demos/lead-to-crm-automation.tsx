'use client'

// Crestline Realty — lead-to-CRM automation demo. Submitting the form runs a
// scripted n8n-style workflow: receive → validate → save to CRM → notify team
// → send welcome email. No AI, no real n8n/CRM/email — a faithful, self-
// contained simulation of the flow and its states, including what happens
// when a step fails: automatic retries, then an escalation alert instead of
// silently dropping the lead.

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Bell, Building2, Check, Database, Inbox, Loader2, Mail, RotateCcw, Send, ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.006 80)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 80 / 0.12)',
  fg: 'oklch(0.24 0.02 70)',
  muted: 'oklch(0.5 0.015 70)',
  accent: 'oklch(0.62 0.16 45)',
  accentSoft: 'oklch(0.62 0.16 45 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  greenSoft: 'oklch(0.58 0.15 155 / 0.1)',
  red: 'oklch(0.6 0.19 25)',
  redSoft: 'oklch(0.6 0.19 25 / 0.1)',
  amber: 'oklch(0.7 0.14 85)',
  amberSoft: 'oklch(0.7 0.14 85 / 0.12)',
}

type StepId = 'received' | 'validated' | 'saved' | 'notified' | 'email'
type StepStatus = 'pending' | 'active' | 'retrying' | 'done' | 'escalated'
type LogLine = { kind: 'ok' | 'fail' | 'retry' | 'alert' | 'info'; text: string }

const STEPS: { id: StepId; label: string; icon: LucideIcon }[] = [
  { id: 'received', label: 'Lead received', icon: Inbox },
  { id: 'validated', label: 'Validated', icon: ShieldCheck },
  { id: 'saved', label: 'Saved to CRM', icon: Database },
  { id: 'notified', label: 'Team notified', icon: Bell },
  { id: 'email', label: 'Welcome email sent', icon: Mail },
]

const INITIAL_STATUSES: Record<StepId, StepStatus> = {
  received: 'pending', validated: 'pending', saved: 'pending', notified: 'pending', email: 'pending',
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function LeadToCrmAutomationDemo() {
  const [name, setName] = useState('Morgan Ellis')
  const [email, setEmail] = useState('morgan.ellis@example.com')
  const [interest, setInterest] = useState('3-bed house near downtown')
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [statuses, setStatuses] = useState<Record<StepId, StepStatus>>(INITIAL_STATUSES)
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
    setLog([{ kind: 'info', text: `lead.created — ${name.trim() || 'New lead'} <${email.trim() || 'no email'}>` }])

    for (const step of STEPS) {
      if (runId.current !== id) return
      setStatuses((s) => ({ ...s, [step.id]: 'active' }))
      await delay(650)
      if (runId.current !== id) return

      if (step.id === 'notified' && simulateFailure) {
        setStatuses((s) => ({ ...s, notified: 'retrying' }))
        setLog((l) => [...l, { kind: 'fail', text: 'notify.slack — timeout after 3s' }])
        setLog((l) => [...l, { kind: 'retry', text: 'retrying (1/2)…' }])
        await delay(850)
        if (runId.current !== id) return

        setLog((l) => [...l, { kind: 'fail', text: 'notify.slack — retry 1 failed, timeout after 3s' }])
        setLog((l) => [...l, { kind: 'retry', text: 'retrying (2/2)…' }])
        await delay(850)
        if (runId.current !== id) return

        setLog((l) => [...l, { kind: 'fail', text: 'notify.slack — retry 2 failed, giving up' }])
        setStatuses((s) => ({ ...s, notified: 'escalated' }))
        setLog((l) => [...l, { kind: 'alert', text: 'escalate.sms → on-call agent notified via backup channel' }])
        await delay(500)
      } else {
        setStatuses((s) => ({ ...s, [step.id]: 'done' }))
        setLog((l) => [...l, { kind: 'ok', text: `${step.label.toLowerCase()} — ok` }])
      }
      if (runId.current !== id) return
    }

    setElapsed(Date.now() - started)
    setPhase('done')
  }

  const submitLabel = phase === 'running' ? 'Processing…' : phase === 'done' ? 'Send another lead' : 'Submit lead'
  const escalated = statuses.notified === 'escalated'

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Building2 className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Crestline Realty</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            lead automation · no AI
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          1,842 leads routed · 0 ever lost
        </span>
      </header>

      <div className='mx-auto grid max-w-5xl gap-3 p-3 sm:grid-cols-[0.85fr_1.15fr]'>
        {/* Left: lead form */}
        <div className='flex flex-col gap-2.5'>
          <div
            className='rounded-xl p-4'
            style={{ background: C.panel, border: `1px solid ${phase === 'done' ? (escalated ? C.amber : C.green) : C.border}` }}>
            <p
              className='flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase'
              style={{ color: phase === 'done' ? (escalated ? C.amber : C.green) : C.muted, letterSpacing: '0.06em' }}>
              {phase === 'done' && (escalated ? <AlertTriangle className='h-3.5 w-3.5' /> : <Check className='h-3.5 w-3.5' />)}
              {phase === 'done' ? (escalated ? 'Delivered — fallback used' : 'Fully processed') : 'New inquiry'}
            </p>
            <p className='mt-1 text-[13px]' style={{ color: phase === 'done' ? C.fg : C.muted, lineHeight: 1.5 }}>
              {phase === 'done'
                ? escalated
                  ? 'Slack failed twice, so on-call got an SMS instead. The lead was already saved, welcome email still sent.'
                  : `Received, validated, saved, notified, and emailed — in ${(elapsed / 1000).toFixed(1)}s, zero manual work.`
                : 'Fill this out like a visitor would, then submit — watch it move through the automation on the right.'}
            </p>
            <form onSubmit={run} className='mt-4 flex flex-col gap-3'>
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
              <label className='flex flex-col gap-1.5 text-[12.5px] font-medium'>
                Property interest
                <input
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className='rounded-lg px-3 py-2 text-[13.5px] outline-none'
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
                />
              </label>

              <button
                type='button'
                onClick={() => setSimulateFailure((v) => !v)}
                className='mt-1.5 flex items-center justify-between gap-3 rounded-lg p-2.5 text-left'
                style={{ background: simulateFailure ? C.amberSoft : C.bg, border: `1px solid ${simulateFailure ? C.amber : C.border}` }}>
                <span>
                  <span className='block text-[12.5px] font-semibold'>Simulate a failure</span>
                  <span className='block text-[11px]' style={{ color: C.muted }}>
                    Makes the Slack notification step fail, to show the retry + alert path
                  </span>
                </span>
                <span
                  className='relative h-6 w-10 shrink-0 rounded-full transition-colors'
                  style={{ background: simulateFailure ? C.amber : C.border }}>
                  <span
                    className='absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform'
                    style={{ transform: simulateFailure ? 'translateX(17px)' : 'translateX(2px)' }}
                  />
                </span>
              </button>

              <button
                type='submit'
                disabled={phase === 'running'}
                className='mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50'
                style={{ background: C.accent }}>
                {phase === 'running' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
                {submitLabel}
              </button>
            </form>
          </div>
        </div>

        {/* Right: flow + log */}
        <div className='flex flex-col gap-2.5'>
          <div className='rounded-xl p-3.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <p className='text-[12px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
              Automation flow
            </p>
            <div className='relative mt-1.5 flex flex-col'>
              <div className='absolute top-4 bottom-4 left-[17px] w-[2px]' style={{ background: C.border }} />
              {STEPS.map((step) => {
                const status = statuses[step.id]
                const Icon =
                  status === 'active' ? Loader2
                    : status === 'retrying' ? RotateCcw
                    : status === 'done' ? Check
                    : status === 'escalated' ? AlertTriangle
                    : step.icon
                const circleBg =
                  status === 'done' ? C.green
                    : status === 'active' ? C.accent
                    : status === 'retrying' ? C.amber
                    : status === 'escalated' ? C.red
                    : C.panel
                const spin = status === 'active' || status === 'retrying'
                const captionColor =
                  status === 'done' ? C.green
                    : status === 'active' ? C.accent
                    : status === 'retrying' ? C.amber
                    : status === 'escalated' ? C.red
                    : C.muted
                const caption =
                  status === 'pending' ? 'waiting'
                    : status === 'active' ? 'running…'
                    : status === 'retrying' ? 'retrying…'
                    : status === 'done' ? 'done'
                    : 'escalated → alert sent'
                return (
                  <div key={step.id} className='relative flex items-start gap-3 py-1.5'>
                    <span
                      className='relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full'
                      style={{
                        background: circleBg,
                        color: status === 'pending' ? C.muted : 'white',
                        border: status === 'pending' ? `1px solid ${C.border}` : 'none',
                      }}>
                      <Icon className={`h-4 w-4 ${spin ? 'animate-spin' : ''}`} />
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
              workflow.log
            </div>
            <div ref={logRef} className='flex flex-col gap-1 overflow-y-auto p-3 text-[12px]' style={{ background: 'oklch(0.21 0.015 70)', minHeight: 72, maxHeight: 100, fontFamily: 'var(--font-jetbrains), monospace' }}>
              {log.length === 0 ? (
                <span style={{ color: 'oklch(0.6 0.01 70)' }}>{'// submit a lead to see the workflow run'}</span>
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

function logColor(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return 'oklch(0.75 0.15 155)'
    case 'fail': return 'oklch(0.72 0.17 25)'
    case 'retry': return 'oklch(0.8 0.13 85)'
    case 'alert': return 'oklch(0.8 0.13 85)'
    default: return 'oklch(0.75 0.01 70)'
  }
}

function logPrefix(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return '✓'
    case 'fail': return '✕'
    case 'retry': return '⟳'
    case 'alert': return '⚠'
    default: return '·'
  }
}
