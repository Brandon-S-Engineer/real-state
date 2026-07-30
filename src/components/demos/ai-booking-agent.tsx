'use client'

// Meridian — AI booking agent demo. A guided conversation books a real
// appointment end to end: provider → service → day → time → patient info →
// confirmed, plus a working reschedule/cancel flow from the confirmation card
// itself (not just a one-way booking). Scripted flow with streaming text; the
// production build wires this to a live calendar + reminders.

import { useEffect, useRef, useState } from 'react'
import {
  CalendarCheck, Check, Clock, MapPin, RotateCcw, Send, Sparkles, X,
} from 'lucide-react'

const C = {
  bg: 'oklch(0.975 0.006 250)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 250 / 0.12)',
  fg: 'oklch(0.25 0.02 255)',
  muted: 'oklch(0.5 0.015 255)',
  accent: 'oklch(0.5 0.14 255)',
  accentSoft: 'oklch(0.5 0.14 255 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  red: 'oklch(0.62 0.18 25)',
}

const PROVIDERS = [
  { id: 'alvarez', name: 'Dr. Elena Alvarez', role: 'General & Cosmetic Dentistry', initials: 'EA', hue: 255 },
  { id: 'lee', name: 'Dr. Marcus Lee', role: 'Orthodontics & Whitening', initials: 'ML', hue: 200 },
]
const SERVICES = [
  { id: 'clean', name: 'Dental cleaning', mins: 45, price: '$80' },
  { id: 'white', name: 'Whitening session', mins: 60, price: '$180' },
  { id: 'check', name: 'Check-up & X-ray', mins: 30, price: '$60' },
]
const DAYS = ['Mon, Jul 14', 'Tue, Jul 15', 'Wed, Jul 16']
const TIMES = ['9:30 AM', '11:00 AM', '4:15 PM']

type Step = 'provider' | 'service' | 'day' | 'time' | 'info' | 'done' | 'cancelConfirm' | 'cancelled'
type Msg = { role: 'user' | 'bot'; text: string; streaming?: boolean }
type Pick = {
  provider?: (typeof PROVIDERS)[number]
  service?: (typeof SERVICES)[number]
  day?: string
  time?: string
  name?: string
  phone?: string
}

export default function BookingAgentDemo() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [step, setStep] = useState<Step>('provider')
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState<Pick>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, step])

  function stream(text: string, after?: () => void) {
    setBusy(true)
    setMsgs((m) => [...m, { role: 'bot', text: '', streaming: true }])
    let i = 0
    const iv = setInterval(() => {
      i = Math.min(i + 3, text.length)
      setMsgs((m) => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'bot', text: text.slice(0, i), streaming: i < text.length }
        return copy
      })
      if (i >= text.length) { clearInterval(iv); setBusy(false); after?.() }
    }, 13)
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    stream('Hi! I’m Meridian’s booking assistant. I can get you scheduled in under a minute — who would you like to see?')
  }, [])

  function pickProvider(p: (typeof PROVIDERS)[number]) {
    if (busy) return
    setMsgs((m) => [...m, { role: 'user', text: p.name }])
    setPick((prev) => ({ ...prev, provider: p }))
    setStep('service')
    setTimeout(() => stream(`Good choice — ${p.name.split(' ').slice(-1)} has same-week openings. Which service do you need?`), 350)
  }

  function choose(kind: Exclude<Step, 'provider' | 'info' | 'done' | 'cancelled'>, label: string) {
    if (busy) return
    setMsgs((m) => [...m, { role: 'user', text: label }])
    if (kind === 'service') {
      const s = SERVICES.find((x) => x.name === label)!
      setPick((p) => ({ ...p, service: s }))
      setStep('day')
      setTimeout(() => stream(`${s.name} takes about ${s.mins} minutes (${s.price}). Which day works for you?`), 350)
    } else if (kind === 'day') {
      setPick((p) => ({ ...p, day: label }))
      setStep('time')
      setTimeout(() => stream(`${label} it is. These slots are open:`), 350)
    } else if (kind === 'time') {
      setPick((p) => ({ ...p, time: label }))
      setStep('info')
      setTimeout(() => stream('Last step — who should I put this appointment under?'), 350)
    } else if (kind === 'cancelConfirm') {
      if (label === 'Yes, cancel it') {
        setStep('cancelled')
        setTimeout(() => stream('Done — your appointment has been cancelled. No charge, and you’re welcome to rebook anytime.'), 300)
      } else {
        setStep('done')
        setTimeout(() => stream('No changes made — you’re still confirmed.'), 250)
      }
    }
  }

  function confirmInfo(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setMsgs((m) => [...m, { role: 'user', text: `${name.trim()}${phone.trim() ? ` · ${phone.trim()}` : ''}` }])
    setPick((p) => ({ ...p, name: name.trim(), phone: phone.trim() }))
    setStep('done')
    setTimeout(() => stream('Booked! You’ll get an email confirmation and a reminder the day before. Here are your details:'), 350)
  }

  function reschedule() {
    if (busy) return
    setMsgs((m) => [...m, { role: 'user', text: 'I need to reschedule' }])
    setStep('day')
    setTimeout(() => stream(`No problem — let's find a new time with ${pick.provider?.name}.`), 300)
  }

  function requestCancel() {
    if (busy) return
    setMsgs((m) => [...m, { role: 'user', text: 'I need to cancel' }])
    setStep('cancelConfirm')
    setTimeout(() => stream('Sorry to hear that — just to confirm, cancel this appointment?'), 300)
  }

  function bookAnother() {
    setMsgs([])
    setPick({})
    setName('')
    setPhone('')
    setStep('provider')
    started.current = false
    setTimeout(() => {
      started.current = true
      stream('Let’s get you booked again — who would you like to see?')
    }, 50)
  }

  const chips =
    step === 'service' ? SERVICES.map((s) => s.name)
      : step === 'day' ? DAYS
      : step === 'time' ? TIMES
      : step === 'cancelConfirm' ? ['Yes, cancel it', 'No, keep it']
      : []

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      <div className='mx-auto grid max-w-5xl gap-8 px-5 py-10 lg:grid-cols-[1fr_1.1fr]'>
        {/* Clinic info */}
        <div className='pt-4'>
          <span className='inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium' style={{ background: C.accentSoft, color: C.accent }}>
            <Sparkles className='h-3.5 w-3.5' /> AI booking · no phone tag
          </span>
          <h1 className='mt-4 text-[clamp(26px,3.5vw,38px)] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.03em', lineHeight: 1.08 }}>
            Meridian Dental Studio
          </h1>
          <p className='mt-3 max-w-[42ch] text-[15px] leading-relaxed' style={{ color: C.muted }}>
            Gentle, modern dentistry in the heart of the city. Book with the assistant — it knows the
            real calendar, so what it offers is what’s actually free. Reschedule or cancel any time,
            right from the chat.
          </p>
          <div className='mt-6 flex flex-col gap-2.5 text-[13.5px]' style={{ color: C.muted }}>
            <span className='flex items-center gap-2'><MapPin className='h-4 w-4' style={{ color: C.accent }} /> 214 Harbor Ave, Suite 3</span>
            <span className='flex items-center gap-2'><Clock className='h-4 w-4' style={{ color: C.accent }} /> Mon–Fri · 9:00 AM – 6:00 PM</span>
            <span className='flex items-center gap-2'><CalendarCheck className='h-4 w-4' style={{ color: C.accent }} /> Same-week appointments available</span>
          </div>

          <div className='mt-8 flex flex-col gap-2.5'>
            {PROVIDERS.map((p) => (
              <div key={p.id} className='flex items-center gap-3 rounded-xl p-3' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <span
                  className='grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white'
                  style={{ background: `oklch(0.55 0.14 ${p.hue})` }}>
                  {p.initials}
                </span>
                <div className='min-w-0'>
                  <p className='truncate text-[13px] font-semibold'>{p.name}</p>
                  <p className='truncate text-[11.5px]' style={{ color: C.muted }}>{p.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat card */}
        <div className='flex flex-col overflow-hidden rounded-2xl shadow-lg' style={{ background: C.panel, border: `1px solid ${C.border}`, height: 560 }}>
          <div className='flex items-center gap-2.5 px-4 py-3' style={{ borderBottom: `1px solid ${C.border}` }}>
            <span className='grid h-8 w-8 place-items-center rounded-full text-white' style={{ background: C.accent }}>
              <CalendarCheck className='h-4 w-4' />
            </span>
            <div>
              <p className='text-[13.5px] font-semibold'>Booking Assistant</p>
              <p className='text-[11.5px]' style={{ color: C.muted }}>AI · connected to the live calendar</p>
            </div>
          </div>

          <div ref={scroller} className='flex-1 space-y-3 overflow-y-auto px-4 py-3'>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className='max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed'
                  style={
                    m.role === 'user'
                      ? { background: C.accent, color: 'white', borderBottomRightRadius: 6 }
                      : { background: C.bg, border: `1px solid ${C.border}`, borderBottomLeftRadius: 6 }
                  }>
                  {m.text}
                  {m.streaming && <span className='ml-0.5 inline-block h-3.5 w-1.5 align-middle' style={{ background: C.accent }} />}
                </div>
              </div>
            ))}

            {/* Provider picker */}
            {step === 'provider' && !busy && (
              <div className='flex flex-col gap-2'>
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickProvider(p)}
                    className='flex items-center gap-3 rounded-xl p-3 text-left transition-colors'
                    style={{ border: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.accentSoft; e.currentTarget.style.borderColor = C.accent }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'oklch(0.25 0.02 250 / 0.12)' }}>
                    <span className='grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white' style={{ background: `oklch(0.55 0.14 ${p.hue})` }}>
                      {p.initials}
                    </span>
                    <div>
                      <p className='text-[13px] font-semibold'>{p.name}</p>
                      <p className='text-[11.5px]' style={{ color: C.muted }}>{p.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Patient info form */}
            {step === 'info' && !busy && (
              <form onSubmit={confirmInfo} className='flex flex-col gap-2 rounded-xl p-3.5' style={{ border: `1px solid ${C.border}` }}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Full name'
                  required
                  className='rounded-lg px-3 py-2 text-[13px] outline-none'
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder='Phone (optional, for reminders)'
                  className='rounded-lg px-3 py-2 text-[13px] outline-none'
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
                />
                <button type='submit' disabled={!name.trim()} className='mt-1 rounded-lg py-2 text-[13px] font-semibold text-white disabled:opacity-40' style={{ background: C.accent }}>
                  Confirm booking
                </button>
              </form>
            )}

            {/* Confirmation card */}
            {step === 'done' && !busy && pick.service && (
              <div className='overflow-hidden rounded-xl' style={{ border: `1px solid ${C.border}` }}>
                <div className='flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white' style={{ background: C.green }}>
                  <Check className='h-4 w-4' /> Appointment confirmed
                </div>
                <div className='flex flex-col gap-1.5 p-4 text-[13.5px]'>
                  <span><b>{pick.service.name}</b> · {pick.service.mins} min · {pick.service.price}</span>
                  <span style={{ color: C.muted }}>{pick.day} at {pick.time} — {pick.provider?.name}</span>
                  {pick.name && <span style={{ color: C.muted }}>For {pick.name}{pick.phone ? ` · ${pick.phone}` : ''}</span>}
                  <span className='mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium' style={{ background: C.accentSoft, color: C.accent }}>
                    <CalendarCheck className='h-3.5 w-3.5' /> Added to calendar · invite sent
                  </span>
                  <div className='mt-2 flex gap-2'>
                    <button onClick={reschedule} className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-medium' style={{ border: `1px solid ${C.border}` }}>
                      <RotateCcw className='h-3.5 w-3.5' /> Reschedule
                    </button>
                    <button onClick={requestCancel} className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-medium' style={{ color: C.red, border: `1px solid oklch(0.62 0.18 25 / 0.3)` }}>
                      <X className='h-3.5 w-3.5' /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cancelled state */}
            {step === 'cancelled' && !busy && (
              <div className='overflow-hidden rounded-xl' style={{ border: `1px solid ${C.border}` }}>
                <div className='flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white' style={{ background: C.red }}>
                  <X className='h-4 w-4' /> Appointment cancelled
                </div>
                <div className='p-4'>
                  <button onClick={bookAnother} className='inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white' style={{ background: C.accent }}>
                    <CalendarCheck className='h-3.5 w-3.5' /> Book another appointment
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option chips */}
          {chips.length > 0 && !busy && (
            <div className='flex flex-wrap gap-2 px-4 pb-3'>
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => choose(step as Exclude<Step, 'provider' | 'info' | 'done' | 'cancelled'>, c)}
                  className='rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors'
                  style={{ border: `1px solid ${C.border}`, color: C.fg, background: C.panel }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.accentSoft; e.currentTarget.style.borderColor = C.accent }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.panel; e.currentTarget.style.borderColor = 'oklch(0.25 0.02 250 / 0.12)' }}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className='flex items-center gap-2 p-3' style={{ borderTop: `1px solid ${C.border}` }}>
            <input
              placeholder={step === 'done' ? 'Ask anything else…' : 'Or type your answer…'}
              className='min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none'
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
              readOnly
            />
            <span className='grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white opacity-40' style={{ background: C.accent }}>
              <Send className='h-4 w-4' />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
