'use client'

// Demo embebido del home: chat con el agente real (RAG + SQL) a la izquierda y,
// a la derecha, la traza en vivo de cómo se construyó cada respuesta.

import { useRef, useState } from 'react'
import { ArrowUp, Database, FileSearch, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { suggestedQuestions } from '@/lib/agent-demo/data'

type Msg = { role: 'user' | 'assistant'; content: string }
type Source = { id: string; title: string; heading: string; score: number }
type TraceEvent =
  | { type: 'llm'; step: number; ms: number; input: number; output: number }
  | { type: 'tool_call'; id: string; name: string; args: string }
  | { type: 'tool_result'; id: string; name: string; ms: number; sql?: string; sources?: Source[]; rows?: number; preview: string }
  | { type: 'answer'; content: string; sources: Source[]; model: string; ms: number; tokens: { input: number; output: number }; cost_usd: number | null }
  | { type: 'error'; message: string }

const toolIcon = { search_docs: FileSearch, find_products: Database, get_order: Database } as Record<string, typeof Database>

export default function CompanyAgentDemo() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function ask(text: string) {
    const q = text.trim()
    if (!q || busy) return
    const next: Msg[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    setTrace([])
    setBusy(true)
    try {
      const res = await fetch('/api/agent-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-12) }),
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setMessages([...next, { role: 'assistant', content: `⚠️ ${err.error ?? 'Request failed'}` }])
        return
      }
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
          const ev = JSON.parse(line) as TraceEvent
          setTrace((t) => [...t, ev])
          if (ev.type === 'answer') setMessages([...next, { role: 'assistant', content: ev.content }])
          if (ev.type === 'error') setMessages([...next, { role: 'assistant', content: `⚠️ ${ev.message}` }])
        }
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: '⚠️ Network error. Please try again.' }])
    } finally {
      setBusy(false)
    }
  }

  const answer = trace.find((e): e is Extract<TraceEvent, { type: 'answer' }> => e.type === 'answer')

  return (
    <div
      className='grid overflow-hidden rounded-[20px] lg:grid-cols-[1.15fr_1fr]'
      style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
      {/* CHAT */}
      <div className='flex h-[520px] min-w-0 flex-col'>
        <div className='flex items-center justify-between px-5 py-3' style={{ borderBottom: '1px solid var(--border)' }}>
          <span className='inline-flex items-center gap-2 text-[13.5px] font-medium'>
            <span className='site-pulse h-[7px] w-[7px] rounded-full' style={{ background: 'var(--live)' }} />
            Volt Mobile · support agent
          </span>
          {messages.length > 0 && (
            <button
              type='button'
              onClick={() => {
                setMessages([])
                setTrace([])
              }}
              className='inline-flex items-center gap-1 text-[12.5px]'
              style={{ color: 'var(--muted)' }}>
              <RotateCcw className='h-3.5 w-3.5' /> Reset
            </button>
          )}
        </div>

        <div ref={scrollRef} className='flex-1 space-y-3 overflow-y-auto px-5 py-4'>
          {messages.length === 0 && (
            <div>
              <p className='text-[14px]' style={{ color: 'var(--muted)', lineHeight: 1.55 }}>
                A fictional refurbished-iPhone store. The agent answers from its policy docs (pgvector) and its live
                inventory and orders (Postgres) — and says so when it doesn&apos;t know. Try one:
              </p>
              <div className='mt-4 flex flex-col gap-2'>
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type='button'
                    onClick={() => ask(q)}
                    className='rounded-[12px] px-3.5 py-2.5 text-left text-[13.5px] transition-colors hover:opacity-80'
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className='prose prose-sm max-w-[85%] rounded-[14px] px-3.5 py-2.5 text-[14px] dark:prose-invert'
                style={
                  m.role === 'user'
                    ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                    : { background: 'var(--bg-2)', border: '1px solid var(--border)' }
                }>
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {busy && (
            <div className='inline-flex items-center gap-2 text-[13px]' style={{ color: 'var(--muted)' }}>
              <Loader2 className='h-3.5 w-3.5 animate-spin' /> Thinking…
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
          className='flex gap-2 p-3'
          style={{ borderTop: '1px solid var(--border)' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder='Ask about an order, a phone or a policy…'
            aria-label='Message the agent'
            className='h-11 min-w-0 flex-1 rounded-[12px] px-3.5 text-[14px] outline-none focus-visible:ring-2'
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
          />
          <button
            type='submit'
            disabled={busy || !input.trim()}
            aria-label='Send'
            className='site-btn site-btn-accent h-11 w-11 shrink-0 justify-center p-0 disabled:opacity-50'>
            <ArrowUp className='h-[18px] w-[18px]' />
          </button>
        </form>
      </div>

      {/* TRACE */}
      <div
        className='flex h-[520px] min-w-0 flex-col'
        style={{ background: 'var(--bg-2)', borderLeft: '1px solid var(--border)' }}>
        <div className='flex items-center justify-between px-5 py-3' style={{ borderBottom: '1px solid var(--border)' }}>
          <span className='site-kicker'>How the answer was built</span>
          {answer && (
            <span className='site-mono text-[11.5px]' style={{ color: 'var(--muted)' }}>
              {answer.model}
            </span>
          )}
        </div>
        <div className='flex-1 space-y-2.5 overflow-y-auto px-5 py-4'>
          {trace.length === 0 && (
            <p className='text-[13px]' style={{ color: 'var(--muted)', lineHeight: 1.55 }}>
              Every tool call, the exact SQL, the retrieved sources with their similarity score, tokens, cost and
              latency show up here as the agent works.
            </p>
          )}
          {trace.map((ev, i) => {
            if (ev.type === 'llm')
              return (
                <Row key={i} icon={Sparkles} title={`LLM step ${ev.step + 1}`} meta={`${ev.ms} ms · ${ev.input}→${ev.output} tok`} />
              )
            if (ev.type === 'tool_call')
              return <Row key={i} icon={toolIcon[ev.name] ?? Database} title={ev.name} code={prettyArgs(ev.args)} />
            if (ev.type === 'tool_result')
              return (
                <div key={i} className='pl-7'>
                  {ev.sql && <Code text={ev.sql} />}
                  {ev.sources?.length ? (
                    <ul className='mt-1.5 space-y-1'>
                      {ev.sources.map((s) => (
                        <li key={s.id} className='site-mono flex justify-between gap-2 text-[11.5px]'>
                          <span className='truncate'>
                            [{s.id}] {s.heading}
                          </span>
                          <span style={{ color: 'var(--muted)' }}>{s.score.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className='site-mono mt-1 text-[11.5px]' style={{ color: 'var(--muted)' }}>
                    {ev.ms} ms{ev.rows !== undefined ? ` · ${ev.rows} rows` : ''}
                  </p>
                </div>
              )
            if (ev.type === 'answer')
              return (
                <div
                  key={i}
                  className='site-mono mt-3 grid grid-cols-3 gap-2 rounded-[12px] p-3 text-center text-[11.5px]'
                  style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
                  <Stat label='latency' value={`${(ev.ms / 1000).toFixed(1)} s`} />
                  <Stat label='tokens' value={`${ev.tokens.input + ev.tokens.output}`} />
                  <Stat label='cost' value={ev.cost_usd !== null ? `$${ev.cost_usd.toFixed(4)}` : 'n/a'} />
                </div>
              )
            return null
          })}
        </div>
      </div>
    </div>
  )
}

function prettyArgs(args: string) {
  try {
    return JSON.stringify(JSON.parse(args))
  } catch {
    return args
  }
}

function Row({ icon: Icon, title, meta, code }: { icon: typeof Database; title: string; meta?: string; code?: string }) {
  return (
    <div>
      <div className='flex items-center justify-between gap-2'>
        <span className='inline-flex items-center gap-2 text-[13px] font-medium'>
          <span
            className='grid h-5 w-5 place-items-center rounded-[6px]'
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Icon className='h-3 w-3' />
          </span>
          {title}
        </span>
        {meta && (
          <span className='site-mono text-[11.5px]' style={{ color: 'var(--muted)' }}>
            {meta}
          </span>
        )}
      </div>
      {code && (
        <div className='mt-1 pl-7'>
          <Code text={code} />
        </div>
      )}
    </div>
  )
}

function Code({ text }: { text: string }) {
  return (
    <pre
      className='site-mono overflow-x-auto rounded-[8px] px-2.5 py-2 text-[11.5px] whitespace-pre-wrap'
      style={{ background: 'var(--card)', border: '1px solid var(--border)', lineHeight: 1.5 }}>
      {text}
    </pre>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--muted)' }}>{label}</div>
      <div className='mt-0.5 font-medium'>{value}</div>
    </div>
  )
}
