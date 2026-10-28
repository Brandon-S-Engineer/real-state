'use client'

// Oportunidades reales de hoy + Deal Desk. Al evaluar un anuncio, cada agente
// aparece en vivo: los que son código o SQL, los LLM (market y risk corren en
// paralelo) y el veredicto final con la oferta lista para mandar.

import { useEffect, useRef, useState } from 'react'
import { Check, Circle, Clipboard, Code2, Database, Loader2, ShieldAlert, Sparkles } from 'lucide-react'
import type { AgentId, DeskEvent, DeskResult, Opportunity } from '@/lib/resale/types'

const mxn = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

const STEPS: Record<AgentId, { label: string; kind: 'code' | 'SQL' | 'LLM'; hint: string; thinking: string }> = {
  parse: { label: 'Parse listing', kind: 'code', hint: 'deterministic parser', thinking: 'Detecting model, storage and flags…' },
  spec: { label: 'Spec analyst', kind: 'LLM', hint: 'only when the parser is unsure', thinking: 'Reading the text for storage and condition…' },
  comps: { label: 'Market comps', kind: 'SQL', hint: 'real comparable listings', thinking: 'Querying comparable listings…' },
  market: { label: 'Market analyst', kind: 'LLM', hint: 'resale price & speed', thinking: 'Estimating resale price and days to sell…' },
  risk: { label: 'Risk analyst', kind: 'LLM', hint: 'scams, locks, damage', thinking: 'Looking for scam and condition red flags…' },
  lead: { label: 'Deal lead', kind: 'LLM', hint: 'verdict + offer message', thinking: 'Weighing everything and writing the offer…' },
}

type StepState = { status: 'start' | 'done' | 'skipped'; ms?: number; tokens?: number; output?: Record<string, unknown>; note?: string }

const KIND_ICON = { code: Code2, SQL: Database, LLM: Sparkles }

const SAMPLE = 'iPhone 16 Pro Max 256 $6,000 solo hoy, te lo envío por paquetería, pago por adelantado'

export default function ResaleWorkbench({ opportunities }: { opportunities: Opportunity[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [steps, setSteps] = useState<Partial<Record<AgentId, StepState>>>({})
  const [final, setFinal] = useState<{ result: DeskResult; ms: number; tokens: number; cost: number | null } | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [now, setNow] = useState(0)
  const [copied, setCopied] = useState(false)
  const started = useRef(0)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [running])

  async function evaluate(input: { listingId: string } | { text: string }, key: string) {
    setSelected(key)
    setSteps({})
    setFinal(null)
    setError('')
    setCopied(false)
    setRunning(true)
    started.current = Date.now()
    setNow(Date.now())
    if (window.matchMedia('(max-width: 1023px)').matches) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    try {
      const res = await fetch('/api/resale-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? 'Request failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const ev = JSON.parse(line) as DeskEvent | { type: 'error'; message: string }
          if (ev.type === 'error') throw new Error(ev.message)
          if (ev.type === 'final') setFinal(ev)
          if (ev.type === 'step') setSteps((s) => ({ ...s, [ev.id]: ev }))
        }
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const elapsed = ((running ? now : final ? started.current + final.ms : now) - started.current) / 1000

  return (
    <div className='grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
      {/* OPPORTUNITIES */}
      <div className='min-w-0 rounded-[16px] p-4' style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className='site-kicker'>Today&apos;s flagged deals · real listings</p>
        <p className='mt-1 text-[13px]' style={{ color: 'var(--muted)' }}>
          Scored by the CRM against the market. Pick one and let the agents decide.
        </p>
        <ul className='mt-3 max-h-[440px] space-y-1.5 overflow-y-auto pr-1'>
          {opportunities.map((o) => {
            const vs = o.marketP50 ? Math.round(((o.marketP50 - o.price) / o.marketP50) * 100) : null
            const isSel = selected === o.id
            return (
              <li key={o.id}>
                <button
                  type='button'
                  disabled={running}
                  onClick={() => evaluate({ listingId: o.id }, o.id)}
                  className='w-full rounded-[10px] px-3 py-2 text-left disabled:cursor-wait'
                  style={{
                    background: isSel ? 'var(--accent-soft)' : 'var(--bg-2)',
                    border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  <span className='flex items-baseline justify-between gap-2'>
                    <span className='truncate text-[13.5px] font-medium'>{o.model}</span>
                    <span className='site-mono shrink-0 text-[13px] font-medium'>{mxn(o.price)}</span>
                  </span>
                  <span className='mt-0.5 block truncate text-[12px]' style={{ color: 'var(--muted)' }}>
                    “{o.title}”
                  </span>
                  <span className='site-mono mt-1 flex flex-wrap gap-x-3 text-[11px]' style={{ color: 'var(--muted)' }}>
                    {vs != null && (
                      <span style={{ color: vs > 0 ? 'var(--live)' : undefined }}>
                        {vs > 0 ? `${vs}% under` : `${-vs}% over`} median
                      </span>
                    )}
                    <span>score {o.score}</span>
                    {o.zone && <span>{o.zone}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className='mt-4'>
          <p className='site-kicker'>Or paste any listing</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder={SAMPLE}
            aria-label='Listing text'
            className='mt-1.5 w-full resize-none rounded-[10px] px-3 py-2 text-[13px]'
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', lineHeight: 1.5 }}
          />
          <div className='mt-1.5 flex gap-2'>
            <button
              type='button'
              disabled={running}
              onClick={() => evaluate({ text: text.trim() || SAMPLE }, 'text')}
              className='site-btn site-btn-accent h-10 flex-1 justify-center text-[14px] disabled:opacity-50'>
              {running && selected === 'text' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Sparkles className='h-4 w-4' />}
              Evaluate {text.trim() ? 'listing' : 'the sample'}
            </button>
          </div>
        </div>
      </div>

      {/* DEAL DESK */}
      <div ref={panel} className='min-w-0 scroll-mt-4 rounded-[16px] p-4' style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className='flex items-center justify-between gap-2'>
          <p className='site-kicker'>Deal desk · multi-agent</p>
          {(running || final) && (
            <span className='site-mono text-[11.5px]' style={{ color: 'var(--muted)' }}>
              {elapsed.toFixed(1)}s
            </span>
          )}
        </div>

        {!running && !final && !error && (
          <p className='mt-3 text-[13.5px]' style={{ color: 'var(--muted)', lineHeight: 1.55 }}>
            Six steps, two kinds of work. <b>Code and SQL</b> produce every number: the parse, the comparable sales, the
            margin target and the max price. <b>LLM agents</b> only judge what code can&apos;t — ambiguous text, scam
            signals, and how to word the offer — and their output is schema-validated and clamped to the numbers.
          </p>
        )}
        {error && (
          <p className='mt-3 text-[13.5px]' style={{ color: 'var(--accent)' }}>
            {error}
          </p>
        )}

        {(running || final) && (
          <div className='mt-3 space-y-2'>
            {(['parse', 'spec', 'comps'] as AgentId[]).map((id) => (
              <StepCard key={id} id={id} state={steps[id]} />
            ))}
            <div className='site-mono flex items-center gap-2 pt-1 text-[10.5px] uppercase' style={{ color: 'var(--muted)' }}>
              <span className='h-px flex-1' style={{ background: 'var(--border)' }} />
              running in parallel
              <span className='h-px flex-1' style={{ background: 'var(--border)' }} />
            </div>
            <div className='grid gap-2 sm:grid-cols-2'>
              <StepCard id='market' state={steps.market} />
              <StepCard id='risk' state={steps.risk} />
            </div>
            <StepCard id='lead' state={steps.lead} />
          </div>
        )}

        {final && <Verdict f={final} copied={copied} onCopy={() => {
          navigator.clipboard.writeText(final.result.offerMessage).then(() => setCopied(true))
        }} />}
      </div>
    </div>
  )
}

function StepCard({ id, state }: { id: AgentId; state?: StepState }) {
  const meta = STEPS[id]
  const KindIcon = KIND_ICON[meta.kind]
  const status = state?.status
  const Icon = status === 'done' ? Check : status === 'start' ? Loader2 : Circle
  return (
    <div
      className='min-w-0 rounded-[12px] px-3 py-2.5'
      style={{ background: 'var(--card)', border: '1px solid var(--border)', opacity: status === 'skipped' ? 0.6 : status ? 1 : 0.5 }}>
      <div className='flex items-center gap-2'>
        <Icon
          className={`h-4 w-4 shrink-0 ${status === 'start' ? 'animate-spin' : ''}`}
          style={{ color: status === 'done' ? 'var(--live)' : status === 'start' ? 'var(--accent)' : 'var(--border)' }}
        />
        <span className='shrink-0 text-[13px] font-medium'>{meta.label}</span>
        <span
          className='site-mono inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px]'
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
          <KindIcon className='h-3 w-3' />
          {meta.kind}
        </span>
        <span className='site-mono ml-auto min-w-0 truncate text-[10.5px]' style={{ color: 'var(--muted)' }}>
          {state?.ms != null && `${(state.ms / 1000).toFixed(1)}s`}
          {state?.tokens != null && ` · ${state.tokens} tok`}
          {!state && meta.hint}
        </span>
      </div>
      {status === 'start' && (
        <div className='mt-2 space-y-1.5'>
          <p className='text-[12px]' style={{ color: 'var(--muted)' }}>
            {meta.thinking}
          </p>
          <div className='site-skeleton h-[8px] w-[85%]' />
          <div className='site-skeleton h-[8px] w-[60%]' />
        </div>
      )}
      {status === 'skipped' && (
        <p className='mt-1 text-[12px]' style={{ color: 'var(--muted)' }}>
          Skipped — {state?.note}
        </p>
      )}
      {status === 'done' && state?.output && <StepOutput id={id} o={state.output} />}
    </div>
  )
}

function Line({ children }: { children: React.ReactNode }) {
  return (
    <p className='mt-1 text-[12.5px]' style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
      {children}
    </p>
  )
}

function StepOutput({ id, o }: { id: AgentId; o: Record<string, unknown> }) {
  const n = (k: string) => (typeof o[k] === 'number' ? mxn(o[k] as number) : '—')
  switch (id) {
    case 'parse':
      return (
        <Line>
          {String(o.model)} · storage {String(o.storage)} · asking {n('price')} · confidence {Number(o.confidence).toFixed(2)}
        </Line>
      )
    case 'spec':
      return (
        <Line>
          Storage → {o.ssdGb ? `${o.ssdGb} GB` : 'not stated (kept unknown, no guessing)'} · {String(o.condition)}. {String(o.notes)}
        </Line>
      )
    case 'comps':
      return (
        <Line>
          <span className='site-mono text-[11.5px]'>
            {Number(o.n).toLocaleString('en-US')} comps · {String(o.scope)} · P25 {n('p25')} · median {n('p50')} · P75 {n('p75')} ·{' '}
            {Number(o.gone).toLocaleString('en-US')} sold{o.medianDaysToSell != null ? ` in ~${o.medianDaysToSell} d` : ''} · price ceiling{' '}
            {n('ceiling')}
          </span>
        </Line>
      )
    case 'market':
      return (
        <>
          <p className='site-mono mt-1 text-[11.5px]'>
            resale {n('expectedSale')} · demand {String(o.demand)}
          </p>
          <Line>{String(o.summary)}</Line>
        </>
      )
    case 'risk': {
      const level = String(o.risk)
      return (
        <>
          <p className='site-mono mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]'>
            <span
              className='inline-flex items-center gap-1 rounded-full px-1.5'
              style={{
                background: level === 'low' ? 'color-mix(in oklch, var(--live) 18%, transparent)' : 'var(--accent-soft)',
                color: level === 'low' ? 'var(--live)' : 'var(--accent)',
              }}>
              {level !== 'low' && <ShieldAlert className='h-3 w-3' />}
              {level} risk
            </span>
            <span>haircut {String(o.haircutPct)}%</span>
            {(o.flags as string[]).map((f) => (
              <span key={f} className='rounded-full px-1.5' style={{ border: '1px solid var(--border)' }}>
                {f}
              </span>
            ))}
          </p>
          <Line>{String(o.summary)}</Line>
        </>
      )
    }
    case 'lead':
      return (
        <ul className='mt-1 list-disc space-y-0.5 pl-4 text-[12.5px]' style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          {(o.reasoning as string[]).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )
  }
}

function Verdict({ f, copied, onCopy }: { f: { result: DeskResult; ms: number; tokens: number; cost: number | null }; copied: boolean; onCopy: () => void }) {
  const r = f.result
  const tone = r.verdict === 'BUY' ? 'var(--live)' : 'var(--accent)'
  const stats = [
    ['Asking', mxn(r.price)],
    ['Max buy', mxn(r.maxBuy)],
    ['Resale', mxn(r.expectedSale)],
    ...(r.verdict === 'PASS' ? [] : [['Margin', mxn(r.margin)]]),
    ...(r.daysToSell != null ? [['Sells in', `~${r.daysToSell} d`]] : []),
  ]
  return (
    <div className='mt-3 rounded-[14px] p-4' style={{ background: 'var(--card)', border: `1.5px solid ${tone}` }}>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <span className='site-display text-[24px] font-bold' style={{ color: tone, letterSpacing: '-0.02em' }}>
          {r.verdict}
        </span>
        <span className='truncate text-[13px] font-medium'>{r.model}</span>
      </div>
      <div className='site-mono mt-2 grid grid-cols-3 gap-2 text-[11.5px] sm:grid-cols-5'>
        {stats.map(([k, v]) => (
          <div key={k} className='rounded-[8px] px-2 py-1.5' style={{ background: 'var(--bg-2)' }}>
            <div style={{ color: 'var(--muted)' }}>{k}</div>
            <div className='mt-0.5 text-[13px] font-medium'>{v}</div>
          </div>
        ))}
      </div>
      {r.guardrail && (
        <p className='site-mono mt-2 text-[11px]' style={{ color: 'var(--accent)' }}>
          guardrail: {r.guardrail}
        </p>
      )}
      <p className='site-kicker mt-3'>Message to the seller (Spanish)</p>
      <div className='mt-1.5 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[13px]' style={{ background: 'var(--bg-2)', lineHeight: 1.5 }}>
        <span className='flex-1'>{r.offerMessage}</span>
        <button type='button' onClick={onCopy} aria-label='Copy message' className='shrink-0 p-0.5' style={{ color: 'var(--muted)' }}>
          {copied ? <Check className='h-4 w-4' style={{ color: 'var(--live)' }} /> : <Clipboard className='h-4 w-4' />}
        </button>
      </div>
      <p className='site-mono mt-2 text-[11px]' style={{ color: 'var(--muted)' }}>
        {f.tokens.toLocaleString('en-US')} tokens · {f.cost != null ? `$${f.cost.toFixed(4)}` : '—'} · {(f.ms / 1000).toFixed(1)}s ·
        numbers by code, judgment by LLM
      </p>
    </div>
  )
}

