'use client'

// Northbeam — smart inbox router demo. An LLM reads an incoming message and
// returns a structured classification (category, urgency, sentiment,
// summary) used to route it. No tools, no actions — the model only judges.
// Classification is precomputed per sample (production calls a real LLM);
// this keeps the public demo instant and unbreakable while faithfully
// showing the schema-validation + retry + deterministic-fallback path that
// makes the structured output reliable.

import { useEffect, useRef, useState } from 'react'
import {
  Check, Inbox, Loader2, Mail, RotateCcw, ShieldAlert, ShieldCheck, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.006 300)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 300 / 0.12)',
  fg: 'oklch(0.24 0.02 290)',
  muted: 'oklch(0.5 0.015 290)',
  accent: 'oklch(0.55 0.17 295)',
  accentSoft: 'oklch(0.55 0.17 295 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  greenSoft: 'oklch(0.58 0.15 155 / 0.1)',
  amber: 'oklch(0.7 0.14 85)',
  amberSoft: 'oklch(0.7 0.14 85 / 0.12)',
  code: 'oklch(0.21 0.015 290)',
}

type Result = {
  category: string
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  sentiment: string
  summary: string
  routeTo: string
  routeLabel: string
  confidence: number
  fallback?: boolean
}

type Sample = { id: string; label: string; text: string; result: Result }

const SAMPLES: Sample[] = [
  {
    id: 'support',
    label: 'Support',
    text: "Hi, I can't log into my account after resetting my password. Tried twice, still get an error. Can someone help me get back in?",
    result: {
      category: 'support', urgency: 'medium', sentiment: 'neutral',
      summary: 'Locked out after password reset, needs login help.',
      routeTo: 'support-team', routeLabel: 'Support queue — Tier 1', confidence: 0.97,
    },
  },
  {
    id: 'sales',
    label: 'Sales',
    text: "We're a 40-person team looking to switch from spreadsheets to a proper CRM. Can we get a demo and pricing for the Enterprise plan?",
    result: {
      category: 'sales', urgency: 'medium', sentiment: 'positive',
      summary: '40-person team requesting Enterprise demo + pricing.',
      routeTo: 'sales-team', routeLabel: 'Sales — Slack #inbound-leads', confidence: 0.98,
    },
  },
  {
    id: 'billing',
    label: 'Billing',
    text: 'I was charged twice for my subscription this month ($49 x2). Please refund the duplicate charge ASAP.',
    result: {
      category: 'billing', urgency: 'high', sentiment: 'negative',
      summary: 'Double-charged $49 — wants the duplicate refunded.',
      routeTo: 'billing-team', routeLabel: 'Billing — Zendesk (refunds)', confidence: 0.96,
    },
  },
  {
    id: 'complaint',
    label: 'Complaint',
    text: "This is the THIRD time your app has crashed during my client presentation. I'm seriously considering canceling. Fix this or I'm done.",
    result: {
      category: 'complaint', urgency: 'urgent', sentiment: 'angry',
      summary: 'Repeated crashes during client use — churn risk.',
      routeTo: 'escalation', routeLabel: 'Escalated — Manager + Engineering', confidence: 0.95,
    },
  },
  {
    id: 'vague',
    label: 'Vague one',
    text: 'hey so about the thing from before, is this still an issue?? also not sure if this is even the right email lol',
    result: {
      category: 'general', urgency: 'medium', sentiment: 'neutral',
      summary: 'No clear topic — flagged for a human to triage.',
      routeTo: 'general-inbox', routeLabel: 'General inbox — human review', confidence: 0.4, fallback: true,
    },
  },
]

type StepId = 'received' | 'classify' | 'validate' | 'route'
type StepStatus = 'pending' | 'active' | 'retrying' | 'fallback' | 'done'
type LogLine = { kind: 'ok' | 'fail' | 'retry' | 'alert' | 'info'; text: string }

const STEPS: { id: StepId; label: string; icon: LucideIcon }[] = [
  { id: 'received', label: 'Message received', icon: Inbox },
  { id: 'classify', label: 'AI classifying', icon: Sparkles },
  { id: 'validate', label: 'Output validated', icon: ShieldCheck },
  { id: 'route', label: 'Routed', icon: Mail },
]

const INITIAL_STATUSES: Record<StepId, StepStatus> = {
  received: 'pending', classify: 'pending', validate: 'pending', route: 'pending',
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function SmartInboxRouterDemo() {
  const [sample, setSample] = useState(SAMPLES[0])
  const [text, setText] = useState(SAMPLES[0].text)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [statuses, setStatuses] = useState<Record<StepId, StepStatus>>(INITIAL_STATUSES)
  const [log, setLog] = useState<LogLine[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const runId = useRef(0)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  function pick(s: Sample) {
    setSample(s)
    setText(s.text)
    setPhase('idle')
    setResult(null)
    setStatuses(INITIAL_STATUSES)
  }

  async function run(e: React.FormEvent) {
    e.preventDefault()
    if (phase === 'running') return
    const id = ++runId.current
    setPhase('running')
    setResult(null)
    setStatuses(INITIAL_STATUSES)
    setLog([{ kind: 'info', text: 'message.received — queued for classification' }])

    setStatuses((s) => ({ ...s, received: 'done' }))
    await delay(400)
    if (runId.current !== id) return

    setStatuses((s) => ({ ...s, classify: 'active' }))
    setLog((l) => [...l, { kind: 'info', text: 'llm.classify — sent to model' }])
    await delay(750)
    if (runId.current !== id) return

    const r = sample.result

    if (r.fallback) {
      setStatuses((s) => ({ ...s, classify: 'done', validate: 'retrying' }))
      setLog((l) => [...l, { kind: 'fail', text: 'llm.classify — invalid JSON (unexpected end of input)' }])
      setLog((l) => [...l, { kind: 'retry', text: 'retrying with strict schema…' }])
      await delay(800)
      if (runId.current !== id) return

      setLog((l) => [...l, { kind: 'fail', text: 'llm.classify (retry) — still invalid' }])
      setStatuses((s) => ({ ...s, validate: 'fallback' }))
      setLog((l) => [...l, { kind: 'alert', text: 'fallback.rules — keyword match applied (low confidence)' }])
      await delay(700)
      if (runId.current !== id) return
    } else {
      setStatuses((s) => ({ ...s, classify: 'done', validate: 'active' }))
      await delay(500)
      if (runId.current !== id) return
      setStatuses((s) => ({ ...s, validate: 'done' }))
      setLog((l) => [
        ...l,
        { kind: 'ok', text: `llm.classify — category=${r.category}, urgency=${r.urgency} (${r.confidence.toFixed(2)})` },
        { kind: 'ok', text: 'schema.validate — ok' },
      ])
      await delay(350)
      if (runId.current !== id) return
    }

    setResult(r)
    setStatuses((s) => ({ ...s, route: 'done' }))
    setLog((l) => [...l, { kind: 'ok', text: `route → ${r.routeTo}${r.fallback ? ' (flagged for review)' : ''}` }])
    setPhase('done')
  }

  const urgencyColor = (u: Result['urgency']) =>
    u === 'urgent' ? C.amber : u === 'high' ? 'oklch(0.62 0.19 25)' : u === 'medium' ? C.accent : C.green

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Inbox className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Northbeam</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            AI inbox routing
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          3,120 messages triaged · avg 1.2s to route
        </span>
      </header>

      <div className='mx-auto grid max-w-5xl gap-3 p-3 sm:grid-cols-[0.85fr_1.15fr]'>
        {/* Left: message */}
        <div className='flex flex-col gap-2.5'>
          <div
            className='rounded-xl p-4'
            style={{ background: C.panel, border: `1px solid ${phase === 'done' ? (result?.fallback ? C.amber : C.green) : C.border}` }}>
            <p
              className='flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase'
              style={{ color: phase === 'done' ? (result?.fallback ? C.amber : C.green) : C.muted, letterSpacing: '0.06em' }}>
              {phase === 'done' && (result?.fallback ? <ShieldAlert className='h-3.5 w-3.5' /> : <Check className='h-3.5 w-3.5' />)}
              {phase === 'done' ? (result?.fallback ? 'Routed via fallback' : 'Classified & routed') : 'Incoming message'}
            </p>
            <p className='mt-1 text-[13px]' style={{ color: phase === 'done' ? C.fg : C.muted, lineHeight: 1.5 }}>
              {phase === 'done' && result
                ? `${result.summary} → ${result.routeLabel}`
                : 'Pick a sample or write your own, then classify it — watch the model judge it on the right.'}
            </p>

            <div className='mt-3 flex flex-wrap gap-1.5'>
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type='button'
                  onClick={() => pick(s)}
                  className='rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors'
                  style={sample.id === s.id ? { background: C.accent, color: 'white' } : { border: `1px solid ${C.border}`, color: C.muted }}>
                  {s.label}
                </button>
              ))}
            </div>

            <form onSubmit={run} className='mt-3 flex flex-col gap-2.5'>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setPhase('idle'); setResult(null); setStatuses(INITIAL_STATUSES) }}
                rows={4}
                className='resize-none rounded-lg px-3 py-2 text-[13px] outline-none'
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg, lineHeight: 1.45 }}
              />
              <button
                type='submit'
                disabled={phase === 'running' || !text.trim()}
                className='inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50'
                style={{ background: C.accent }}>
                {phase === 'running' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Sparkles className='h-4 w-4' />}
                {phase === 'running' ? 'Classifying…' : phase === 'done' ? 'Classify another' : 'Classify message'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: flow + output */}
        <div className='flex flex-col gap-2.5'>
          <div className='rounded-xl p-3.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <p className='text-[12px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
              AI triage
            </p>
            <div className='relative mt-1.5 flex flex-col'>
              <div className='absolute top-4 bottom-4 left-[17px] w-[2px]' style={{ background: C.border }} />
              {STEPS.map((step) => {
                const status = statuses[step.id]
                const Icon =
                  status === 'active' ? Loader2
                    : status === 'retrying' ? RotateCcw
                    : status === 'fallback' ? ShieldAlert
                    : status === 'done' ? Check
                    : step.icon
                const circleBg =
                  status === 'done' ? C.green
                    : status === 'active' ? C.accent
                    : status === 'retrying' ? C.amber
                    : status === 'fallback' ? C.amber
                    : C.panel
                const spin = status === 'active' || status === 'retrying'
                const captionColor =
                  status === 'done' ? C.green
                    : status === 'active' ? C.accent
                    : status === 'retrying' || status === 'fallback' ? C.amber
                    : C.muted
                const caption =
                  status === 'pending' ? 'waiting'
                    : status === 'active' ? 'running…'
                    : status === 'retrying' ? 'retrying…'
                    : status === 'fallback' ? 'fallback rules used'
                    : 'done'
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
            <div className='flex items-center justify-between px-4 py-1.5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
              <span className='text-[12px] font-semibold' style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>classification.json</span>
              {result && (
                <span
                  className='inline-flex items-center gap-1 text-[11px] font-medium'
                  style={{ color: result.fallback ? C.amber : C.green }}>
                  {result.fallback ? <ShieldAlert className='h-3 w-3' /> : <ShieldCheck className='h-3 w-3' />}
                  {result.fallback ? 'fallback' : `${Math.round(result.confidence * 100)}% conf.`}
                </span>
              )}
            </div>
            <div className='p-2.5 text-[11.5px]' style={{ background: C.code, color: 'oklch(0.85 0.01 290)', fontFamily: 'var(--font-jetbrains), monospace', lineHeight: 1.5 }}>
              {!result ? (
                <span style={{ opacity: 0.45 }}>{'// classify a message to see the structured output'}</span>
              ) : (
                <span>
                  {'{ '}
                  <K>category</K>: <V>{result.category}</V>{', '}
                  <K>urgency</K>: <V color={urgencyColor(result.urgency)}>{result.urgency}</V>{', '}
                  <K>sentiment</K>: <V>{result.sentiment}</V>{', '}
                  <K>summary</K>: <V>{result.summary}</V>{', '}
                  <K>route_to</K>: <V>{result.routeTo}</V>
                  {result.fallback && (
                    <>
                      {', '}
                      <K>source</K>: <V color={C.amber}>fallback_rules</V>
                    </>
                  )}
                  {' }'}
                </span>
              )}
            </div>
            <div ref={logRef} className='flex flex-col gap-0.5 overflow-y-auto p-2.5 text-[11px]' style={{ background: 'oklch(0.21 0.015 290)', borderTop: `1px solid oklch(1 0 0 / 0.08)`, minHeight: 44, maxHeight: 66, fontFamily: 'var(--font-jetbrains), monospace' }}>
              {log.length === 0 ? (
                <span style={{ color: 'oklch(0.6 0.01 290)' }}>{'// submit a message to see the reasoning trace'}</span>
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

function K({ children }: { children: string }) {
  return <span style={{ color: 'oklch(0.75 0.12 295)' }}>&quot;{children}&quot;</span>
}

function V({ children, color }: { children: string; color?: string }) {
  return <span style={{ color: color ?? 'oklch(0.78 0.13 130)' }}>&quot;{children}&quot;</span>
}

function logColor(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return 'oklch(0.75 0.15 155)'
    case 'fail': return 'oklch(0.72 0.17 25)'
    case 'retry': return 'oklch(0.8 0.13 85)'
    case 'alert': return 'oklch(0.8 0.13 85)'
    default: return 'oklch(0.75 0.01 290)'
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
