'use client'

// LedgerLens — document AI demo. Pick a sample document, run extraction, get
// schema-validated JSON with per-field confidence; low-confidence fields land
// in a review queue. Extraction is precomputed — production runs an LLM
// pipeline (vision + structured output) per page.

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, FileScan, Loader2, ScanLine } from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.005 220)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 220 / 0.12)',
  fg: 'oklch(0.24 0.02 230)',
  muted: 'oklch(0.5 0.015 230)',
  accent: 'oklch(0.55 0.14 220)',
  accentSoft: 'oklch(0.55 0.14 220 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  amber: 'oklch(0.7 0.14 85)',
  code: 'oklch(0.21 0.02 230)',
  codeFg: 'oklch(0.85 0.01 230)',
}

type Field = { key: string; value: string; conf: number }
type Sample = { id: string; label: string; doc: { title: string; lines: [string, string][] }; fields: Field[] }

const SAMPLES: Sample[] = [
  {
    id: 'invoice',
    label: 'Invoice (scan)',
    doc: {
      title: 'NORTHWIND SUPPLIES — INVOICE',
      lines: [
        ['Invoice #', 'INV-2026-0847'], ['Date', 'July 8, 2026'], ['Bill to', 'Acme Robotics S.A.'],
        ['12× Servo motor SG-90', '$144.00'], ['4× Controller board v3', '$236.00'],
        ['Shipping', '$18.50'], ['TOTAL DUE', '$398.50'], ['Payment terms', 'Net 30'],
      ],
    },
    fields: [
      { key: 'invoice_number', value: '"INV-2026-0847"', conf: 99 },
      { key: 'issue_date', value: '"2026-07-08"', conf: 98 },
      { key: 'customer', value: '"Acme Robotics S.A."', conf: 97 },
      { key: 'total', value: '398.50', conf: 99 },
      { key: 'currency', value: '"USD"', conf: 95 },
      { key: 'payment_terms', value: '"net_30"', conf: 71 },
    ],
  },
  {
    id: 'contract',
    label: 'Contract (photo)',
    doc: {
      title: 'SERVICE AGREEMENT — DRAFT',
      lines: [
        ['Party A', 'Bluewater Logistics LLC'], ['Party B', 'Harbor Freight Co.'],
        ['Effective date', 'August 1, 2026'], ['Term', '24 months, auto-renew'],
        ['Monthly fee', '$4,200'], ['Notice period', '60 days'], ['Governing law', 'State of Delaware'],
      ],
    },
    fields: [
      { key: 'party_a', value: '"Bluewater Logistics LLC"', conf: 98 },
      { key: 'party_b', value: '"Harbor Freight Co."', conf: 96 },
      { key: 'effective_date', value: '"2026-08-01"', conf: 97 },
      { key: 'term_months', value: '24', conf: 92 },
      { key: 'monthly_fee', value: '4200', conf: 88 },
      { key: 'notice_days', value: '60', conf: 64 },
    ],
  },
]

const STAGES = ['reading document layout', 'locating fields & tables', 'extracting with schema validation', 'scoring confidence per field']

export default function DocExtractorDemo() {
  const [sample, setSample] = useState(SAMPLES[0])
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [stage, setStage] = useState(0)
  const [approved, setApproved] = useState<string[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => () => clearInterval(timer.current), [])

  function run() {
    if (phase === 'running') return
    setPhase('running')
    setStage(0)
    setApproved([])
    let s = 0
    timer.current = setInterval(() => {
      s += 1
      if (s >= STAGES.length) { clearInterval(timer.current); setPhase('done') }
      else setStage(s)
    }, 620)
  }

  function pick(s: Sample) {
    setSample(s)
    setPhase('idle')
    setApproved([])
  }

  const review = sample.fields.filter((f) => f.conf < 80)

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <FileScan className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>LedgerLens</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            documents → structured data
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          1,240 docs this month · 97.8% auto
        </span>
      </header>

      <div className='mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-2'>
        {/* Left: document */}
        <div className='rounded-xl p-4' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex gap-1.5'>
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pick(s)}
                  className='rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors'
                  style={sample.id === s.id ? { background: C.accent, color: 'white' } : { border: `1px solid ${C.border}`, color: C.muted }}>
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={run}
              disabled={phase === 'running'}
              className='inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50'
              style={{ background: C.accent }}>
              {phase === 'running' ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <ScanLine className='h-3.5 w-3.5' />}
              {phase === 'running' ? 'Extracting…' : 'Extract data'}
            </button>
          </div>

          {/* Fake document */}
          <div className='relative mt-3 overflow-hidden rounded-lg p-5' style={{ background: 'oklch(0.99 0.002 90)', border: `1px solid ${C.border}`, minHeight: 330 }}>
            {phase === 'running' && (
              <div className='absolute inset-x-0 h-10 animate-pulse' style={{ background: `linear-gradient(180deg, transparent, ${C.accentSoft}, transparent)`, top: `${stage * 25}%`, transition: 'top .5s ease' }} />
            )}
            <p className='text-[13px] font-bold tracking-wide' style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>{sample.doc.title}</p>
            <div className='mt-3 flex flex-col gap-2'>
              {sample.doc.lines.map(([k, v]) => (
                <div key={k} className='flex justify-between gap-4 text-[12.5px]' style={{ fontFamily: 'var(--font-jetbrains), monospace', color: 'oklch(0.35 0.01 60)' }}>
                  <span style={{ color: C.muted }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {phase === 'running' && (
            <div className='mt-3 rounded-lg p-3 text-[12px]' style={{ background: C.bg, fontFamily: 'var(--font-jetbrains), monospace', color: C.muted }}>
              {STAGES.slice(0, stage + 1).map((s, i) => (
                <div key={s} className='flex items-center gap-2 py-0.5'>
                  {i < stage ? <Check className='h-3.5 w-3.5' style={{ color: C.green }} /> : <Loader2 className='h-3.5 w-3.5 animate-spin' style={{ color: C.accent }} />}
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: JSON + review */}
        <div className='flex flex-col gap-4'>
          <div className='overflow-hidden rounded-xl' style={{ border: `1px solid ${C.border}` }}>
            <div className='flex items-center justify-between px-4 py-2.5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
              <span className='text-[12px] font-semibold' style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>output.json</span>
              {phase === 'done' && (
                <span className='inline-flex items-center gap-1 text-[11.5px]' style={{ color: C.green, fontFamily: 'var(--font-jetbrains), monospace' }}>
                  <Check className='h-3.5 w-3.5' /> schema valid
                </span>
              )}
            </div>
            <div className='p-4 text-[12.5px] leading-[1.9]' style={{ background: C.code, color: C.codeFg, fontFamily: 'var(--font-jetbrains), monospace', minHeight: 220 }}>
              {phase !== 'done' ? (
                <span style={{ opacity: 0.45 }}>{phase === 'running' ? '// extracting…' : '// run extraction to see structured output'}</span>
              ) : (
                <>
                  <span>{'{'}</span>
                  {sample.fields.map((f, i) => (
                    <div key={f.key} className='flex flex-wrap items-center justify-between gap-2 pl-4'>
                      <span>
                        <span style={{ color: 'oklch(0.75 0.12 220)' }}>&quot;{f.key}&quot;</span>
                        <span>: </span>
                        <span style={{ color: 'oklch(0.78 0.13 130)' }}>{f.value}</span>
                        {i < sample.fields.length - 1 && ','}
                      </span>
                      <span className='inline-flex items-center gap-1.5'>
                        <span className='h-1 w-14 overflow-hidden rounded-full' style={{ background: 'oklch(1 0 0 / 0.15)' }}>
                          <span className='block h-1 rounded-full' style={{ width: `${f.conf}%`, background: f.conf >= 80 ? C.green : C.amber }} />
                        </span>
                        <span className='text-[10.5px]' style={{ color: f.conf >= 80 ? C.green : C.amber }}>{f.conf}%</span>
                      </span>
                    </div>
                  ))}
                  <span>{'}'}</span>
                </>
              )}
            </div>
          </div>

          {/* Review queue */}
          {phase === 'done' && review.length > 0 && (
            <div className='rounded-xl p-4' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <p className='flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase' style={{ color: C.amber, letterSpacing: '0.07em' }}>
                <AlertTriangle className='h-3.5 w-3.5' /> Review queue — low confidence
              </p>
              <div className='mt-2 flex flex-col gap-2'>
                {review.map((f) => {
                  const ok = approved.includes(f.key)
                  return (
                    <div key={f.key} className='flex items-center justify-between gap-3 rounded-lg p-2.5' style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                      <span className='text-[12.5px]' style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
                        {f.key} = {f.value} <span style={{ color: C.amber }}>({f.conf}%)</span>
                      </span>
                      <button
                        onClick={() => setApproved((a) => [...a, f.key])}
                        disabled={ok}
                        className='rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-white'
                        style={{ background: ok ? C.green : C.accent }}>
                        {ok ? '✓ Approved' : 'Approve'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className='mt-2 text-[11.5px]' style={{ color: C.muted }}>
                Humans only touch fields under 80% confidence — everything else flows straight to your system.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
