'use client'

// Ferngrove Market — marketplace split-payment demo (Stripe Connect). Paying
// for an order captures the full charge on the platform, then splits it:
// a platform fee retained immediately, and a seller payout. The one thing
// worth showing at this tier: a charge succeeding and a seller being ready
// to RECEIVE money are two different events. A seller whose Connect account
// still has pending verification can't receive a transfer — a naive system
// either fails the whole checkout or sends money nowhere trackable. This one
// captures the buyer's payment regardless, and holds the seller's share
// safely on the platform balance until they're verified, instead of losing
// it or blocking the sale. No AI, no real Stripe/DB — a faithful,
// self-contained simulation of the split-payment flow.

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Check, CreditCard, Loader2, Percent, Store, type LucideIcon,
} from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.006 210)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 210 / 0.12)',
  fg: 'oklch(0.24 0.02 210)',
  muted: 'oklch(0.5 0.015 210)',
  accent: 'oklch(0.55 0.15 210)',
  accentSoft: 'oklch(0.55 0.15 210 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  greenSoft: 'oklch(0.58 0.15 155 / 0.1)',
  amber: 'oklch(0.7 0.14 85)',
  amberSoft: 'oklch(0.7 0.14 85 / 0.14)',
}

type NodeStatus = 'pending' | 'active' | 'done' | 'blocked'
type LogLine = { kind: 'ok' | 'info' | 'fail' | 'hold' }
type LogEntry = LogLine & { text: string }
type Outcome = 'none' | 'done' | 'blocked'

const AMOUNT = 100
const FEE_RATE = 0.12
const FEE = AMOUNT * FEE_RATE
const PAYOUT = AMOUNT - FEE

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function MarketplaceSplitPaymentsDemo() {
  const [simulateUnverified, setSimulateUnverified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>('none')
  const [buyerStatus, setBuyerStatus] = useState<NodeStatus>('pending')
  const [platformStatus, setPlatformStatus] = useState<NodeStatus>('pending')
  const [feeStatus, setFeeStatus] = useState<NodeStatus>('pending')
  const [payoutStatus, setPayoutStatus] = useState<NodeStatus>('pending')
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
    const blocked = simulateUnverified
    setBusy(true)
    setBuyerStatus('pending'); setPlatformStatus('pending'); setFeeStatus('pending'); setPayoutStatus('pending')
    setLog([])

    setBuyerStatus('active')
    await delay(500)
    if (runId.current !== id) return
    setBuyerStatus('done')
    setLog((l) => [...l, { kind: 'ok', text: `checkout.session.completed — buyer charged $${AMOUNT.toFixed(2)}` }])

    setPlatformStatus('active')
    await delay(550)
    if (runId.current !== id) return
    setPlatformStatus('done')
    setLog((l) => [...l, { kind: 'ok', text: `charge.captured — $${AMOUNT.toFixed(2)} held on platform balance` }])

    // Fan-out: fee and payout dispatch together
    setFeeStatus('active')
    setPayoutStatus('active')
    await delay(500)
    if (runId.current !== id) return
    setFeeStatus('done')
    setLog((l) => [...l, { kind: 'ok', text: `application_fee.created — $${FEE.toFixed(2)} retained by platform` }])

    await delay(400)
    if (runId.current !== id) return
    if (blocked) {
      setPayoutStatus('blocked')
      setLog((l) => [...l, { kind: 'fail', text: 'transfer.blocked — connected account has pending requirements (identity verification)' }])
      setLog((l) => [...l, { kind: 'hold', text: `payout.held — $${PAYOUT.toFixed(2)} kept safely in platform balance` }])
      setLog((l) => [...l, { kind: 'hold', text: 'seller.notified — onboarding reminder sent' }])
    } else {
      setPayoutStatus('done')
      setLog((l) => [...l, { kind: 'ok', text: `transfer.created — $${PAYOUT.toFixed(2)} sent to Alder & Finch Pottery` }])
      setLog((l) => [...l, { kind: 'ok', text: 'payout.paid — arrives in seller bank in 1-2 business days' }])
    }

    setOutcome(blocked ? 'blocked' : 'done')
    setBusy(false)
  }

  const submitLabel = busy ? 'Processing…' : outcome === 'none' ? `Pay $${AMOUNT.toFixed(2)}` : 'Place another order'

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Store className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Ferngrove Market</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            marketplace · split payments
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          3,940 sellers onboarded · $0 lost to failed payouts
        </span>
      </header>

      <div className='mx-auto flex max-w-4xl min-w-0 flex-col gap-2 p-3'>
        {/* Order + controls */}
        <div className='rounded-xl p-3' style={{ background: C.panel, border: `1px solid ${outcome === 'blocked' ? C.amber : outcome === 'done' ? C.green : C.border}` }}>
          <p
            className='flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase'
            style={{ color: outcome === 'none' ? C.muted : outcome === 'blocked' ? C.amber : C.green, letterSpacing: '0.06em' }}>
            {outcome === 'blocked' && <AlertTriangle className='h-3.5 w-3.5' />}
            {outcome === 'none' ? 'New order' : outcome === 'blocked' ? 'Payout held — seller unverified' : 'Payment split'}
          </p>
          <p className='mt-1 text-[13px]' style={{ color: outcome === 'none' ? C.muted : C.fg, lineHeight: 1.5 }}>
            {outcome === 'none' && 'Pay for the order to see the charge split between the platform and the seller.'}
            {outcome === 'done' && `Buyer charged $${AMOUNT.toFixed(2)} — $${FEE.toFixed(2)} platform fee retained, $${PAYOUT.toFixed(2)} paid out to the seller automatically.`}
            {outcome === 'blocked' && `Buyer still charged $${AMOUNT.toFixed(2)} — the seller's $${PAYOUT.toFixed(2)} share is held safely, not lost and not sent, until they finish verification.`}
          </p>
          <form onSubmit={run} className='mt-2 flex flex-col gap-2'>
            <div className='flex items-center justify-between rounded-lg p-2.5' style={{ background: C.accentSoft }}>
              <span className='text-[12.5px] font-semibold'>Hand-thrown Ceramic Mug — Alder &amp; Finch Pottery</span>
              <span className='shrink-0 text-[13px] font-bold' style={{ color: C.accent }}>${AMOUNT.toFixed(2)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setSimulateUnverified((v) => !v)}
                className='flex flex-1 items-center justify-between gap-3 rounded-lg p-2 text-left'
                style={{ background: simulateUnverified ? C.amberSoft : C.bg, border: `1px solid ${simulateUnverified ? C.amber : C.border}` }}>
                <span className='text-[11.5px] font-semibold'>Simulate an unverified seller account</span>
                <span className='relative h-5 w-9 shrink-0 rounded-full transition-colors' style={{ background: simulateUnverified ? C.amber : C.border }}>
                  <span className='absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform' style={{ transform: simulateUnverified ? 'translateX(15px)' : 'translateX(2px)' }} />
                </span>
              </button>
              <button
                type='submit'
                disabled={busy}
                className='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50'
                style={{ background: C.accent }}>
                {busy ? <Loader2 className='h-4 w-4 animate-spin' /> : <CreditCard className='h-4 w-4' />}
                {submitLabel}
              </button>
            </div>
          </form>
        </div>

        {/* Fan-out: charge splits into platform fee + seller payout */}
        <div className='rounded-xl p-2.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <p className='text-center text-[11.5px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
            Payment split
          </p>
          <Node icon={CreditCard} label='Buyer' caption={caption(buyerStatus, 'waiting', 'charging…', `paid $${AMOUNT.toFixed(2)}`)} status={buyerStatus} />
          <Connector />
          <Node icon={Store} label='Ferngrove Market' caption={caption(platformStatus, 'waiting', 'capturing…', 'charge captured')} status={platformStatus} />
          <Connector />
          <div className='flex gap-2'>
            <Branch icon={Percent} label='Platform fee' status={feeStatus} okText={`$${FEE.toFixed(2)} retained`} />
            <Branch
              icon={Store}
              label='Alder & Finch Pottery'
              status={payoutStatus}
              okText={`$${PAYOUT.toFixed(2)} paid out`}
              blockedText='held — pending verification'
            />
          </div>
        </div>

        {/* Log */}
        <div className='overflow-hidden rounded-xl' style={{ border: `1px solid ${C.border}` }}>
          <div className='px-4 py-2.5 text-[12px] font-semibold' style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, fontFamily: 'var(--font-jetbrains), monospace' }}>
            connect.transaction.log
          </div>
          <div ref={logRef} className='flex flex-col gap-1 overflow-y-auto p-2.5 text-[12px]' style={{ background: 'oklch(0.21 0.015 210)', minHeight: 60, maxHeight: 76, fontFamily: 'var(--font-jetbrains), monospace' }}>
            {log.length === 0 ? (
              <span style={{ color: 'oklch(0.6 0.01 210)' }}>{'// pay for the order to see the split happen'}</span>
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
  )
}

function caption(status: NodeStatus, waiting: string, active: string, done: string) {
  return status === 'pending' ? waiting : status === 'active' ? active : done
}

function Node({ icon: Icon, label, caption, status }: { icon: LucideIcon; label: string; caption: string; status: NodeStatus }) {
  return (
    <div className='flex items-center justify-center gap-2'>
      <span
        className='grid h-7 w-7 shrink-0 place-items-center rounded-full'
        style={{ background: status === 'done' ? C.green : status === 'active' ? C.accent : C.panel, color: status === 'pending' ? C.muted : 'white', border: status === 'pending' ? `1px solid ${C.border}` : 'none' }}>
        {status === 'active' ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Icon className='h-3.5 w-3.5' />}
      </span>
      <div>
        <p className='text-[12px] font-semibold'>{label}</p>
        <p className='text-[10px]' style={{ color: status === 'done' ? C.green : status === 'active' ? C.accent : C.muted }}>{caption}</p>
      </div>
    </div>
  )
}

function Connector() {
  return <div className='mx-auto h-1 w-px' style={{ background: C.border }} />
}

function Branch({ icon: Icon, label, status, okText, blockedText }: { icon: LucideIcon; label: string; status: NodeStatus; okText: string; blockedText?: string }) {
  const color = status === 'done' ? C.green : status === 'active' ? C.accent : status === 'blocked' ? C.amber : C.muted
  const bg = status === 'done' ? C.greenSoft : status === 'active' ? C.accentSoft : status === 'blocked' ? C.amberSoft : C.bg
  const border = status === 'done' ? C.green : status === 'active' ? C.accent : status === 'blocked' ? C.amber : C.border
  const text = status === 'pending' ? 'waiting' : status === 'active' ? 'sending…' : status === 'blocked' ? blockedText : okText
  return (
    <div className='flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1' style={{ border: `1px solid ${border}`, background: bg }}>
      <span
        className='grid h-6 w-6 shrink-0 place-items-center rounded-full'
        style={{ background: status === 'done' ? C.green : status === 'active' ? C.accent : status === 'blocked' ? C.amber : C.panel, color: status === 'pending' ? C.muted : 'white', border: status === 'pending' ? `1px solid ${C.border}` : 'none' }}>
        {status === 'active' ? <Loader2 className='h-3 w-3 animate-spin' /> : status === 'done' ? <Check className='h-3 w-3' /> : status === 'blocked' ? <AlertTriangle className='h-3 w-3' /> : <Icon className='h-3 w-3' />}
      </span>
      <div className='min-w-0 flex-1 text-left'>
        <p className='truncate text-[11px] font-semibold'>{label}</p>
        <p className='truncate text-[10px]' style={{ color }}>{text}</p>
      </div>
    </div>
  )
}

function logColor(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return 'oklch(0.75 0.15 155)'
    case 'fail': return 'oklch(0.72 0.17 25)'
    case 'hold': return 'oklch(0.8 0.13 85)'
    default: return 'oklch(0.75 0.01 210)'
  }
}

function logPrefix(kind: LogLine['kind']) {
  switch (kind) {
    case 'ok': return '✓'
    case 'fail': return '✕'
    case 'hold': return '⏸'
    default: return '·'
  }
}
