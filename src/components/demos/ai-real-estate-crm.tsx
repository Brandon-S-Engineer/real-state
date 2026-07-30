'use client'

// Haven — AI real-estate CRM demo, grounded in a real production system: a
// lead pipeline with AI scoring, a zone-based property view, and a multi-
// channel listing publisher (Facebook Marketplace / Instagram / Website) that
// mirrors an actual "anunciador" module. Scoring/drafts are precomputed — the
// production build runs them through Claude on ingest and posts via each
// channel's real API.

import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, Bot, Building2, Copy, Check, Flame, Loader2, MapPin,
  RefreshCw, X,
} from 'lucide-react'

const C = {
  bg: 'oklch(0.975 0.004 80)',
  panel: 'oklch(1 0 0)',
  border: 'oklch(0.25 0.02 80 / 0.12)',
  fg: 'oklch(0.25 0.02 60)',
  muted: 'oklch(0.5 0.015 60)',
  accent: 'oklch(0.6 0.15 45)',
  accentSoft: 'oklch(0.6 0.15 45 / 0.1)',
  green: 'oklch(0.58 0.15 155)',
  amber: 'oklch(0.72 0.14 85)',
  red: 'oklch(0.62 0.18 25)',
  blue: 'oklch(0.55 0.15 255)',
}

// ── Pipeline data ─────────────────────────────────────────────────────────

const STAGES = ['New', 'Contacted', 'Viewing', 'Offer'] as const
type Stage = (typeof STAGES)[number]

type Lead = {
  id: string; name: string; source: string; budget: string; score: number; stage: Stage
  summary: string; reasons: string[]; draft: string; matches: { name: string; price: string; fit: number }[]
}

const INITIAL: Lead[] = [
  {
    id: 'l1', name: 'Sofia Martínez', source: 'Portal · Inmuebles24', budget: '$280k–320k', score: 91, stage: 'New',
    summary: 'Pre-approved buyer relocating for work in under 60 days. Asked twice about school districts — family move, high intent.',
    reasons: ['Pre-approved financing mentioned explicitly', 'Hard deadline (relocation in 60 days)', 'Replied within 4 minutes to first contact'],
    draft: 'Hi Sofia! Great news — I found 3 homes in Valle Norte within your budget, all near the schools you asked about. Two have open viewings this Saturday. Want me to reserve you a slot?',
    matches: [
      { name: 'Casa Valle Norte 214', price: '$295,000', fit: 94 },
      { name: 'Residencial Olmo 12', price: '$310,000', fit: 88 },
    ],
  },
  {
    id: 'l2', name: 'Daniel Wu', source: 'WhatsApp', budget: '$150k–180k', score: 74, stage: 'New',
    summary: 'First-time buyer, flexible timeline. Budget realistic for the east-side inventory. Needs financing guidance.',
    reasons: ['Realistic budget for available stock', 'No financing pre-approval yet', 'Flexible timeline reduces urgency'],
    draft: 'Hi Daniel! For your range there are 5 solid options east side. Also — our partner bank pre-approves in 48h with no fee. Want me to send the top 3 homes + the pre-approval link?',
    matches: [
      { name: 'Depto. Mirador 8B', price: '$165,000', fit: 90 },
      { name: 'Casa Roble 33', price: '$172,000', fit: 82 },
    ],
  },
  {
    id: 'l3', name: 'Amara Okoye', source: 'Web form', budget: '$400k+', score: 86, stage: 'Contacted',
    summary: 'Investor comparing 3 cities; wants cap-rate data. High budget, analytical profile — send numbers, not adjectives.',
    reasons: ['Investor with multi-property intent', 'Requested rental yield data (serious)', 'Comparing other markets — act fast'],
    draft: 'Hi Amara — attached: cap rates for the 4 zones you asked about (5.8–7.2%), plus 2 off-market units that fit your criteria. Happy to walk through the numbers on a 15-min call this week.',
    matches: [
      { name: 'Torre Cenit 1204', price: '$420,000', fit: 91 },
      { name: 'Loft Distrito Sur', price: '$455,000', fit: 84 },
    ],
  },
  {
    id: 'l4', name: 'Lucas Ferreira', source: 'Portal · Vivanuncios', budget: '$220k', score: 43, stage: 'Contacted',
    summary: 'Browsing stage — asked generic questions, no timeline or financing. Nurture with listings digest, don’t over-invest.',
    reasons: ['No timeline mentioned', 'Generic questions only', 'Hasn’t replied to last follow-up (3 days)'],
    draft: 'Hi Lucas! No rush at all — I set you up on a weekly digest of new homes under $220k so you can watch the market. When you want to visit one, just reply here.',
    matches: [{ name: 'Casa Jardines 45', price: '$218,000', fit: 76 }],
  },
  {
    id: 'l5', name: 'Hana Kobayashi', source: 'Referral', budget: '$350k', score: 88, stage: 'Viewing',
    summary: 'Referred by past client. Second viewing scheduled — loved the kitchen, worried about street noise. Bring comparables.',
    reasons: ['Warm referral (highest-converting source)', 'Second viewing = strong signal', 'Specific objection to resolve (noise)'],
    draft: 'Hi Hana! Ahead of Saturday: I pulled the noise report for Av. Cedros (quiet after 8pm) and 2 comparables so you can see the price is fair. See you at 11!',
    matches: [{ name: 'Casa Cedros 102', price: '$348,000', fit: 96 }],
  },
  {
    id: 'l6', name: 'Marco Rossi', source: 'Web form', budget: '$275k', score: 79, stage: 'Offer',
    summary: 'Offer submitted at $265k, seller countered $272k. Buyer has room — coach toward meeting at $270k this week.',
    reasons: ['Active negotiation in final stage', 'Gap is only 2.6% — closeable', 'Financing already approved'],
    draft: 'Hi Marco — the seller came down to $272k. Meeting at $270k likely closes this today; that’s $5k over your offer for a home appraised at $278k. Shall I present it?',
    matches: [{ name: 'Casa Álamo 77', price: '$272,000', fit: 93 }],
  },
]

function scoreColor(s: number) {
  return s >= 85 ? C.green : s >= 60 ? C.amber : C.red
}

// ── Zones data ────────────────────────────────────────────────────────────

type Property = { id: string; name: string; zone: string; price: number; type: string; days: number }

const PROPERTIES: Property[] = [
  { id: 'p1', name: 'Casa Valle Norte 214', zone: 'Valle Norte', price: 295000, type: 'House · 3bd', days: 4 },
  { id: 'p2', name: 'Residencial Olmo 12', zone: 'Valle Norte', price: 310000, type: 'House · 4bd', days: 11 },
  { id: 'p3', name: 'Depto. Mirador 8B', zone: 'East Side', price: 165000, type: 'Apt · 2bd', days: 22 },
  { id: 'p4', name: 'Casa Roble 33', zone: 'East Side', price: 172000, type: 'House · 3bd', days: 6 },
  { id: 'p5', name: 'Torre Cenit 1204', zone: 'Distrito Sur', price: 420000, type: 'Apt · 3bd', days: 2 },
  { id: 'p6', name: 'Loft Distrito Sur', zone: 'Distrito Sur', price: 455000, type: 'Loft · 2bd', days: 18 },
  { id: 'p7', name: 'Casa Cedros 102', zone: 'Av. Cedros', price: 348000, type: 'House · 4bd', days: 9 },
  { id: 'p8', name: 'Casa Álamo 77', zone: 'Av. Cedros', price: 272000, type: 'House · 3bd', days: 31 },
]

const ZONES = Array.from(new Set(PROPERTIES.map((p) => p.zone))).map((zone) => {
  const items = PROPERTIES.filter((p) => p.zone === zone)
  const avg = Math.round(items.reduce((s, p) => s + p.price, 0) / items.length)
  return { zone, items, avg, count: items.length }
})

// ── Anunciador (multi-channel publisher) data ────────────────────────────

type ChannelStatus = 'published' | 'pending' | 'error' | 'off'
type Channels = { marketplace: ChannelStatus; instagram: ChannelStatus; website: ChannelStatus }
const CHANNEL_LABELS: { key: keyof Channels; label: string }[] = [
  { key: 'website', label: 'Website' },
  { key: 'marketplace', label: 'FB Marketplace' },
  { key: 'instagram', label: 'Instagram' },
]

const STATUS_STYLE: Record<ChannelStatus, { label: string; color: string; bg: string }> = {
  published: { label: 'Live', color: C.green, bg: 'oklch(0.58 0.15 155 / 0.13)' },
  pending: { label: 'Publishing…', color: C.amber, bg: 'oklch(0.72 0.14 85 / 0.13)' },
  error: { label: 'Failed', color: C.red, bg: 'oklch(0.62 0.18 25 / 0.13)' },
  off: { label: 'Not posted', color: C.muted, bg: 'oklch(0.25 0.02 60 / 0.06)' },
}

const INITIAL_CHANNELS: Record<string, Channels> = {
  p1: { website: 'published', marketplace: 'published', instagram: 'published' },
  p2: { website: 'published', marketplace: 'published', instagram: 'off' },
  p3: { website: 'published', marketplace: 'error', instagram: 'off' },
  p4: { website: 'published', marketplace: 'published', instagram: 'published' },
  p5: { website: 'published', marketplace: 'off', instagram: 'off' },
  p6: { website: 'published', marketplace: 'published', instagram: 'published' },
  p7: { website: 'published', marketplace: 'published', instagram: 'off' },
  p8: { website: 'published', marketplace: 'published', instagram: 'published' },
}

type View = 'pipeline' | 'zones' | 'anunciador'

export default function CrmDemo() {
  const [view, setView] = useState<View>('pipeline')
  const [leads, setLeads] = useState(INITIAL)
  const [openId, setOpenId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [channels, setChannels] = useState(INITIAL_CHANNELS)
  const [publishingRow, setPublishingRow] = useState<string | null>(null)
  const open = leads.find((l) => l.id === openId)

  function move(id: string, dir: 1 | -1) {
    setLeads((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l
        const i = STAGES.indexOf(l.stage) + dir
        return i < 0 || i >= STAGES.length ? l : { ...l, stage: STAGES[i] }
      })
    )
  }

  async function copyDraft(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* fine in demo */ }
  }

  function publishAll(propId: string) {
    setPublishingRow(propId)
    setChannels((c) => ({ ...c, [propId]: { website: 'pending', marketplace: 'pending', instagram: 'pending' } }))
    setTimeout(() => {
      setChannels((c) => ({ ...c, [propId]: { website: 'published', marketplace: 'published', instagram: 'published' } }))
      setPublishingRow(null)
    }, 1400)
  }

  const NAV: { id: View; label: string }[] = [
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'zones', label: 'Properties by zone' },
    { id: 'anunciador', label: 'Anunciador' },
  ]

  return (
    <div className='min-h-full' style={{ background: C.bg, color: C.fg }}>
      {/* Header */}
      <header className='flex flex-wrap items-center justify-between gap-2 px-5 py-3' style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        <div className='flex items-center gap-2'>
          <span className='grid h-7 w-7 place-items-center rounded-lg text-white' style={{ background: C.accent }}>
            <Building2 className='h-4 w-4' />
          </span>
          <span className='text-[15px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>Haven CRM</span>
        </div>
        <nav className='flex gap-1 rounded-lg p-0.5' style={{ background: C.bg, border: `1px solid ${C.border}` }}>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className='rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors'
              style={view === n.id ? { background: C.accent, color: 'white' } : { color: C.muted }}>
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Pipeline view ── */}
      {view === 'pipeline' && (
        <>
          <div className='flex items-center justify-end px-5 pt-3'>
            <span className='inline-flex items-center gap-1.5 text-[12px]' style={{ color: C.muted }}>
              <Bot className='h-4 w-4' style={{ color: C.accent }} /> drafts ready: {leads.length}/{leads.length}
            </span>
          </div>
          <div className='overflow-x-auto p-4'>
            <div className='grid min-w-[860px] grid-cols-4 gap-3'>
              {STAGES.map((stage) => {
                const col = leads.filter((l) => l.stage === stage)
                return (
                  <div key={stage} className='rounded-xl p-2.5' style={{ background: 'oklch(0.25 0.02 80 / 0.045)' }}>
                    <div className='mb-2 flex items-center justify-between px-1'>
                      <span className='text-[12px] font-semibold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
                        {stage}
                      </span>
                      <span className='text-[11px]' style={{ color: C.muted }}>{col.length}</span>
                    </div>
                    <div className='flex flex-col gap-2'>
                      {col.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setOpenId(l.id)}
                          className='rounded-xl p-3 text-left shadow-sm transition-transform hover:-translate-y-0.5'
                          style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                          <div className='flex items-start justify-between gap-2'>
                            <span className='text-[13.5px] leading-tight font-semibold'>{l.name}</span>
                            <span
                              className='inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white'
                              style={{ background: scoreColor(l.score) }}>
                              {l.score >= 85 && <Flame className='h-3 w-3' />}
                              {l.score}
                            </span>
                          </div>
                          <p className='mt-1 text-[11.5px]' style={{ color: C.muted }}>{l.source}</p>
                          <p className='mt-1.5 text-[12px] font-medium'>{l.budget}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Zones view ── */}
      {view === 'zones' && (
        <div className='p-4'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {ZONES.map((z) => (
              <div key={z.zone} className='rounded-xl p-4' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className='flex items-center gap-1.5' style={{ color: C.accent }}>
                  <MapPin className='h-3.5 w-3.5' />
                  <span className='text-[13.5px] font-semibold' style={{ color: C.fg }}>{z.zone}</span>
                </div>
                <p className='mt-1 text-[11.5px]' style={{ color: C.muted }}>{z.count} active listings</p>
                <p className='mt-2 text-[19px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                  ${(z.avg / 1000).toFixed(0)}k <span className='text-[11px] font-normal' style={{ color: C.muted }}>avg</span>
                </p>
                <div className='mt-3 flex flex-col gap-1.5'>
                  {z.items.map((p) => (
                    <div key={p.id} className='flex items-center justify-between text-[12px]'>
                      <span className='truncate pr-2' style={{ color: C.muted }}>{p.name}</span>
                      <span className='shrink-0 font-medium'>${(p.price / 1000).toFixed(0)}k</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Anunciador view ── */}
      {view === 'anunciador' && (
        <div className='p-4'>
          <div className='overflow-hidden rounded-xl' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-[13px]'>
                <thead>
                  <tr className='text-[10.5px] uppercase' style={{ color: C.muted, letterSpacing: '0.06em' }}>
                    <th className='py-2.5 pl-4 font-medium'>Property</th>
                    <th className='py-2.5 font-medium'>Days listed</th>
                    {CHANNEL_LABELS.map((c) => (
                      <th key={c.key} className='py-2.5 font-medium'>{c.label}</th>
                    ))}
                    <th className='py-2.5 pr-4 font-medium text-right'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {PROPERTIES.map((p) => {
                    const ch = channels[p.id]
                    const busy = publishingRow === p.id
                    return (
                      <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td className='py-3 pl-4'>
                          <p className='font-medium'>{p.name}</p>
                          <p className='text-[11.5px]' style={{ color: C.muted }}>{p.zone} · {p.type}</p>
                        </td>
                        <td className='py-3' style={{ color: C.muted }}>{p.days}d</td>
                        {CHANNEL_LABELS.map((c) => {
                          const s = STATUS_STYLE[ch[c.key]]
                          return (
                            <td key={c.key} className='py-3'>
                              <span className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium' style={{ color: s.color, background: s.bg }}>
                                {ch[c.key] === 'pending' && <Loader2 className='h-3 w-3 animate-spin' />}
                                {s.label}
                              </span>
                            </td>
                          )
                        })}
                        <td className='py-3 pr-4 text-right'>
                          <button
                            onClick={() => publishAll(p.id)}
                            disabled={busy}
                            className='inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50'
                            style={{ background: C.accent }}>
                            {busy ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5' />}
                            Republish all
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className='mt-2.5 px-1 text-[11.5px]' style={{ color: C.muted }}>
            One click pushes the listing to every channel through each platform’s real API — no manual re-posting when a price changes.
          </p>
        </div>
      )}

      {/* Lead drawer */}
      {open && (
        <div className='fixed inset-0 z-50 flex justify-end' style={{ background: 'oklch(0.2 0.02 60 / 0.4)' }} onClick={() => setOpenId(null)}>
          <div className='h-full w-[min(94vw,420px)] overflow-y-auto p-5' style={{ background: C.panel }} onClick={(e) => e.stopPropagation()}>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='flex items-center gap-2'>
                  <h2 className='text-[19px] font-bold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>{open.name}</h2>
                  <span className='rounded-full px-2 py-0.5 text-[11.5px] font-bold text-white' style={{ background: scoreColor(open.score) }}>
                    {open.score}/100
                  </span>
                </div>
                <p className='mt-0.5 text-[12.5px]' style={{ color: C.muted }}>{open.source} · {open.budget} · {open.stage}</p>
              </div>
              <button onClick={() => setOpenId(null)} style={{ color: C.muted }} aria-label='Close'>
                <X className='h-5 w-5' />
              </button>
            </div>

            {/* Stage controls */}
            <div className='mt-3 flex gap-2'>
              <button onClick={() => move(open.id, -1)} disabled={open.stage === STAGES[0]} className='inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-35' style={{ border: `1px solid ${C.border}` }}>
                <ArrowLeft className='h-3.5 w-3.5' /> Prev stage
              </button>
              <button onClick={() => move(open.id, 1)} disabled={open.stage === STAGES[STAGES.length - 1]} className='inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white disabled:opacity-35' style={{ background: C.accent }}>
                Next stage <ArrowRight className='h-3.5 w-3.5' />
              </button>
            </div>

            {/* AI summary */}
            <div className='mt-4 rounded-xl p-3.5' style={{ background: C.accentSoft }}>
              <p className='flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase' style={{ color: C.accent, letterSpacing: '0.08em' }}>
                <Bot className='h-3.5 w-3.5' /> AI summary
              </p>
              <p className='mt-1.5 text-[13.5px] leading-relaxed'>{open.summary}</p>
            </div>

            <p className='mt-4 text-[11px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.08em' }}>Why this score</p>
            <ul className='mt-1.5 flex flex-col gap-1.5'>
              {open.reasons.map((r) => (
                <li key={r} className='flex items-start gap-2 text-[13px]'>
                  <Check className='mt-0.5 h-3.5 w-3.5 shrink-0' style={{ color: scoreColor(open.score) }} />
                  {r}
                </li>
              ))}
            </ul>

            {/* Draft */}
            <p className='mt-4 text-[11px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.08em' }}>AI-drafted follow-up</p>
            <div className='mt-1.5 rounded-xl p-3.5 text-[13.5px] leading-relaxed' style={{ background: C.bg, border: `1px solid ${C.border}` }}>
              {open.draft}
            </div>
            <button
              onClick={() => copyDraft(open.draft)}
              className='mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white'
              style={{ background: copied ? C.green : C.accent }}>
              {copied ? <Check className='h-3.5 w-3.5' /> : <Copy className='h-3.5 w-3.5' />}
              {copied ? 'Copied — ready to send' : 'Copy message'}
            </button>

            {/* Matches */}
            <p className='mt-4 text-[11px] font-bold tracking-wide uppercase' style={{ color: C.muted, letterSpacing: '0.08em' }}>Matched properties</p>
            <div className='mt-1.5 flex flex-col gap-2'>
              {open.matches.map((m) => (
                <div key={m.name} className='flex items-center justify-between rounded-xl p-3' style={{ border: `1px solid ${C.border}` }}>
                  <div>
                    <p className='text-[13px] font-semibold'>{m.name}</p>
                    <p className='text-[12px]' style={{ color: C.muted }}>{m.price}</p>
                  </div>
                  <span className='rounded-full px-2 py-0.5 text-[11px] font-bold' style={{ background: C.accentSoft, color: C.accent }}>
                    {m.fit}% fit
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
