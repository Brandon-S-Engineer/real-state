'use client'

// Parseline — usage-based/metered billing demo. Processing a batch of pages
// increments a usage meter against an included allowance, then bills
// overage per page — same shape as any AI-SaaS "pay per call" plan. The one
// thing worth showing at this tier: metered billing without a safety net is
// dangerous both ways — a buggy job that fires way more calls than normal
// either surprises the customer with a huge bill, or eats the provider's
// margin. This demo's "cost check" step catches an anomalous batch, caps
// what gets auto-billed, and holds the rest for manual review instead of
// either extreme. No AI, no real Stripe/DB — a faithful, self-contained
// simulation of the usage-meter + margin-protection pattern.

import { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, Check, Files, Gauge, Loader2, Receipt, ScanLine, Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.006 172)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 172 / 0.12)',
  fg: 'oklch(0.24 0.02 172)',
  muted: 'oklch(0.5 0.015 172)',
  accent: 'oklch(0.55 0.15 172)',
  accentSoft: 'oklch(0.55 0.15 172 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  amber: 'oklch(0.7 0.15 60)',
  amberSoft: 'oklch(0.7 0.15 60 / 0.14)',
  red: 'oklch(0.6 0.19 25)',
  redSoft: 'oklch(0.6 0.19 25 / 0.1)',
}

type StepId = 'batch' | 'process' | 'usage' | 'costcheck' | 'invoice'
type StepStatus = 'pending' | 'active' | 'done' | 'alert'
type LogLine = { kind: 'ok' | 'info' | 'fail' | 'retry' }
type LogEntry = LogLine & { text: string }
type Outcome = 'none' | 'normal' | 'capped'

const STEPS: { id: StepId; label: string; icon: LucideIcon }[] = [
  { id: 'batch', label: 'Batch received', icon: Upload },
  { id: 'process', label: 'Pages processed', icon: ScanLine },
  { id: 'usage', label: 'Usage recorded', icon: Activity },
  { id: 'costcheck', label: 'Cost check', icon: Gauge },
  { id: 'invoice', label: 'Invoice updated', icon: Receipt },
]

const INITIAL_STATUSES: Record<StepId, StepStatus> = {
  batch: 'pending', process: 'pending', usage: 'pending', costcheck: 'pending', invoice: 'pending',
}

const INCLUDED_PAGES = 500
const OVERAGE_RATE = 0.02
const BASE_PRICE = 49
const SAFETY_CAP_PAGES = 500
const ANOMALY_THRESHOLD = 1000
const NORMAL_BATCH = 150
const RUNAWAY_BATCH = 5000

const fmt = (n: number) => n.toLocaleString()
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function UsageMeteredBillingDemo() {
  const [pagesUsed, setPagesUsed] = useState(380)
  const [runaway, setRunaway] = useState(false)
  const [busy, setBusy] = useState(false)
  const [statuses, setStatuses] = useState<Record<StepId, StepStatus>>(INITIAL_STATUSES)
  const [outcome, setOutcome] = useState<Outcome>('none')
  const [lastBill, setLastBill] = useState(BASE_PRICE)
  const [lastHeld, setLastHeld] = useState(0)
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
    const batchSize = runaway ? RUNAWAY_BATCH : NORMAL_BATCH
    const isAnomaly = batchSize > ANOMALY_THRESHOLD
    setBusy(true)
    setStatuses(INITIAL_STATUSES)

    let newTotal = pagesUsed
    for (const step of STEPS) {
      if (runId.current !== id) return
      setStatuses((s) => ({ ...s, [step.id]: 'active' }))
      await delay(500)
      if (runId.current !== id) return

      if (step.id === 'usage') {
        newTotal = pagesUsed + batchSize
        setPagesUsed(newTotal)
        setStatuses((s) => ({ ...s, usage: 'done' }))
        setLog((l) => [...l, { kind: 'ok', text: `usage.recorded — meter +${fmt(batchSize)} (total: ${fmt(newTotal)})` }])
      } else if (step.id === 'costcheck') {
        if (isAnomaly) {
          setStatuses((s) => ({ ...s, costcheck: 'alert' }))
          setLog((l) => [...l, { kind: 'fail', text: `anomaly.detected — batch of ${fmt(batchSize)} exceeds safety threshold (${fmt(ANOMALY_THRESHOLD)})` }])
          await delay(550)
          if (runId.current !== id) return
          setLog((l) => [...l, { kind: 'retry', text: 'billing.capped — overage auto-billed up to safety cap, remainder held' }])
          setLog((l) => [...l, { kind: 'retry', text: 'owner.alerted — email sent for manual review' }])
        } else {
          setStatuses((s) => ({ ...s, costcheck: 'done' }))
          setLog((l) => [...l, { kind: 'ok', text: 'cost.check — within safety threshold' }])
        }
      } else if (step.id === 'invoice') {
        const overagePagesFull = Math.max(0, newTotal - INCLUDED_PAGES)
        const billedOveragePages = isAnomaly ? Math.min(overagePagesFull, SAFETY_CAP_PAGES) : overagePagesFull
        const heldPages = overagePagesFull - billedOveragePages
        const bill = BASE_PRICE + billedOveragePages * OVERAGE_RATE
        setLastBill(bill)
        setLastHeld(heldPages)
        setStatuses((s) => ({ ...s, invoice: 'done' }))
        setLog((l) => [...l, { kind: 'ok', text: `invoice.updated — estimated total $${bill.toFixed(2)}${heldPages > 0 ? ` (${fmt(heldPages)} pages held)` : ''}` }])
      } else {
        setStatuses((s) => ({ ...s, [step.id]: 'done' }))
        setLog((l) => [...l, { kind: 'ok', text: stepLogText(step.id, batchSize) }])
      }
      if (runId.current !== id) return
    }

    setOutcome(isAnomaly ? 'capped' : 'normal')
    setBusy(false)
  }

  const overagePagesFull = Math.max(0, pagesUsed - INCLUDED_PAGES)
  const barPct = Math.min(100, (pagesUsed / INCLUDED_PAGES) * 100)
  const overCap = pagesUsed > INCLUDED_PAGES
  const submitLabel = busy ? 'Processing…' : runaway ? `Process a batch — ${fmt(RUNAWAY_BATCH)} pages ⚠` : `Process a batch — ${fmt(NORMAL_BATCH)} pages`

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Files className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Parseline</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            usage-based billing · metered
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          212 workspaces · $940 protected this month
        </span>
      </header>

      <div className='mx-auto grid max-w-5xl gap-3 p-3 sm:grid-cols-[0.85fr_1.15fr]'>
        {/* Left: usage + form */}
        <div className='flex flex-col gap-2.5'>
          <div className='rounded-xl p-3.5' style={{ background: C.panel, border: `1px solid ${outcome === 'capped' ? C.amber : C.border}` }}>
            <p
              className='flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase'
              style={{ color: outcome === 'none' ? C.muted : outcome === 'capped' ? C.amber : C.accent, letterSpacing: '0.06em' }}>
              {outcome === 'capped' && <AlertTriangle className='h-3.5 w-3.5' />}
              {outcome === 'none' ? 'Usage period in progress' : outcome === 'normal' ? 'Batch processed' : 'Usage spike caught'}
            </p>
            <p className='mt-1 text-[13px]' style={{ color: outcome === 'none' ? C.muted : C.fg, lineHeight: 1.5 }}>
              {outcome === 'none' && 'Process a batch of documents to see usage, overage, and the safety cap update live.'}
              {outcome === 'normal' && `${fmt(NORMAL_BATCH)} pages processed — usage and billing updated automatically.`}
              {outcome === 'capped' && `A batch of ${fmt(RUNAWAY_BATCH)} pages tripped the safety cap — billing capped at $${lastBill.toFixed(2)}, ${fmt(lastHeld)} pages held for review instead of auto-charged.`}
            </p>

            <form onSubmit={run} className='mt-3 flex flex-col gap-2'>
              <div className='overflow-hidden rounded-lg' style={{ border: `1px solid ${overCap ? C.amber : C.border}` }}>
                <div className='flex items-center justify-between px-2.5 py-2' style={{ background: C.accentSoft }}>
                  <span className='flex items-center gap-2 text-[12.5px] font-semibold'>
                    <Files className='h-4 w-4' style={{ color: C.accent }} />
                    Parseline Pro — $49/mo
                  </span>
                  <span className='shrink-0 text-[11px] font-bold' style={{ color: C.muted }}>+$0.02/pg</span>
                </div>
                <div className='flex flex-col gap-1.5 p-2.5' style={{ background: C.panel }}>
                  <div className='h-2 w-full overflow-hidden rounded-full' style={{ background: C.border }}>
                    <div className='h-full rounded-full' style={{ width: `${barPct}%`, background: overCap ? C.amber : C.accent }} />
                  </div>
                  <div className='flex items-center justify-between text-[11.5px]' style={{ color: C.muted }}>
                    <span>{fmt(Math.min(pagesUsed, INCLUDED_PAGES))} / {fmt(INCLUDED_PAGES)} pages included</span>
                    {overagePagesFull > 0 && <span style={{ color: C.amber, fontWeight: 600 }}>+{fmt(overagePagesFull)} overage</span>}
                  </div>
                  <div className='flex items-center justify-between border-t pt-1.5 text-[11.5px]' style={{ borderColor: C.border }}>
                    <span style={{ color: C.muted }}>Estimated bill</span>
                    <span className='font-bold' style={{ color: C.fg }}>${lastBill.toFixed(2)}</span>
                  </div>
                  {lastHeld > 0 && (
                    <div className='rounded-md px-2 py-1 text-[11px] font-medium' style={{ background: C.amberSoft, color: C.amber }}>
                      {fmt(lastHeld)} pages (~${(lastHeld * OVERAGE_RATE).toFixed(2)}) held, not auto-billed
                    </div>
                  )}
                </div>
              </div>

              <button
                type='button'
                onClick={() => setRunaway((v) => !v)}
                className='flex items-center justify-between gap-3 rounded-lg p-2 text-left'
                style={{ background: runaway ? C.redSoft : C.bg, border: `1px solid ${runaway ? C.red : C.border}` }}>
                <span className='text-[11.5px] font-semibold'>Simulate a runaway job (bug sends {fmt(RUNAWAY_BATCH)} pages)</span>
                <span className='relative h-5 w-9 shrink-0 rounded-full transition-colors' style={{ background: runaway ? C.red : C.border }}>
                  <span className='absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform' style={{ transform: runaway ? 'translateX(15px)' : 'translateX(2px)' }} />
                </span>
              </button>

              <button
                type='submit'
                disabled={busy}
                className='inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold text-white disabled:opacity-50'
                style={{ background: runaway ? C.red : C.accent }}>
                {busy ? <Loader2 className='h-4 w-4 animate-spin' /> : <Upload className='h-4 w-4' />}
                {submitLabel}
              </button>
            </form>
          </div>
        </div>

        {/* Right: flow + log */}
        <div className='flex flex-col gap-2.5'>
          <div className='rounded-xl p-3.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <p className='text-[12px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
              Processing flow
            </p>
            <div className='relative mt-1.5 flex flex-col'>
              <div className='absolute top-4 bottom-4 left-4.25 w-0.5' style={{ background: C.border }} />
              {STEPS.map((step) => {
                const st = statuses[step.id]
                const Icon =
                  st === 'active' ? Loader2
                    : st === 'alert' ? AlertTriangle
                    : st === 'done' ? Check
                    : step.icon
                const circleBg =
                  st === 'done' ? C.green
                    : st === 'active' ? C.accent
                    : st === 'alert' ? C.amber
                    : C.panel
                const captionColor =
                  st === 'done' ? C.green
                    : st === 'active' ? C.accent
                    : st === 'alert' ? C.amber
                    : C.muted
                const caption =
                  st === 'pending' ? 'waiting'
                    : st === 'active' ? 'running…'
                    : st === 'alert' ? 'anomaly — capping'
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
              usage.meter.log
            </div>
            <div ref={logRef} className='flex flex-col gap-1 overflow-y-auto p-3 text-[12px]' style={{ background: 'oklch(0.21 0.015 172)', minHeight: 72, maxHeight: 100, fontFamily: 'var(--font-jetbrains), monospace' }}>
              {log.length === 0 ? (
                <span style={{ color: 'oklch(0.6 0.01 172)' }}>{'// process a batch to see the usage meter run'}</span>
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

function stepLogText(id: StepId, batchSize: number) {
  switch (id) {
    case 'batch': return `batch.received — ${fmt(batchSize)} pages queued${batchSize > ANOMALY_THRESHOLD ? ' ⚠' : ''}`
    case 'process': return `pages.processed — ${fmt(batchSize)}/${fmt(batchSize)} done`
    default: return ''
  }
}

function logColor(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return 'oklch(0.75 0.15 155)'
    case 'fail': return 'oklch(0.72 0.17 25)'
    case 'retry': return 'oklch(0.8 0.13 85)'
    default: return 'oklch(0.75 0.01 172)'
  }
}

function logPrefix(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return '✓'
    case 'fail': return '✕'
    case 'retry': return '⚠'
    default: return '·'
  }
}
