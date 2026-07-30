'use client'

// Vela — AI sales assistant demo for e-commerce. The bot recommends products
// from the catalog (inline product cards in chat), answers policy questions,
// adds to cart, and closes with a Stripe-style checkout. Scripted responses —
// the production build swaps in a live LLM + catalog search.

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Plus, Send, ShoppingBag, Sparkles, X } from 'lucide-react'
import StripeCheckout from '@/components/demos/shared/stripe-checkout'

const C = {
  bg: 'oklch(0.98 0.004 90)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 90 / 0.13)',
  fg: 'oklch(0.25 0.02 60)',
  muted: 'oklch(0.5 0.015 60)',
  accent: 'oklch(0.55 0.13 155)',
  accentSoft: 'oklch(0.55 0.13 155 / 0.1)',
}

type Product = { id: string; name: string; price: number; note: string; hue: number }

const PRODUCTS: Product[] = [
  { id: 'hydra', name: 'Hydra Barrier Cream', price: 34, note: 'Deep hydration · dry & sensitive skin', hue: 155 },
  { id: 'glow', name: 'Glow Vitamin-C Serum', price: 42, note: 'Brightening · dull skin, dark spots', hue: 85 },
  { id: 'calm', name: 'Calm Oat Cleanser', price: 26, note: 'Gentle daily cleanse · all skin types', hue: 230 },
  { id: 'shield', name: 'Shield SPF 50', price: 29, note: 'Invisible finish · no white cast', hue: 25 },
]

const SUGGESTIONS = ['What do you recommend for dry skin?', 'Do you ship to Europe?', 'Any bundle for beginners?']

type Reply = { text: string; products?: string[] }

function answer(q: string): Reply {
  const l = q.toLowerCase()
  if (/(dry|sensitive|hydrat)/.test(l))
    return {
      text: 'For dry or sensitive skin I’d start with our Hydra Barrier Cream — it repairs the moisture barrier overnight. Pair it with the Calm Oat Cleanser so you’re not stripping skin before you hydrate:',
      products: ['hydra', 'calm'],
    }
  if (/(ship|deliver|europe|international)/.test(l))
    return {
      text: 'Yes — we ship worldwide. Europe takes 3-5 business days (free over $50), and every order has tracking from the moment it leaves the warehouse. Returns are free within 30 days.',
    }
  if (/(bundle|beginner|start|routine|kit)/.test(l))
    return {
      text: 'The beginner routine that our customers love: cleanse, protect, glow. These three cover a full morning routine and come to $97 together:',
      products: ['calm', 'shield', 'glow'],
    }
  if (/(bright|spot|dull|glow|vitamin)/.test(l))
    return {
      text: 'For brightening, the Glow Vitamin-C Serum is our best-seller — visible change in about three weeks. Always pair vitamin C with SPF in the morning:',
      products: ['glow', 'shield'],
    }
  return {
    text: 'Happy to help with that! I can recommend products for your skin type, explain ingredients, or check shipping and returns. What are you looking for?',
  }
}

type Msg = { role: 'user' | 'bot'; text: string; products?: string[]; streaming?: boolean }

export default function SalesChatbotDemo() {
  const [open, setOpen] = useState(true)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: 'Hi! I’m Vela’s shopping assistant. Tell me about your skin and I’ll build you a routine — or ask me anything about shipping and returns.' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [cart, setCart] = useState<string[]>([])
  const [checkout, setCheckout] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  const total = cart.reduce((s, id) => s + (PRODUCTS.find((p) => p.id === id)?.price ?? 0), 0)

  function ask(q: string) {
    if (!q.trim() || busy) return
    setBusy(true)
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: q }])
    const r = answer(q)
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'bot', text: '', streaming: true }])
      let i = 0
      const iv = setInterval(() => {
        i = Math.min(i + 3, r.text.length)
        setMsgs((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'bot', text: r.text.slice(0, i), streaming: i < r.text.length, products: i >= r.text.length ? r.products : undefined }
          return copy
        })
        if (i >= r.text.length) { clearInterval(iv); setBusy(false) }
      }, 13)
    }, 500)
  }

  function ProductCard({ id, inChat }: { id: string; inChat?: boolean }) {
    const p = PRODUCTS.find((x) => x.id === id)!
    const inCart = cart.includes(id)
    return (
      <div
        className='flex flex-col overflow-hidden rounded-xl'
        style={{ background: C.panel, border: `1px solid ${C.border}` }}>
        <div
          className='grid place-items-center'
          style={{
            height: inChat ? 64 : 150,
            background: `linear-gradient(135deg, oklch(0.9 0.05 ${p.hue}), oklch(0.78 0.09 ${p.hue}))`,
          }}>
          <span
            className='rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase'
            style={{ background: `oklch(0.45 0.1 ${p.hue} / 0.7)` }}>
            Vela
          </span>
        </div>
        <div className='flex flex-1 flex-col p-2.5'>
          <p className='text-[12.5px] leading-tight font-semibold'>{p.name}</p>
          {!inChat && <p className='mt-0.5 text-[11px]' style={{ color: C.muted }}>{p.note}</p>}
          <div className='mt-1.5 flex items-center justify-between gap-1'>
            <span className='text-[13px] font-bold'>${p.price}</span>
            <button
              onClick={() => !inCart && setCart((c) => [...c, id])}
              className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-opacity'
              style={inCart ? { background: C.accentSoft, color: C.accent } : { background: C.accent, color: 'white' }}>
              {inCart ? '✓ In cart' : <><Plus className='h-3 w-3' /> Add</>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='relative min-h-full' style={{ background: C.bg, color: C.fg }}>
      {/* Store header */}
      <header className='flex h-14 items-center justify-between px-5' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <span className='text-[17px] font-bold tracking-wide' style={{ fontFamily: 'var(--font-space-grotesk)', color: C.accent }}>
          VELA
        </span>
        <div className='flex items-center gap-4 text-[13px]' style={{ color: C.muted }}>
          <span className='hidden sm:inline'>Skincare</span>
          <span className='hidden sm:inline'>About</span>
          <button
            onClick={() => cart.length && setCheckout(true)}
            className='relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium'
            style={{ border: `1px solid ${C.border}`, color: C.fg }}>
            <ShoppingBag className='h-4 w-4' />
            ${total}
            {cart.length > 0 && (
              <span className='absolute -top-1.5 -right-1.5 grid h-4.5 w-4.5 place-items-center rounded-full text-[10px] font-bold text-white' style={{ background: C.accent, height: 18, width: 18 }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Catalog */}
      <div className='mx-auto max-w-4xl px-5 py-8'>
        <h1 className='text-[24px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>
          Skincare that keeps it simple
        </h1>
        <p className='mt-1 text-[14px]' style={{ color: C.muted }}>
          Four products. One routine. <span style={{ color: C.accent, fontWeight: 600 }}>Ask the assistant which ones are for you →</span>
        </p>
        <div className='mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {PRODUCTS.map((p) => <ProductCard key={p.id} id={p.id} />)}
        </div>
      </div>

      {/* Chat widget */}
      {open && (
        <div
          className='fixed right-4 bottom-20 z-40 flex w-[min(92vw,370px)] flex-col overflow-hidden rounded-2xl shadow-2xl'
          style={{ background: C.panel, border: `1px solid ${C.border}`, height: 470 }}>
          <div className='flex items-center gap-2.5 px-4 py-3' style={{ borderBottom: `1px solid ${C.border}` }}>
            <span className='grid h-8 w-8 place-items-center rounded-full' style={{ background: C.accentSoft, color: C.accent }}>
              <Sparkles className='h-4 w-4' />
            </span>
            <div className='flex-1'>
              <p className='text-[13.5px] font-semibold'>Vela Assistant</p>
              <p className='text-[11.5px]' style={{ color: C.muted }}>AI · knows the catalog & policies</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: C.muted }} aria-label='Close chat'>
              <X className='h-4 w-4' />
            </button>
          </div>

          <div ref={scroller} className='flex-1 space-y-3 overflow-y-auto px-4 py-3'>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className='max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed'
                  style={
                    m.role === 'user'
                      ? { background: C.accent, color: 'white', borderBottomRightRadius: 6 }
                      : { background: C.bg, border: `1px solid ${C.border}`, borderBottomLeftRadius: 6 }
                  }>
                  {m.text}
                  {m.streaming && <span className='ml-0.5 inline-block h-3.5 w-1.5 align-middle' style={{ background: C.accent }} />}
                  {m.products && (
                    <div className='mt-2.5 grid grid-cols-2 gap-2'>
                      {m.products.map((id) => <ProductCard key={id} id={id} inChat />)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {cart.length > 0 && !busy && (
              <button
                onClick={() => setCheckout(true)}
                className='mx-auto block rounded-full px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition-opacity hover:opacity-90'
                style={{ background: C.accent }}>
                Checkout {cart.length} item{cart.length > 1 ? 's' : ''} · ${total} →
              </button>
            )}
          </div>

          <div className='px-4 pb-1.5'>
            <div className='flex flex-wrap gap-1.5'>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={busy} className='rounded-full px-2.5 py-1 text-[11.5px] disabled:opacity-50' style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <form className='flex items-center gap-2 p-3' style={{ borderTop: `1px solid ${C.border}` }} onSubmit={(e) => { e.preventDefault(); ask(input) }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask about products, shipping…'
              className='min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none'
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
            />
            <button type='submit' disabled={busy || !input.trim()} aria-label='Send' className='grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white disabled:opacity-40' style={{ background: C.accent }}>
              <Send className='h-4 w-4' />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label='Toggle chat'
        className='fixed right-4 bottom-4 z-40 grid place-items-center rounded-full text-white shadow-xl transition-transform hover:scale-105'
        style={{ background: C.accent, height: 52, width: 52 }}>
        {open ? <X className='h-5 w-5' /> : <MessageCircle className='h-5 w-5' />}
      </button>

      <StripeCheckout
        open={checkout}
        onClose={() => { setCheckout(false); setCart([]) }}
        title='Vela — order checkout'
        amount={`$${total}.00`}
        accent={C.accent}
        successNote='Order confirmed! In the real build this is a live Stripe payment with receipts and fulfillment webhooks.'
      />
    </div>
  )
}
