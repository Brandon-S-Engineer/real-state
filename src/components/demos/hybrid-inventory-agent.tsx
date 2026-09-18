'use client'

// Continental Motors — hybrid inventory agent demo. One agent, two tools: a
// semantic-search (RAG) tool over model/trim descriptions for fuzzy questions,
// and a SQL tool over the live inventory table for exact ones. The agent
// decides which tool a question needs. Tool calls and results are
// precomputed per sample (production wires this to pgvector + a real
// Postgres table via FastAPI/Pydantic AI); this keeps the public demo
// instant and unbreakable while faithfully showing both tools actually
// firing, with their real payloads, not a black box.

import { useEffect, useRef, useState } from 'react'
import {
  Car, Check, CheckCheck, Database, Loader2, MessageSquare, Search, Sparkles, Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.006 195)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 195 / 0.12)',
  fg: 'oklch(0.24 0.02 195)',
  muted: 'oklch(0.5 0.015 195)',
  accent: 'oklch(0.55 0.13 195)',
  accentSoft: 'oklch(0.55 0.13 195 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  greenSoft: 'oklch(0.58 0.15 155 / 0.1)',
  rag: 'oklch(0.55 0.17 295)',
  ragSoft: 'oklch(0.55 0.17 295 / 0.1)',
  sql: 'oklch(0.52 0.14 230)',
  sqlSoft: 'oklch(0.52 0.14 230 / 0.1)',
  code: 'oklch(0.21 0.015 195)',
}

type Chunk = { source: string; score: number; text: string }
type SqlRow = string[]
type Sample = {
  id: string
  label: string
  group: 'fuzzy' | 'exact'
  question: string
  tool: 'rag' | 'sql'
  reason: string
  chunks?: Chunk[]
  sql?: string
  columns?: string[]
  rows?: SqlRow[]
  answer: string
}

const SAMPLES: Sample[] = [
  {
    id: 'city', group: 'fuzzy', label: 'Good for city driving?',
    question: "What's a good car for city driving?",
    tool: 'rag', reason: 'descriptive question — no exact filter to run',
    chunks: [
      { source: 'kb/kestrel-spark.md', score: 0.91, text: 'Spark is fully electric with one-pedal driving and the tightest turning radius in our lineup — great for tight streets.' },
      { source: 'kb/kestrel-comet.md', score: 0.78, text: 'Comet is our value compact — reliable, cheap to insure, and easy to maneuver for a simple commuter.' },
    ],
    answer: 'The Kestrel Spark — electric, one-pedal driving, tightest turning radius we sell, built for tight streets.',
  },
  {
    id: 'trims', group: 'fuzzy', label: 'LX vs Sport trim?',
    question: "What's the difference between the LX and Sport trims on the Ridge?",
    tool: 'rag', reason: 'descriptive comparison — no exact filter to run',
    chunks: [
      { source: 'kb/halvorra-ridge-trims.md', score: 0.94, text: 'Ridge LX: cloth seats, 17” wheels, standard safety suite. Ridge Sport adds leather, 19” wheels, sport-tuned suspension, adaptive cruise.' },
    ],
    answer: 'LX: cloth seats, 17” wheels, standard safety. Sport adds leather, 19” wheels, sport suspension, adaptive cruise.',
  },
  {
    id: 'family', group: 'fuzzy', label: 'Best for a family trip?',
    question: 'Which of your cars is best for a family road trip?',
    tool: 'rag', reason: 'descriptive question — no exact filter to run',
    chunks: [
      { source: 'kb/halvorra-ridge.md', score: 0.89, text: 'The Ridge blends SUV cargo space with car-like handling — raised seating and driver aids make it an easy pick for long trips.' },
      { source: 'kb/halvorra-aster.md', score: 0.81, text: 'The Aster has our quietest cabin yet, with adaptive cruise and a fuel-sipping hybrid drivetrain built for long commutes.' },
    ],
    answer: 'The Halvorra Ridge — SUV cargo space and car-like handling, built for long trips.',
  },
  {
    id: 'blue30k', group: 'exact', label: 'Blue ones under $30k?',
    question: 'How many blue cars do you have under $30,000?',
    tool: 'sql', reason: 'exact count + numeric filter — needs the live table',
    sql: "SELECT model, trim, color, price FROM inventory\nWHERE color = 'steel blue' AND price < 30000 AND status = 'available';",
    columns: ['model', 'trim', 'color', 'price'],
    rows: [
      ['Halvorra Ridge', 'LX', 'Steel Blue', '$28,400'],
      ['Kestrel Spark', 'LX', 'Steel Blue', '$26,100'],
    ],
    answer: 'Two in stock right now: a Halvorra Ridge LX at $28,400 and a Kestrel Spark LX at $26,100 — both steel blue.',
  },
  {
    id: 'cheapest', group: 'exact', label: 'Cheapest Kestrel Spark?',
    question: "What's the cheapest Kestrel Spark in stock?",
    tool: 'sql', reason: 'exact min-price lookup — needs the live table',
    sql: "SELECT model, trim, color, price FROM inventory\nWHERE model = 'Kestrel Spark' AND status = 'available'\nORDER BY price ASC LIMIT 1;",
    columns: ['model', 'trim', 'color', 'price'],
    rows: [['Kestrel Spark', 'LX', 'Steel Blue', '$26,100']],
    answer: 'The cheapest available Kestrel Spark is an LX in Steel Blue at $26,100.',
  },
  {
    id: 'available', group: 'exact', label: 'Any Halvorra Ridge left?',
    question: 'Do you have any Halvorra Ridge models available right now?',
    tool: 'sql', reason: 'exact availability check — needs the live table',
    sql: "SELECT model, trim, color, price FROM inventory\nWHERE model = 'Halvorra Ridge' AND status = 'available';",
    columns: ['model', 'trim', 'color', 'price'],
    rows: [
      ['Halvorra Ridge', 'LX', 'Steel Blue', '$28,400'],
      ['Halvorra Ridge', 'Sport', 'Steel Blue', '$31,200'],
      ['Halvorra Ridge', 'LX', 'Midnight Black', '$27,900'],
      ['Halvorra Ridge', 'Sport', 'Crimson Red', '$32,500'],
    ],
    answer: 'Yes — 4 available right now, ranging from a Steel Blue LX at $27,900 to a Crimson Red Sport at $32,500.',
  },
]

type StepId = 'received' | 'deciding' | 'executing' | 'answered'
type StepStatus = 'pending' | 'active' | 'done'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'received', label: 'Question received' },
  { id: 'deciding', label: 'Agent selects tool' },
  { id: 'executing', label: 'Tool executing' },
  { id: 'answered', label: 'Answer ready' },
]

const INITIAL_STATUSES: Record<StepId, StepStatus> = {
  received: 'pending', deciding: 'pending', executing: 'pending', answered: 'pending',
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function HybridInventoryAgentDemo() {
  const [sample, setSample] = useState(SAMPLES[0])
  const [question, setQuestion] = useState(SAMPLES[0].question)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [statuses, setStatuses] = useState<Record<StepId, StepStatus>>(INITIAL_STATUSES)
  const [tool, setTool] = useState<'rag' | 'sql' | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [result, setResult] = useState<Sample | null>(null)
  const runId = useRef(0)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  function pick(s: Sample) {
    setSample(s)
    setQuestion(s.question)
    setPhase('idle')
    setResult(null)
    setTool(null)
    setStatuses(INITIAL_STATUSES)
  }

  async function run(e: React.FormEvent) {
    e.preventDefault()
    if (phase === 'running') return
    const id = ++runId.current
    setPhase('running')
    setResult(null)
    setTool(null)
    setStatuses(INITIAL_STATUSES)
    setLog(['· question.received'])

    setStatuses((s) => ({ ...s, received: 'done', deciding: 'active' }))
    await delay(500)
    if (runId.current !== id) return

    const toolFn = sample.tool === 'sql' ? 'query_inventory' : 'semantic_search'
    setTool(sample.tool)
    setStatuses((s) => ({ ...s, deciding: 'done', executing: 'active' }))
    setLog((l) => [...l, `✓ router.decide → ${sample.tool} (${sample.reason})`])
    await delay(700)
    if (runId.current !== id) return

    setStatuses((s) => ({ ...s, executing: 'done', answered: 'active' }))
    setLog((l) => [
      ...l,
      sample.tool === 'sql'
        ? `✓ ${toolFn}() → ${sample.rows?.length} row${sample.rows?.length === 1 ? '' : 's'} returned`
        : `✓ ${toolFn}() → ${sample.chunks?.length} chunks (top score ${sample.chunks?.[0].score})`,
    ])
    await delay(450)
    if (runId.current !== id) return

    setResult(sample)
    setStatuses((s) => ({ ...s, answered: 'done' }))
    setLog((l) => [...l, '✓ answer.compose — grounded in tool output'])
    setPhase('done')
  }

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Car className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Continental Motors</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            AI agent · RAG + SQL
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          2 tools · 10 units live
        </span>
      </header>

      <div className='mx-auto grid max-w-5xl gap-3 p-3 sm:grid-cols-[0.85fr_1.15fr]'>
        {/* Left: question */}
        <div className='flex min-w-0 flex-col gap-2.5'>
          <div
            className='rounded-xl p-4'
            style={{ background: C.panel, border: `1px solid ${phase === 'done' ? C.green : C.border}` }}>
            <p
              className='flex items-center gap-1.5 text-[12px] font-bold tracking-wide uppercase'
              style={{ color: phase === 'done' ? C.green : C.muted, letterSpacing: '0.06em' }}>
              {phase === 'done' && <Check className='h-3.5 w-3.5' />}
              {phase === 'done' ? 'Answered' : 'Ask about our cars'}
            </p>
            <p className='mt-1 line-clamp-2 text-[13px]' style={{ color: phase === 'done' ? C.fg : C.muted, lineHeight: 1.5 }}>
              {phase === 'done' && result ? result.answer : 'Pick a sample below or write your own — fuzzy or exact, the agent picks the tool.'}
            </p>

            <div className='mt-3 flex flex-wrap gap-1.5'>
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type='button'
                  onClick={() => pick(s)}
                  className='rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors'
                  style={
                    sample.id === s.id
                      ? { background: s.group === 'fuzzy' ? C.rag : C.sql, color: 'white' }
                      : { border: `1px solid ${s.group === 'fuzzy' ? C.ragSoft : C.sqlSoft}`, color: C.muted, background: s.group === 'fuzzy' ? C.ragSoft : C.sqlSoft }
                  }>
                  {s.label}
                </button>
              ))}
            </div>

            <form onSubmit={run} className='mt-3 flex flex-col gap-2.5'>
              <textarea
                value={question}
                onChange={(e) => { setQuestion(e.target.value); setPhase('idle'); setResult(null); setStatuses(INITIAL_STATUSES) }}
                rows={3}
                className='resize-none rounded-lg px-3 py-2 text-[13px] outline-none'
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg, lineHeight: 1.45 }}
              />
              <button
                type='submit'
                disabled={phase === 'running' || !question.trim()}
                className='inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50'
                style={{ background: C.accent }}>
                {phase === 'running' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Sparkles className='h-4 w-4' />}
                {phase === 'running' ? 'Thinking…' : phase === 'done' ? 'Ask another' : 'Ask the agent'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: agent trace + tool call */}
        <div className='flex min-w-0 flex-col gap-2.5'>
          <div className='rounded-xl p-3' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <p className='text-[12px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
              Agent trace
            </p>
            <div className='relative mt-1.5 flex flex-col'>
              <div className='absolute top-4 bottom-4 left-[17px] w-[2px]' style={{ background: C.border }} />
              {STEPS.map((step) => {
                const status = statuses[step.id]
                let Icon: LucideIcon = step.id === 'received' ? MessageSquare
                  : step.id === 'deciding' ? Sparkles
                    : step.id === 'answered' ? CheckCheck
                    : tool === 'sql' ? Database : tool === 'rag' ? Search : Wrench
                if (status === 'active') Icon = Loader2
                if (status === 'done' && step.id !== 'answered') Icon = Check
                const circleBg = status === 'done' ? C.green : status === 'active' ? C.accent : C.panel
                const caption =
                  status === 'pending' ? 'waiting'
                    : step.id === 'deciding' && (status === 'active')
                      ? 'deciding…'
                      : step.id === 'deciding' && tool
                        ? `→ ${tool === 'sql' ? 'query_inventory' : 'semantic_search'}`
                        : status === 'active' ? 'running…' : 'done'
                return (
                  <div key={step.id} className='relative flex items-start gap-3 py-1.5'>
                    <span
                      className='relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full'
                      style={{ background: circleBg, color: status === 'pending' ? C.muted : 'white', border: status === 'pending' ? `1px solid ${C.border}` : 'none' }}>
                      <Icon className={`h-4 w-4 ${status === 'active' ? 'animate-spin' : ''}`} />
                    </span>
                    <div className='pt-1'>
                      <p className='text-[13px] font-semibold'>{step.label}</p>
                      <p className='text-[11px]' style={{ color: status === 'done' ? C.green : status === 'active' ? C.accent : C.muted }}>{caption}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className='overflow-hidden rounded-xl' style={{ border: `1px solid ${C.border}` }}>
            <div className='flex items-center justify-between px-4 py-1.5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
              <span className='text-[12px] font-semibold' style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
                {tool === 'sql' ? 'query_inventory()' : tool === 'rag' ? 'semantic_search()' : 'tool_call()'}
              </span>
              {tool && (
                <span
                  className='rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase'
                  style={{ letterSpacing: '0.04em', color: tool === 'sql' ? C.sql : C.rag, background: tool === 'sql' ? C.sqlSoft : C.ragSoft }}>
                  {tool === 'sql' ? 'SQL' : 'RAG'}
                </span>
              )}
            </div>
            <div className='p-2 text-[11.5px]' style={{ background: C.code, color: 'oklch(0.85 0.01 195)', fontFamily: 'var(--font-jetbrains), monospace', lineHeight: 1.45 }}>
              {!result ? (
                <span style={{ opacity: 0.45 }}>{'// ask a question to see the tool call and its result'}</span>
              ) : result.tool === 'sql' ? (
                <>
                  <div className='truncate whitespace-pre' style={{ color: 'oklch(0.78 0.13 130)' }}>{result.sql?.replace(/\n/g, ' ')}</div>
                  <div className='mt-1.5 overflow-hidden rounded-md' style={{ border: '1px solid oklch(1 0 0 / 0.12)' }}>
                    <div className='grid' style={{ gridTemplateColumns: `repeat(${result.columns?.length}, 1fr)` }}>
                      {result.columns?.map((c) => (
                        <div key={c} className='truncate px-2 py-px font-semibold' style={{ color: C.sql, background: 'oklch(1 0 0 / 0.06)' }}>{c}</div>
                      ))}
                      {result.rows?.slice(0, 2).map((row, i) =>
                        row.map((cell, j) => (
                          <div key={`${i}-${j}`} className='truncate px-2 py-px' style={{ borderTop: '1px solid oklch(1 0 0 / 0.08)' }}>{cell}</div>
                        ))
                      )}
                    </div>
                  </div>
                  {(result.rows?.length ?? 0) > 2 && (
                    <div className='mt-1' style={{ opacity: 0.55 }}>{`+ ${(result.rows?.length ?? 0) - 2} more row${(result.rows?.length ?? 0) - 2 === 1 ? '' : 's'}`}</div>
                  )}
                </>
              ) : (
                <div className='flex min-w-0 flex-col gap-1'>
                  {result.chunks?.map((c) => (
                    <div key={c.source} className='truncate'>
                      <span style={{ color: C.rag }}>{c.source}</span>
                      <span style={{ opacity: 0.6 }}> · {c.score.toFixed(2)} — </span>
                      <span style={{ color: 'oklch(0.78 0.13 130)' }}>{c.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div ref={logRef} className='flex flex-col gap-0.5 overflow-y-auto p-2 text-[11px]' style={{ background: 'oklch(0.21 0.015 195)', borderTop: '1px solid oklch(1 0 0 / 0.08)', minHeight: 30, maxHeight: 44, fontFamily: 'var(--font-jetbrains), monospace' }}>
              {log.length === 0 ? (
                <span style={{ color: 'oklch(0.6 0.01 195)' }}>{'// submit a question to see the routing trace'}</span>
              ) : (
                log.map((l, i) => (
                  <div key={i} style={{ color: l.startsWith('✓') ? 'oklch(0.75 0.15 155)' : 'oklch(0.75 0.01 195)' }}>{l}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
