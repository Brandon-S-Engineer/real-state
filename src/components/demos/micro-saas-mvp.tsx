'use client'

// ClipPost — AI SaaS MVP demo. Mirrors the highest-value captured Upwork jobs
// ("AI SaaS MVP: Video-to-Blog tool, Next.js/Node + LLM API + Stripe"): paste a
// transcript, watch a staged AI generation, get an SEO-ready article, and see
// Stripe-style subscription checkout. Generation is scripted — same UX as the
// production build, no live API key needed for the showroom.

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, FileText, Loader2, Sparkles, Wand2, X } from 'lucide-react'

const C = {
  bg: 'oklch(0.985 0.002 300)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.2 0.01 300 / 0.12)',
  fg: 'oklch(0.23 0.02 300)',
  muted: 'oklch(0.5 0.015 300)',
  accent: 'oklch(0.56 0.21 295)',
  accentSoft: 'oklch(0.56 0.21 295 / 0.1)',
  green: 'oklch(0.6 0.15 155)',
  code: 'oklch(0.96 0.005 300)',
}

const SAMPLE_TRANSCRIPT = `So today I want to talk about why most remote teams get async communication wrong. Everyone says "we're async first" but then they schedule four meetings a day. The real unlock for us was writing things down before discussing them — every decision starts as a one-page doc. Second thing: we killed status meetings entirely and replaced them with a Friday written update, takes everyone ten minutes. And third, we set response-time expectations explicitly: nothing is urgent by default, urgent things go to a different channel. Since we made those three changes, our meeting load dropped by about sixty percent and people actually say they can do deep work again...`

const STAGES = [
  'analyzing transcript · 1,214 words',
  'extracting key points and structure',
  'drafting sections with your brand voice',
  'optimizing title, meta and headings for SEO',
]

const ARTICLE = {
  title: 'Why Most Remote Teams Get Async Wrong (and the 3 Changes That Fix It)',
  meta: 'Most "async-first" teams still drown in meetings. Here are the three concrete changes that cut one team’s meeting load by 60% — docs before discussion, written updates, and explicit response times.',
  tags: ['remote work', 'async communication', 'productivity'],
  readTime: '4 min read',
  words: 780,
  sections: [
    {
      h: 'The async-first lie',
      p: 'Every remote team claims to be async-first — right before scheduling their fourth sync of the day. The problem isn’t intent; it’s that async needs structure, and most teams never build it.',
    },
    {
      h: '1. Write it down before you discuss it',
      p: 'Every decision starts as a one-page doc. Not a slide deck, not a meeting invite — a document anyone can read and comment on in their own time. Discussion happens after context, not instead of it.',
    },
    {
      h: '2. Kill status meetings, keep the status',
      p: 'A Friday written update replaced every standing status meeting. It takes each person ten minutes to write and two to read — and unlike a meeting, it’s searchable forever.',
    },
    {
      h: '3. Nothing is urgent by default',
      p: 'Explicit response-time expectations changed everything: normal messages can wait a day, and truly urgent items go to a separate channel. The result — a 60% drop in meetings and real deep-work time back on the calendar.',
    },
  ],
}

const PLANS = [
  { name: 'Starter', price: '$0', per: 'forever', cta: 'Start free', features: ['3 articles / month', 'Basic SEO optimization', 'Markdown export'], popular: false },
  { name: 'Creator', price: '$19', per: '/month', cta: 'Start 7-day trial', features: ['30 articles / month', 'Brand-voice training', 'WordPress & Ghost export', 'Meta + OG generation'], popular: true },
  { name: 'Studio', price: '$59', per: '/month', cta: 'Start 7-day trial', features: ['Unlimited articles', 'API access', 'Team seats & approvals', 'Priority support'], popular: false },
]

type Phase = 'idle' | 'generating' | 'done'

export default function MvpDemo() {
  const [transcript, setTranscript] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [stage, setStage] = useState(0)
  const [copied, setCopied] = useState(false)
  const [checkout, setCheckout] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => clearInterval(timer.current), [])

  function generate() {
    if (!transcript.trim() || phase === 'generating') return
    setPhase('generating')
    setStage(0)
    let s = 0
    timer.current = setInterval(() => {
      s += 1
      if (s >= STAGES.length) {
        clearInterval(timer.current)
        setPhase('done')
        setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      } else {
        setStage(s)
      }
    }, 750)
  }

  async function copyArticle() {
    const text = `# ${ARTICLE.title}\n\n${ARTICLE.sections.map((s) => `## ${s.h}\n${s.p}`).join('\n\n')}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard unavailable in some embeds — non-critical */ }
  }

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      {/* Nav */}
      <header className='mx-auto flex h-16 max-w-5xl items-center justify-between px-5'>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Wand2 className='h-4 w-4' />
          </span>
          <span className='text-[16px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>ClipPost</span>
        </div>
        <div className='flex items-center gap-4 text-[13.5px]'>
          <a href='#pricing' style={{ color: C.muted }}>Pricing</a>
          <span style={{ color: C.muted }}>Sign in</span>
          <a href='#pricing' className='rounded-lg px-3.5 py-2 font-medium text-white' style={{ background: C.fg }}>
            Get started
          </a>
        </div>
      </header>

      {/* Hero + tool */}
      <section className='mx-auto max-w-3xl px-5 pt-10 pb-4 text-center'>
        <span className='inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium' style={{ background: C.accentSoft, color: C.accent }}>
          <Sparkles className='h-3.5 w-3.5' /> AI-powered · SEO-ready
        </span>
        <h1 className='mx-auto mt-4 max-w-[22ch] text-[clamp(28px,4.5vw,44px)] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          Turn any video transcript into a publish-ready article
        </h1>
        <p className='mx-auto mt-3 max-w-[46ch] text-[16px] leading-relaxed' style={{ color: C.muted }}>
          Paste a transcript from your podcast or YouTube video. ClipPost writes the article, the meta,
          and the headings — in your voice.
        </p>
      </section>

      <section className='mx-auto max-w-3xl px-5 pb-12'>
        <div className='rounded-2xl p-4 shadow-sm' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder='Paste your transcript here…'
            rows={5}
            className='w-full resize-none rounded-xl p-3.5 text-[14px] leading-relaxed outline-none'
            style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.fg }}
          />
          <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
            <button
              onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
              className='inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium'
              style={{ border: `1px solid ${C.border}`, color: C.muted }}>
              <FileText className='h-3.5 w-3.5' /> Use a sample transcript
            </button>
            <div className='flex items-center gap-3'>
              <span className='text-[12px]' style={{ color: C.muted }}>
                {transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : ''}
              </span>
              <button
                onClick={generate}
                disabled={!transcript.trim() || phase === 'generating'}
                className='inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity disabled:opacity-40'
                style={{ background: C.accent }}>
                {phase === 'generating' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Sparkles className='h-4 w-4' />}
                {phase === 'generating' ? 'Generating…' : 'Generate article'}
              </button>
            </div>
          </div>

          {/* staged progress */}
          {phase === 'generating' && (
            <div className='mt-4 rounded-xl p-3.5 text-[12.5px]' style={{ background: C.code, fontFamily: 'var(--font-jetbrains), monospace', color: C.muted }}>
              {STAGES.slice(0, stage + 1).map((s, i) => (
                <div key={s} className='flex items-center gap-2 py-0.5'>
                  {i < stage ? (
                    <Check className='h-3.5 w-3.5' style={{ color: C.green }} />
                  ) : (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' style={{ color: C.accent }} />
                  )}
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* output */}
        {phase === 'done' && (
          <div ref={outputRef} className='mt-5 overflow-hidden rounded-2xl shadow-sm' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className='flex flex-wrap items-center justify-between gap-2 px-5 py-3.5' style={{ borderBottom: `1px solid ${C.border}`, background: C.code }}>
              <div className='flex items-center gap-2 text-[12px]' style={{ fontFamily: 'var(--font-jetbrains), monospace', color: C.muted }}>
                <Check className='h-3.5 w-3.5' style={{ color: C.green }} />
                article generated · {ARTICLE.words} words · {ARTICLE.readTime}
              </div>
              <button
                onClick={copyArticle}
                className='inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium'
                style={{ border: `1px solid ${C.border}`, color: copied ? C.green : C.muted, background: C.panel }}>
                {copied ? <Check className='h-3.5 w-3.5' /> : <Copy className='h-3.5 w-3.5' />}
                {copied ? 'Copied!' : 'Copy markdown'}
              </button>
            </div>
            <div className='px-5 py-5 sm:px-7'>
              <h2 className='text-[22px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {ARTICLE.title}
              </h2>
              <p className='mt-2.5 rounded-lg p-3 text-[13px] leading-relaxed' style={{ background: C.accentSoft, color: C.fg }}>
                <span className='font-semibold' style={{ color: C.accent }}>meta · </span>
                {ARTICLE.meta}
              </p>
              <div className='mt-2.5 flex flex-wrap gap-1.5'>
                {ARTICLE.tags.map((t) => (
                  <span key={t} className='rounded-full px-2.5 py-0.5 text-[11.5px]' style={{ background: C.code, color: C.muted }}>
                    #{t}
                  </span>
                ))}
              </div>
              {ARTICLE.sections.map((s) => (
                <div key={s.h} className='mt-5'>
                  <h3 className='text-[16.5px] font-semibold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.01em' }}>
                    {s.h}
                  </h3>
                  <p className='mt-1.5 text-[14.5px] leading-relaxed' style={{ color: C.muted }}>{s.p}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Pricing */}
      <section id='pricing' className='mx-auto max-w-4xl px-5 pb-16'>
        <h2 className='text-center text-[24px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>
          Simple pricing
        </h2>
        <p className='mt-1.5 text-center text-[14.5px]' style={{ color: C.muted }}>
          Start free. Upgrade when your content engine takes off.
        </p>
        <div className='mt-7 grid gap-4 md:grid-cols-3'>
          {PLANS.map((p) => (
            <div
              key={p.name}
              className='relative flex flex-col rounded-2xl p-5'
              style={{
                background: C.panel,
                border: p.popular ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
              }}>
              {p.popular && (
                <span className='absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold text-white' style={{ background: C.accent }}>
                  MOST POPULAR
                </span>
              )}
              <p className='text-[15px] font-semibold'>{p.name}</p>
              <p className='mt-1.5'>
                <span className='text-[28px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>{p.price}</span>
                <span className='text-[13px]' style={{ color: C.muted }}> {p.per}</span>
              </p>
              <ul className='mt-3.5 flex flex-col gap-2'>
                {p.features.map((f) => (
                  <li key={f} className='flex items-start gap-2 text-[13.5px]'>
                    <Check className='mt-0.5 h-3.5 w-3.5 shrink-0' style={{ color: C.green }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setCheckout(p.name); setPaid(false) }}
                className='mt-5 rounded-lg py-2.5 text-[13.5px] font-semibold transition-opacity hover:opacity-90'
                style={p.popular ? { background: C.accent, color: 'white' } : { border: `1px solid ${C.border}`, color: C.fg }}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Stripe-style checkout modal */}
      {checkout && (
        <div className='fixed inset-0 z-50 grid place-items-center p-4' style={{ background: 'oklch(0.15 0.02 300 / 0.55)' }} onClick={() => setCheckout(null)}>
          <div className='w-full max-w-sm rounded-2xl p-5 shadow-2xl' style={{ background: C.panel }} onClick={(e) => e.stopPropagation()}>
            {!paid ? (
              <>
                <div className='flex items-center justify-between'>
                  <p className='text-[15px] font-semibold'>Subscribe to {checkout}</p>
                  <button onClick={() => setCheckout(null)} style={{ color: C.muted }} aria-label='Close'>
                    <X className='h-4 w-4' />
                  </button>
                </div>
                <p className='mt-0.5 text-[12.5px]' style={{ color: C.muted }}>
                  Powered by Stripe · demo mode, no real charge
                </p>
                <div className='mt-4 flex flex-col gap-2.5'>
                  <input readOnly value='demo@clippost.io' className='rounded-lg px-3 py-2.5 text-[13.5px] outline-none' style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted }} />
                  <input readOnly value='4242 4242 4242 4242' className='rounded-lg px-3 py-2.5 text-[13.5px] outline-none' style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }} />
                  <div className='flex gap-2.5'>
                    <input readOnly value='12 / 29' className='w-1/2 rounded-lg px-3 py-2.5 text-[13.5px] outline-none' style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }} />
                    <input readOnly value='424' className='w-1/2 rounded-lg px-3 py-2.5 text-[13.5px] outline-none' style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'var(--font-jetbrains), monospace' }} />
                  </div>
                </div>
                <button
                  onClick={() => setPaid(true)}
                  className='mt-4 w-full rounded-lg py-2.5 text-[14px] font-semibold text-white'
                  style={{ background: C.accent }}>
                  Subscribe — demo
                </button>
              </>
            ) : (
              <div className='py-4 text-center'>
                <span className='mx-auto grid h-12 w-12 place-items-center rounded-full' style={{ background: 'oklch(0.6 0.15 155 / 0.12)' }}>
                  <Check className='h-6 w-6' style={{ color: C.green }} />
                </span>
                <p className='mt-3 text-[16px] font-semibold'>Subscription active</p>
                <p className='mx-auto mt-1 max-w-[30ch] text-[13px]' style={{ color: C.muted }}>
                  In the real build this runs a live Stripe subscription with webhooks and a billing portal.
                </p>
                <button onClick={() => setCheckout(null)} className='mt-4 rounded-lg px-4 py-2 text-[13.5px] font-medium' style={{ border: `1px solid ${C.border}` }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className='py-6 text-center text-[12px]' style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
        ClipPost — demo product built by Brandon Soria
      </footer>
    </div>
  )
}
