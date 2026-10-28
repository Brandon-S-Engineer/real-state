'use client'

// Demo del proyecto 02: lead agent en Python (FastAPI + LangGraph + MCP) que
// corre en un servicio aparte. Flujo: mensaje entrante → grafo en vivo →
// pausa para aprobación humana → ejecución vía MCP → el kanban del CRM cambia.

import { useCallback, useEffect, useState } from 'react'
import { Check, Circle, Loader2, PauseCircle, Send, X } from 'lucide-react'
import { site } from '@/content/site'

const API = process.env.NEXT_PUBLIC_LEAD_AGENT_URL || site.leadAgentUrl

const NODES = [
  { id: 'qualify', label: 'Qualify', hint: 'LLM · structured output' },
  { id: 'lookup', label: 'Look up', hint: 'MCP · find_contact, search_inventory' },
  { id: 'draft_reply', label: 'Draft reply', hint: 'LLM · streamed' },
  { id: 'propose_actions', label: 'Propose CRM actions', hint: 'LLM · MCP tool schemas' },
  { id: 'approval', label: 'Human approval', hint: 'LangGraph interrupt · Postgres checkpoint' },
  { id: 'execute', label: 'Execute', hint: 'MCP · write tools' },
] as const

const STAGES = ['new', 'qualified', 'quoted', 'won', 'lost'] as const

const PRESETS = [
  {
    label: 'Hot lead + trade-in',
    name: 'Carlos',
    contact: 'carlos@example.com',
    message: 'Hola! busco un iPhone 15 Pro, tengo como 19 mil y lo necesito esta semana. ¿Aceptan mi iPhone 12 a cuenta?',
  },
  {
    label: 'Browsing, low budget',
    name: 'Emily',
    contact: 'emily@example.com',
    message: "Hi, just looking. Do you have anything decent under 8,000 pesos? No rush.",
  },
  { label: 'Spam', name: '', contact: '+52 55 9999 0000', message: 'CLICK HERE to win FREE bitcoin!!! www.win-btc.xyz' },
]

type Action = { tool: string; args: Record<string, unknown>; why: string }
type Qualification = { intent: string; score: number; urgency: string; budget_mxn: number | null; summary: string }
type Contact = { id: number; contact_key: string; name: string | null; interest: string | null; score: number | null; stage: string }

export default function LeadAgentDemo() {
  const [awake, setAwake] = useState<'waking' | 'up' | 'down'>('waking')
  const [form, setForm] = useState(PRESETS[0])
  const [done, setDone] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [qual, setQual] = useState<Qualification | null>(null)
  const [reply, setReply] = useState('')
  const [actions, setActions] = useState<Action[]>([])
  const [selected, setSelected] = useState<boolean[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'running' | 'approval' | 'executing' | 'finished'>('idle')
  const [results, setResults] = useState<{ tool: string; result: unknown }[]>([])
  const [crm, setCrm] = useState<Contact[]>([])
  const [error, setError] = useState('')

  const loadCrm = useCallback(async () => {
    const r = await fetch(`${API}/crm`).catch(() => null)
    if (r?.ok) setCrm((await r.json()).contacts)
  }, [])

  // El servicio está en un free tier que se duerme: se despierta en cuanto
  // carga la página, mucho antes de que el visitante llegue a esta sección.
  useEffect(() => {
    let alive = true
    fetch(`${API}/health`)
      .then((r) => {
        if (!alive) return
        setAwake(r.ok ? 'up' : 'down')
        if (r.ok) loadCrm()
      })
      .catch(() => alive && setAwake('down'))
    return () => {
      alive = false
    }
  }, [loadCrm])

  async function consume(res: Response) {
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? 'Request failed')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done: end, value } = await reader.read()
      if (end) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        const ev = JSON.parse(line)
        if (ev.type === 'thread') setThreadId(ev.thread_id)
        if (ev.type === 'token') {
          setActive('draft_reply')
          setReply((r) => r + ev.text)
        }
        if (ev.type === 'node') {
          setDone((d) => [...d, ev.node])
          const i = NODES.findIndex((n) => n.id === ev.node)
          setActive(NODES[i + 1]?.id ?? null)
          if (ev.node === 'qualify') setQual(ev.data.qualification)
          if (ev.node === 'draft_reply') setReply(ev.data.reply)
          if (ev.node === 'execute') setResults(ev.data.results)
        }
        if (ev.type === 'awaiting_approval') {
          setActive('approval')
          setActions(ev.actions)
          setSelected(ev.actions.map(() => true))
          setThreadId(ev.thread_id)
          setPhase('approval')
        }
        if (ev.type === 'error') throw new Error(ev.message)
      }
    }
  }

  async function run() {
    setDone([])
    setActive('qualify')
    setQual(null)
    setReply('')
    setActions([])
    setResults([])
    setError('')
    setPhase('running')
    try {
      await consume(
        await fetch(`${API}/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: form.message, name: form.name || null, contact_key: form.contact }),
        }),
      )
    } catch (e) {
      setError((e as Error).message)
      setPhase('idle')
      setActive(null)
    }
  }

  async function decide(approved: boolean) {
    if (!threadId) return
    setPhase('executing')
    setActive('execute')
    try {
      await consume(
        await fetch(`${API}/leads/${threadId}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved, actions: actions.filter((_, i) => selected[i]) }),
        }),
      )
      setPhase('finished')
      setActive(null)
      await loadCrm()
    } catch (e) {
      setError((e as Error).message)
      setPhase('approval')
    }
  }

  const busy = phase === 'running' || phase === 'executing'
  const focusKey = form.contact.trim().toLowerCase()

  return (
    <div className='overflow-hidden rounded-[20px]' style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
      <div className='grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]'>
        {/* INBOUND MESSAGE */}
        <div className='min-w-0 p-5' style={{ borderBottom: '1px solid var(--border)' }}>
          <div className='flex items-center justify-between gap-2'>
            <span className='site-kicker'>Inbound WhatsApp lead</span>
            <span className='site-mono inline-flex items-center gap-1.5 text-[11.5px]' style={{ color: 'var(--muted)' }}>
              <span
                className='h-[7px] w-[7px] rounded-full'
                style={{ background: awake === 'up' ? 'var(--live)' : awake === 'down' ? 'var(--accent)' : 'var(--muted)' }}
              />
              {awake === 'up' ? 'Python service up' : awake === 'down' ? 'service offline' : 'waking Python service…'}
            </span>
          </div>
          <div className='mt-3 flex flex-wrap gap-2'>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type='button'
                disabled={busy}
                onClick={() => setForm(p)}
                className='rounded-full px-3 py-1 text-[12.5px] disabled:opacity-50'
                style={{
                  border: '1px solid var(--border)',
                  background: form.label === p.label ? 'var(--accent-soft)' : 'transparent',
                  color: form.label === p.label ? 'var(--accent)' : 'var(--muted)',
                }}>
                {p.label}
              </button>
            ))}
          </div>
          <div className='mt-3 grid grid-cols-2 gap-2'>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, label: 'custom', name: e.target.value })}
              placeholder='Name'
              aria-label='Lead name'
              maxLength={80}
              className='h-10 min-w-0 rounded-[10px] px-3 text-[13.5px]'
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
            />
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, label: 'custom', contact: e.target.value })}
              placeholder='Email or phone'
              aria-label='Lead email or phone'
              maxLength={120}
              className='h-10 min-w-0 rounded-[10px] px-3 text-[13.5px]'
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
            />
          </div>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, label: 'custom', message: e.target.value })}
            rows={4}
            maxLength={800}
            aria-label='Lead message'
            className='mt-2 w-full resize-none rounded-[10px] px-3 py-2 text-[13.5px]'
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', lineHeight: 1.5 }}
          />
          <button
            type='button'
            onClick={run}
            disabled={busy || awake === 'down' || form.message.trim().length < 3 || form.contact.trim().length < 5}
            className='site-btn site-btn-accent mt-2 h-11 w-full justify-center text-[14.5px] disabled:opacity-50'>
            {phase === 'running' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
            Run the agent
          </button>
          {error && (
            <p className='mt-2 text-[13px]' style={{ color: 'var(--accent)' }}>
              {error}
            </p>
          )}

          {/* GRAPH */}
          <p className='site-kicker mt-6'>LangGraph · live</p>
          <ol className='mt-2 space-y-1.5'>
            {NODES.map((n) => {
              const isDone = done.includes(n.id) || (n.id === 'approval' && (phase === 'executing' || phase === 'finished'))
              const isActive = active === n.id && !isDone
              const Icon = isDone ? Check : isActive ? (n.id === 'approval' ? PauseCircle : Loader2) : Circle
              return (
                <li key={n.id} className='flex items-center gap-2.5 text-[13px]'>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive && n.id !== 'approval' ? 'animate-spin' : ''}`}
                    style={{ color: isDone ? 'var(--live)' : isActive ? 'var(--accent)' : 'var(--border)' }}
                  />
                  <span className='font-medium' style={{ opacity: isDone || isActive ? 1 : 0.55 }}>
                    {n.label}
                  </span>
                  <span className='site-mono truncate text-[11px]' style={{ color: 'var(--muted)' }}>
                    {n.hint}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {/* AGENT OUTPUT + APPROVAL */}
        <div className='min-w-0 p-5 lg:border-l' style={{ borderColor: 'var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
          {!qual && !busy && (
            <p className='text-[13.5px]' style={{ color: 'var(--muted)', lineHeight: 1.55 }}>
              Pick a lead and run it. The agent qualifies it, checks the CRM and inventory through its own MCP server,
              drafts a reply and proposes CRM updates — then <b>stops</b> until you approve. Nothing is written before
              that.
            </p>
          )}
          {qual && (
            <div className='site-mono grid grid-cols-3 gap-2 text-center text-[11.5px]'>
              {[
                ['intent', qual.intent],
                ['score', `${qual.score}/100`],
                ['urgency', qual.urgency],
              ].map(([k, v]) => (
                <div key={k} className='rounded-[10px] p-2' style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)' }}>{k}</div>
                  <div className='mt-0.5 font-medium'>{v}</div>
                </div>
              ))}
            </div>
          )}
          {reply && (
            <div className='mt-3'>
              <p className='site-kicker'>Drafted reply</p>
              <div
                className='mt-1.5 rounded-[12px] px-3.5 py-2.5 text-[13.5px]'
                style={{ background: 'var(--card)', border: '1px solid var(--border)', lineHeight: 1.5 }}>
                {reply}
                {active === 'draft_reply' && ' ▍'}
              </div>
            </div>
          )}
          {actions.length > 0 && (
            <div className='mt-4'>
              <p className='site-kicker'>Proposed CRM actions {phase === 'approval' && '· waiting for you'}</p>
              <ul className='mt-1.5 space-y-1.5'>
                {actions.map((a, i) => {
                  // Se ejecutan en orden solo las seleccionadas.
                  const executed = phase === 'finished' && results.length > 0 && selected[i]
                  return (
                    <li
                      key={i}
                      className='rounded-[10px] px-3 py-2 text-[12.5px]'
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', opacity: selected[i] ? 1 : 0.45 }}>
                      <label className='flex cursor-pointer items-start gap-2'>
                        <input
                          type='checkbox'
                          checked={selected[i] ?? false}
                          disabled={phase !== 'approval'}
                          onChange={() => setSelected((s) => s.map((v, j) => (j === i ? !v : v)))}
                          className='mt-0.5'
                        />
                        <span className='min-w-0'>
                          <span className='site-mono font-medium'>{a.tool}</span>
                          <span style={{ color: 'var(--muted)' }}> — {a.why}</span>
                          <span className='site-mono mt-0.5 block truncate text-[11px]' style={{ color: 'var(--muted)' }}>
                            {JSON.stringify(a.args)}
                          </span>
                          {executed && (
                            <span className='site-mono mt-0.5 block text-[11px]' style={{ color: 'var(--live)' }}>
                              ✓ executed via MCP
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              {phase === 'approval' && (
                <div className='mt-3 flex gap-2'>
                  <button
                    type='button'
                    onClick={() => decide(true)}
                    disabled={!selected.some(Boolean)}
                    className='site-btn site-btn-accent h-10 flex-1 justify-center text-[14px] disabled:opacity-50'>
                    <Check className='h-4 w-4' /> Approve {selected.filter(Boolean).length}
                  </button>
                  <button
                    type='button'
                    onClick={() => decide(false)}
                    className='site-btn site-btn-outline h-10 flex-1 justify-center text-[14px]'>
                    <X className='h-4 w-4' /> Reject all
                  </button>
                </div>
              )}
            </div>
          )}
          {phase === 'finished' && (
            <p className='mt-3 text-[13px]' style={{ color: 'var(--muted)' }}>
              {results.length ? `${results.length} actions executed through MCP — see the CRM below.` : 'Rejected. Nothing was written to the CRM.'}
            </p>
          )}
          {qual && actions.length === 0 && phase === 'approval' && (
            <p className='mt-3 text-[13px]' style={{ color: 'var(--muted)' }}>
              No CRM actions proposed.
            </p>
          )}
        </div>
      </div>

      {/* CRM KANBAN */}
      <div className='p-5'>
        <p className='site-kicker'>CRM pipeline · Postgres</p>
        <div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5'>
          {STAGES.map((s) => (
            <div key={s} className='min-w-0 rounded-[12px] p-2' style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <p className='site-mono px-1 text-[11px] uppercase' style={{ color: 'var(--muted)' }}>
                {s} · {crm.filter((c) => c.stage === s).length}
              </p>
              <div className='mt-1.5 space-y-1.5'>
                {crm
                  .filter((c) => c.stage === s)
                  .slice(0, 4)
                  .map((c) => (
                    <div
                      key={c.id}
                      className='rounded-[8px] px-2 py-1.5 text-[12px]'
                      style={{
                        background: 'var(--card)',
                        border: `1px solid ${c.contact_key === focusKey && phase === 'finished' ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      <div className='truncate font-medium'>{c.name ?? c.contact_key}</div>
                      <div className='site-mono truncate text-[10.5px]' style={{ color: 'var(--muted)' }}>
                        {c.interest ?? '—'} · {c.score ?? '–'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
