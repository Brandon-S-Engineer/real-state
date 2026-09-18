'use client'

// Argus Research — deep research agent demo. An orchestrator splits a
// research question into sub-tasks and dispatches several specialized
// worker agents that run CONCURRENTLY (not one after another), then a
// synthesizer merges their findings into one cited report. The parallel
// execution is the point — it's why 3 workers finish in the time of the
// slowest one, not the sum of all three. Findings are precomputed per
// sample (production wires this to real search/DB tools via Pydantic AI +
// asyncio.gather); this keeps the public demo instant and unbreakable
// while faithfully showing genuine concurrent execution, not a scripted
// sequential list wearing a parallel costume.

import { useEffect, useRef, useState } from 'react'
import {
  Building2, Check, GitMerge, Landmark, Loader2, ListChecks, MessageSquare, Scale, TrendingUp, Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const C = {
  bg: 'oklch(0.97 0.008 265)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.03 265 / 0.12)',
  fg: 'oklch(0.24 0.03 265)',
  muted: 'oklch(0.5 0.02 265)',
  accent: 'oklch(0.52 0.19 265)',
  accentSoft: 'oklch(0.52 0.19 265 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  greenSoft: 'oklch(0.58 0.15 155 / 0.1)',
  code: 'oklch(0.2 0.02 265)',
}

type Worker = { id: string; tag: string; label: string; icon: LucideIcon; ms: number; finding: string }
type Sample = { id: string; label: string; question: string; workers: Worker[]; report: string }

const SAMPLES: Sample[] = [
  {
    id: 'competitor', label: 'Competitor pricing',
    question: 'How does Northline Cycles price against us in the e-bike market?',
    workers: [
      { id: 'pricing', tag: 'Pricing', label: 'Pricing Analyst', icon: TrendingUp, ms: 1400, finding: 'Undercuts us 8–12% on entry models, premium on cargo bikes.' },
      { id: 'features', tag: 'Features', label: 'Feature Analyst', icon: ListChecks, ms: 1050, finding: 'Their mid-tier skips a torque sensor — ours has it standard.' },
      { id: 'sentiment', tag: 'Sentiment', label: 'Sentiment Analyst', icon: MessageSquare, ms: 1700, finding: 'Battery range anxiety is the #1 complaint across 40+ reviews.' },
    ],
    report: 'Northline prices 8–12% below us on entry models [Pricing], but their mid-tier skips a torque sensor we include standard [Features] — a real differentiator to lead with. Their biggest weak point is customer-reported battery range anxiety [Sentiment], worth targeting directly in messaging.',
  },
  {
    id: 'market', label: 'Market demand',
    question: 'Is there demand for a budget electric bike in the Midwest?',
    workers: [
      { id: 'demand', tag: 'Demand', label: 'Demand Analyst', icon: TrendingUp, ms: 1250, finding: 'Search interest up 34% YoY, concentrated in commuter suburbs.' },
      { id: 'competition', tag: 'Competition', label: 'Competitive Landscape', icon: Building2, ms: 1600, finding: 'Only 2 budget brands have real distribution — both under $900.' },
      { id: 'regulatory', tag: 'Regulatory', label: 'Regulatory Analyst', icon: Scale, ms: 950, finding: '4 of 6 states offer e-bike rebates up to $300.' },
    ],
    report: 'Demand is real and growing — Midwest search interest is up 34% YoY, concentrated in commuter suburbs [Demand]. Competition is thin: only two budget brands have real distribution there, both under $900 [Competition]. State rebates up to $300 in 4 of 6 states push an entry model well under that ceiling [Regulatory] — the timing and price window both look open.',
  },
  {
    id: 'diligence', label: 'Acquisition risk',
    question: 'What are the risks of acquiring Solara Robotics?',
    workers: [
      { id: 'financial', tag: 'Financial', label: 'Financial Analyst', icon: Landmark, ms: 1500, finding: '$4.2M short-term debt against $1.8M cash — a tight runway.' },
      { id: 'legal', tag: 'Legal', label: 'Legal Analyst', icon: Scale, ms: 1150, finding: 'One pending patent dispute, exposure bounded but real.' },
      { id: 'market', tag: 'Market', label: 'Market Analyst', icon: Building2, ms: 1350, finding: 'Credible #3 player, 6% share in a consolidating market.' },
    ],
    report: 'The financials are the real flag — $4.2M in short-term debt against $1.8M cash is a tight runway that would need addressing post-close [Financial]. Legal exposure is real but bounded to one patent dispute [Legal]. Strategically, Solara is a credible #3 with 6% share in a consolidating market [Market] — a reasonable bolt-on if the debt gets restructured as part of the deal.',
  },
]

type NodeStatus = 'pending' | 'active' | 'done'
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function renderCited(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <span key={i} className='font-semibold' style={{ color: C.accent }}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export default function DeepResearchAgentDemo() {
  const [sample, setSample] = useState(SAMPLES[0])
  const [question, setQuestion] = useState(SAMPLES[0].question)
  const [phase, setPhase] = useState<'idle' | 'planning' | 'running' | 'synthesizing' | 'done'>('idle')
  const [workerStatus, setWorkerStatus] = useState<Record<string, NodeStatus>>({})
  const [log, setLog] = useState<string[]>([])
  const [report, setReport] = useState<string | null>(null)
  const runId = useRef(0)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  function pick(s: Sample) {
    setSample(s)
    setQuestion(s.question)
    setPhase('idle')
    setReport(null)
    setWorkerStatus({})
  }

  async function run(e: React.FormEvent) {
    e.preventDefault()
    if (phase !== 'idle' && phase !== 'done') return
    const id = ++runId.current
    setReport(null)
    setLog(['· research.received'])
    setWorkerStatus(Object.fromEntries(sample.workers.map((w) => [w.id, 'pending'])))
    setPhase('planning')
    await delay(600)
    if (runId.current !== id) return

    setLog((l) => [...l, `✓ orchestrator.plan → ${sample.workers.length} parallel workers dispatched`])
    setPhase('running')
    setWorkerStatus(Object.fromEntries(sample.workers.map((w) => [w.id, 'active'])))

    // Every worker starts at the same instant and finishes independently —
    // genuine concurrency, not a chained sequence dressed up to look parallel.
    await Promise.all(
      sample.workers.map((w) =>
        delay(w.ms).then(() => {
          if (runId.current !== id) return
          setWorkerStatus((s) => ({ ...s, [w.id]: 'done' }))
          setLog((l) => [...l, `✓ ${w.label.toLowerCase().replace(/ /g, '-')} → done (${(w.ms / 1000).toFixed(1)}s)`])
        })
      )
    )
    if (runId.current !== id) return

    setPhase('synthesizing')
    await delay(550)
    if (runId.current !== id) return

    setReport(sample.report)
    setLog((l) => [...l, `✓ synthesizer.compose → report ready, ${sample.workers.length} sources cited`])
    setPhase('done')
  }

  const orchestratorStatus: NodeStatus = phase === 'idle' ? 'pending' : phase === 'planning' ? 'active' : 'done'
  const synthStatus: NodeStatus = phase === 'done' ? 'done' : phase === 'synthesizing' ? 'active' : 'pending'
  const running = phase === 'planning' || phase === 'running' || phase === 'synthesizing'

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Workflow className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Argus Research</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            multi-agent · parallel
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }}>
          3 agents in parallel · avg 1.6s per report
        </span>
      </header>

      <div className='mx-auto flex max-w-4xl min-w-0 flex-col gap-2.5 p-3'>
        {/* Question */}
        <div className='rounded-xl p-2.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className='flex flex-wrap gap-1.5'>
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                type='button'
                onClick={() => pick(s)}
                className='rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors'
                style={sample.id === s.id ? { background: C.accent, color: 'white' } : { border: `1px solid ${C.border}`, color: C.muted }}>
                {s.label}
              </button>
            ))}
          </div>
          <form onSubmit={run} className='mt-2 flex items-center gap-2'>
            <input
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setPhase('idle'); setReport(null); setWorkerStatus({}) }}
              className='min-w-0 flex-1 rounded-lg px-3 py-2 text-[13px] outline-none'
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
            />
            <button
              type='submit'
              disabled={running || !question.trim()}
              className='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50'
              style={{ background: C.accent }}>
              {running ? <Loader2 className='h-4 w-4 animate-spin' /> : <Workflow className='h-4 w-4' />}
              {running ? 'Researching…' : 'Run research'}
            </button>
          </form>
        </div>

        {/* Orchestration: fan-out to parallel workers, fan-in to synthesizer */}
        <div className='rounded-xl p-2.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <p className='text-center text-[12px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
            Orchestration — {sample.workers.length} agents run in parallel
          </p>

          <Node
            icon={Workflow}
            label='Orchestrator'
            caption={phase === 'idle' ? 'waiting' : phase === 'planning' ? 'planning…' : `→ ${sample.workers.length} workers dispatched`}
            status={orchestratorStatus}
          />
          <Connector />

          <div className='flex gap-2'>
            {sample.workers.map((w) => {
              const status = workerStatus[w.id] ?? 'pending'
              return (
                <div key={w.id} className='flex min-w-0 flex-1 flex-col items-center'>
                  <div className='h-1.5 w-px' style={{ background: C.border }} />
                  <div
                    className='flex w-full min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5'
                    style={{ border: `1px solid ${status === 'pending' ? C.border : status === 'active' ? C.accent : C.green}`, background: status === 'done' ? C.greenSoft : status === 'active' ? C.accentSoft : C.bg }}>
                    <span
                      className='grid h-6 w-6 shrink-0 place-items-center rounded-full'
                      style={{ background: status === 'done' ? C.green : status === 'active' ? C.accent : C.panel, color: status === 'pending' ? C.muted : 'white', border: status === 'pending' ? `1px solid ${C.border}` : 'none' }}>
                      {status === 'active' ? <Loader2 className='h-3 w-3 animate-spin' /> : status === 'done' ? <Check className='h-3 w-3' /> : <w.icon className='h-3 w-3' />}
                    </span>
                    <div className='min-w-0 flex-1 text-left'>
                      <p className='truncate text-[11px] font-semibold'>{w.label}</p>
                      <p className='truncate text-[10px]' style={{ color: status === 'done' ? C.green : status === 'active' ? C.accent : C.muted }}>
                        {status === 'pending' ? 'waiting' : status === 'active' ? 'researching…' : w.finding}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Connector />
          <Node
            icon={GitMerge}
            label='Synthesizer'
            caption={synthStatus === 'pending' ? 'waiting' : synthStatus === 'active' ? 'merging findings…' : '→ report ready'}
            status={synthStatus}
          />
        </div>

        {/* Report + trace */}
        <div className='overflow-hidden rounded-xl' style={{ border: `1px solid ${C.border}` }}>
          <div className='px-4 py-1.5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
            <span className='text-[12px] font-semibold' style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>research_report.md</span>
          </div>
          <div className='p-2 text-[12px]' style={{ lineHeight: 1.5 }}>
            {!report ? (
              <span style={{ color: C.muted, opacity: 0.7 }}>{'// run research to see the synthesized, cited report'}</span>
            ) : (
              <p className='line-clamp-3'>{renderCited(report)}</p>
            )}
          </div>
          <div ref={logRef} className='flex flex-col gap-0.5 overflow-y-auto p-2 text-[11px]' style={{ background: 'oklch(0.2 0.02 265)', borderTop: '1px solid oklch(1 0 0 / 0.08)', minHeight: 28, maxHeight: 44, fontFamily: 'var(--font-jetbrains), monospace' }}>
            {log.length === 0 ? (
              <span style={{ color: 'oklch(0.6 0.01 265)' }}>{'// submit a question to see the orchestration trace'}</span>
            ) : (
              log.map((l, i) => (
                <div key={i} style={{ color: l.startsWith('✓') ? 'oklch(0.75 0.15 155)' : 'oklch(0.75 0.01 265)' }}>{l}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Node({ icon: Icon, label, caption, status }: { icon: LucideIcon; label: string; caption: string; status: NodeStatus }) {
  return (
    <div className='flex items-center justify-center gap-2 py-0.5'>
      <span
        className='grid h-8 w-8 shrink-0 place-items-center rounded-full'
        style={{ background: status === 'done' ? C.green : status === 'active' ? C.accent : C.panel, color: status === 'pending' ? C.muted : 'white', border: status === 'pending' ? `1px solid ${C.border}` : 'none' }}>
        {status === 'active' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Icon className='h-4 w-4' />}
      </span>
      <div>
        <p className='text-[12.5px] font-semibold'>{label}</p>
        <p className='text-[10.5px]' style={{ color: status === 'done' ? C.green : status === 'active' ? C.accent : C.muted }}>{caption}</p>
      </div>
    </div>
  )
}

function Connector() {
  return <div className='mx-auto h-1.5 w-px' style={{ background: C.border }} />
}
