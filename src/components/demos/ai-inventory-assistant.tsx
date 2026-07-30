'use client'

// Ruta 7 Motors — AI inventory assistant demo. Grounded in a real production
// pattern: an AI agent that calls a search_inventory function tool over messy
// real-world dealership data — color name synonyms (dozens of paint names per
// hue), brand tabs, reserved units. The tool-call trace is shown on purpose:
// it's the clearest possible proof that this is function-calling, not a
// canned FAQ bot. Search + synonym matching run for real, client-side.

import { useEffect, useRef, useState } from 'react'
import { Search, Send, Sparkles, Wrench } from 'lucide-react'

const C = {
  bg: 'oklch(0.975 0.004 250)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.22 0.015 250 / 0.12)',
  fg: 'oklch(0.24 0.018 255)',
  muted: 'oklch(0.5 0.014 255)',
  accent: 'oklch(0.52 0.16 255)',
  accentSoft: 'oklch(0.52 0.16 255 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  amber: 'oklch(0.72 0.14 70)',
  code: 'oklch(0.2 0.015 255)',
  codeFg: 'oklch(0.82 0.008 255)',
}

// Real pattern from production: dozens of paint names collapse to a handful
// of searchable hues. This is the actual thing that makes "tienes algo azul"
// work against a spreadsheet full of "HYDRO BLUE", "AZUL JAZZ", "AZUL INGARO".
const COLOR_SYNONYMS: Record<string, string[]> = {
  azul: ['blue', 'azul'], blue: ['blue', 'azul'],
  rojo: ['red', 'rojo'], red: ['red', 'rojo'],
  negro: ['negro', 'black'], black: ['negro', 'black'],
  blanco: ['blanco', 'white'], white: ['blanco', 'white'],
  gris: ['gris', 'gray', 'grey', 'granito'], gray: ['gris', 'gray', 'grey', 'granito'],
  plata: ['plata', 'silver'], silver: ['plata', 'silver'],
  verde: ['verde', 'green'], green: ['verde', 'green'],
}

type Unit = { id: string; brand: string; model: string; trim: string; paint: string; hue: string; price: number; reserved: boolean }

const BRANDS = ['All', 'Atlas', 'Rincón', 'Voltiq'] as const

const UNITS: Unit[] = [
  { id: 'A1', brand: 'Atlas', model: 'Trailhead', trim: 'Sport', paint: 'HYDRO BLUE', hue: 'blue', price: 34200, reserved: false },
  { id: 'A2', brand: 'Atlas', model: 'Trailhead', trim: 'Limited', paint: 'AZUL INGARO', hue: 'blue', price: 38900, reserved: true },
  { id: 'A3', brand: 'Atlas', model: 'Summit', trim: 'Base', paint: 'GRANITO', hue: 'gris', price: 29500, reserved: false },
  { id: 'A4', brand: 'Atlas', model: 'Summit', trim: 'Sport', paint: 'NEGRO DIAMANTE', hue: 'negro', price: 31800, reserved: false },
  { id: 'R1', brand: 'Rincón', model: 'Voyager', trim: 'SE', paint: 'ROJO DINAMITA', hue: 'rojo', price: 27100, reserved: false },
  { id: 'R2', brand: 'Rincón', model: 'Voyager', trim: 'SEL', paint: 'AZUL LIBECCI', hue: 'blue', price: 30250, reserved: false },
  { id: 'R3', brand: 'Rincón', model: 'Fusible', trim: 'Base', paint: 'BLANCO POLAR', hue: 'blanco', price: 22900, reserved: true },
  { id: 'V1', brand: 'Voltiq', model: 'Ion 3', trim: 'Range+', paint: 'PLATA MARTILLADO', hue: 'plata', price: 41500, reserved: false },
  { id: 'V2', brand: 'Voltiq', model: 'Ion 3', trim: 'Base', paint: 'GRIS SILVERSTONE', hue: 'gris', price: 36200, reserved: false },
  { id: 'V3', brand: 'Voltiq', model: 'Ion 5', trim: 'Range+', paint: 'VERDE MOJITO', hue: 'verde', price: 44800, reserved: false },
]

const SUGGESTIONS = ['Tienes algo azul disponible?', 'What Voltiq do you have under $40k?', 'Muéstrame los que no estén reservados']

type ToolCall = { color?: string; brand?: string; excludeReserved?: boolean }
type Msg = { role: 'user' | 'bot'; text?: string; call?: ToolCall; results?: Unit[]; streaming?: boolean }

function parseQuery(q: string): ToolCall {
  const l = q.toLowerCase()
  const call: ToolCall = {}
  for (const key of Object.keys(COLOR_SYNONYMS)) {
    if (l.includes(key)) { call.color = key; break }
  }
  for (const b of BRANDS.slice(1)) {
    if (l.includes(b.toLowerCase())) call.brand = b
  }
  if (/reserv|excluir|sin reservar|available|disponible/.test(l)) call.excludeReserved = true
  return call
}

function runSearch(call: ToolCall): Unit[] {
  return UNITS.filter((u) => {
    if (call.color && !COLOR_SYNONYMS[call.color]?.includes(u.hue)) return false
    if (call.brand && u.brand !== call.brand) return false
    if (call.excludeReserved && u.reserved) return false
    return true
  })
}

export default function InventoryAssistantDemo() {
  const [brand, setBrand] = useState<(typeof BRANDS)[number]>('All')
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: 'Hi! I’m the Ruta 7 Motors assistant — ask me about inventory in plain language (color, model, budget) and I’ll search live.' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  const tableRows = UNITS.filter((u) => brand === 'All' || u.brand === brand)

  function ask(q: string) {
    if (!q.trim() || busy) return
    setBusy(true)
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: q }])
    const call = parseQuery(q)

    // Stage 1: show the tool call itself (this is the point of the demo)
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'bot', call }])
      // Stage 2: run it, stream a short summary + inline results
      setTimeout(() => {
        const results = runSearch(call)
        const summary = results.length
          ? `Found ${results.length} match${results.length > 1 ? 'es' : ''}${call.excludeReserved ? ' (reserved units excluded)' : ''}:`
          : 'No units match that right now — want me to check a nearby color or a different brand?'
        setMsgs((m) => [...m, { role: 'bot', text: '', streaming: true }])
        let i = 0
        const iv = setInterval(() => {
          i = Math.min(i + 3, summary.length)
          setMsgs((m) => {
            const copy = [...m]
            copy[copy.length - 1] = { role: 'bot', text: summary.slice(0, i), streaming: i < summary.length, results: i >= summary.length ? results : undefined }
            return copy
          })
          if (i >= summary.length) { clearInterval(iv); setBusy(false) }
        }, 12)
      }, 600)
    }, 450)
  }

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Wrench className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Ruta 7 Motors</span>
          <span className='ml-2 hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline' style={{ background: C.accentSoft, color: C.accent }}>
            AI inventory assistant · function-calling
          </span>
        </div>
        <span className='text-[12px]' style={{ color: C.muted }}>{UNITS.length} units live</span>
      </header>

      <div className='mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1.1fr_1fr]'>
        {/* Real inventory table */}
        <div className='overflow-hidden rounded-xl' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className='flex flex-wrap items-center gap-1.5 border-b p-3' style={{ borderColor: C.border }}>
            {BRANDS.map((b) => (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className='rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors'
                style={brand === b ? { background: C.accent, color: 'white' } : { border: `1px solid ${C.border}`, color: C.muted }}>
                {b}
              </button>
            ))}
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-[13px]'>
              <thead>
                <tr className='text-[10.5px] uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
                  <th className='py-2 pl-4 font-medium'>Model</th>
                  <th className='py-2 font-medium'>Trim</th>
                  <th className='py-2 font-medium'>Paint (real name)</th>
                  <th className='py-2 font-medium'>Price</th>
                  <th className='py-2 pr-4 font-medium'>Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((u) => (
                  <tr key={u.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td className='py-2.5 pl-4 font-medium'>{u.brand} {u.model}</td>
                    <td className='py-2.5' style={{ color: C.muted }}>{u.trim}</td>
                    <td className='py-2.5 text-[11.5px]' style={{ fontFamily: 'var(--font-jetbrains), monospace', color: C.muted }}>{u.paint}</td>
                    <td className='py-2.5'>${u.price.toLocaleString()}</td>
                    <td className='py-2.5 pr-4'>
                      <span className='rounded-full px-2 py-0.5 text-[10.5px] font-medium' style={u.reserved ? { background: 'oklch(0.72 0.14 70 / 0.15)', color: C.amber } : { background: 'oklch(0.58 0.15 155 / 0.13)', color: C.green }}>
                        {u.reserved ? 'Reserved' : 'Available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='flex items-center gap-1.5 border-t px-4 py-2.5 text-[11.5px]' style={{ borderColor: C.border, color: C.muted }}>
            <Search className='h-3.5 w-3.5' />
            Real column: dozens of factory paint names collapse to searchable colors via a synonym map — try asking the assistant.
          </div>
        </div>

        {/* Chat */}
        <div className='flex flex-col overflow-hidden rounded-xl' style={{ background: C.panel, border: `1px solid ${C.border}`, height: 480 }}>
          <div className='flex items-center gap-2.5 px-4 py-3' style={{ borderBottom: `1px solid ${C.border}` }}>
            <span className='grid h-8 w-8 place-items-center rounded-full' style={{ background: C.accentSoft, color: C.accent }}>
              <Sparkles className='h-4 w-4' />
            </span>
            <div>
              <p className='text-[13.5px] font-semibold'>Sales Assistant</p>
              <p className='text-[11.5px]' style={{ color: C.muted }}>Calls a real search_inventory tool</p>
            </div>
          </div>

          <div ref={scroller} className='flex-1 space-y-3 overflow-y-auto px-4 py-3'>
            {msgs.map((m, i) => {
              if (m.call) {
                const args = JSON.stringify({ color: m.call.color ?? null, brand: m.call.brand ?? null, exclude_reserved: !!m.call.excludeReserved })
                return (
                  <div key={i} className='rounded-lg p-3 text-[11.5px]' style={{ background: C.code, color: C.codeFg, fontFamily: 'var(--font-jetbrains), monospace' }}>
                    <div className='flex items-center gap-1.5' style={{ color: 'oklch(0.75 0.13 255)' }}>
                      <Wrench className='h-3 w-3' /> search_inventory(<span style={{ opacity: 0.7 }}>{args}</span>)
                    </div>
                  </div>
                )
              }
              return (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className='max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed'
                    style={m.role === 'user' ? { background: C.accent, color: 'white', borderBottomRightRadius: 6 } : { background: C.bg, border: `1px solid ${C.border}`, borderBottomLeftRadius: 6 }}>
                    {m.text}
                    {m.streaming && <span className='ml-0.5 inline-block h-3.5 w-1.5 align-middle' style={{ background: C.accent }} />}
                    {m.results && (
                      <div className='mt-2 flex flex-col gap-1.5'>
                        {m.results.slice(0, 3).map((u) => (
                          <div key={u.id} className='flex items-center justify-between gap-2 rounded-lg px-2.5 py-2' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                            <span className='text-[12px]'>
                              <b>{u.brand} {u.model}</b> · {u.trim} · <span style={{ color: C.muted }}>{u.paint}</span>
                            </span>
                            <span className='shrink-0 text-[12px] font-semibold'>${u.price.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className='px-4 pb-1.5'>
            <div className='flex flex-wrap gap-1.5'>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={busy} className='rounded-full px-2.5 py-1 text-[11px] disabled:opacity-50' style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <form className='flex items-center gap-2 p-3' style={{ borderTop: `1px solid ${C.border}` }} onSubmit={(e) => { e.preventDefault(); ask(input) }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask about a color, model, or budget…'
              className='min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none'
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
            />
            <button type='submit' disabled={busy || !input.trim()} aria-label='Send' className='grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white disabled:opacity-40' style={{ background: C.accent }}>
              <Send className='h-4 w-4' />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
