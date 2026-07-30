'use client'

// Pulse — SaaS analytics dashboard demo. Fully client-side with seeded data:
// period switcher drives chart + KPIs, orders table has live search + filters,
// sidebar switches Overview / Orders views. No backend — it's a showroom.

import { useMemo, useState } from 'react'
import {
  BarChart3, CreditCard, LayoutDashboard, Search, Settings, Users, Bell, ChevronDown,
} from 'lucide-react'

const C = {
  bg: 'oklch(0.155 0.012 262)',
  panel: 'oklch(0.195 0.014 262)',
  panelUp: 'oklch(0.23 0.016 262)',
  border: 'oklch(1 0 0 / 0.09)',
  fg: 'oklch(0.93 0.006 262)',
  muted: 'oklch(0.62 0.012 262)',
  accent: 'oklch(0.66 0.19 275)',
  accentSoft: 'oklch(0.66 0.19 275 / 0.16)',
  green: 'oklch(0.75 0.15 158)',
  red: 'oklch(0.68 0.18 22)',
  amber: 'oklch(0.8 0.14 85)',
}

type Period = '7d' | '30d' | '90d'

const SERIES: Record<Period, number[]> = {
  '7d': [3.2, 3.8, 3.5, 4.1, 4.6, 4.4, 5.0],
  '30d': [2.1, 2.4, 2.2, 2.8, 2.6, 3.1, 3.0, 3.4, 3.2, 3.7, 3.5, 3.9, 4.2, 4.0, 4.5, 4.3, 4.8, 5.1, 4.9, 5.4],
  '90d': [1.2, 1.5, 1.4, 1.9, 2.3, 2.1, 2.7, 3.2, 3.0, 3.8, 4.4, 5.4],
}

const KPIS: Record<Period, { label: string; value: string; delta: number }[]> = {
  '7d': [
    { label: 'MRR', value: '$24,810', delta: 4.2 },
    { label: 'Active users', value: '1,284', delta: 2.8 },
    { label: 'Churn', value: '1.9%', delta: -0.4 },
    { label: 'ARPU', value: '$19.3', delta: 1.1 },
  ],
  '30d': [
    { label: 'MRR', value: '$24,810', delta: 12.6 },
    { label: 'Active users', value: '1,284', delta: 9.1 },
    { label: 'Churn', value: '1.9%', delta: -0.8 },
    { label: 'ARPU', value: '$19.3', delta: 3.4 },
  ],
  '90d': [
    { label: 'MRR', value: '$24,810', delta: 38.2 },
    { label: 'Active users', value: '1,284', delta: 26.7 },
    { label: 'Churn', value: '1.9%', delta: -1.6 },
    { label: 'ARPU', value: '$19.3', delta: 6.9 },
  ],
}

const PLANS = [
  { name: 'Scale', mrr: 11200, pct: 45 },
  { name: 'Pro', mrr: 8400, pct: 34 },
  { name: 'Starter', mrr: 5210, pct: 21 },
]

type OrderStatus = 'paid' | 'pending' | 'failed' | 'refunded'
const ORDERS: { customer: string; email: string; plan: string; amount: string; status: OrderStatus; date: string }[] = [
  { customer: 'Maren Villanueva', email: 'maren@driftlabs.io', plan: 'Scale', amount: '$149.00', status: 'paid', date: 'Jul 6' },
  { customer: 'Theo Brandt', email: 'theo@brandt.co', plan: 'Pro', amount: '$49.00', status: 'paid', date: 'Jul 6' },
  { customer: 'Aiko Tanaka', email: 'aiko@kumo.app', plan: 'Starter', amount: '$19.00', status: 'pending', date: 'Jul 5' },
  { customer: 'Louis Okafor', email: 'louis@okafor.dev', plan: 'Scale', amount: '$149.00', status: 'paid', date: 'Jul 5' },
  { customer: 'Petra Lindqvist', email: 'petra@nordwind.se', plan: 'Pro', amount: '$49.00', status: 'failed', date: 'Jul 5' },
  { customer: 'Dario Fuentes', email: 'dario@vela.mx', plan: 'Pro', amount: '$49.00', status: 'paid', date: 'Jul 4' },
  { customer: 'Ines Baptista', email: 'ines@lumeo.pt', plan: 'Starter', amount: '$19.00', status: 'refunded', date: 'Jul 4' },
  { customer: 'Caleb Wright', email: 'caleb@northbeam.io', plan: 'Scale', amount: '$149.00', status: 'paid', date: 'Jul 3' },
  { customer: 'Yara Haddad', email: 'yara@atlas.dev', plan: 'Pro', amount: '$49.00', status: 'pending', date: 'Jul 3' },
  { customer: 'Emil Novak', email: 'emil@quanta.cz', plan: 'Starter', amount: '$19.00', status: 'paid', date: 'Jul 2' },
]

const STATUS_STYLE: Record<OrderStatus, { color: string; bg: string }> = {
  paid: { color: C.green, bg: 'oklch(0.75 0.15 158 / 0.13)' },
  pending: { color: C.amber, bg: 'oklch(0.8 0.14 85 / 0.13)' },
  failed: { color: C.red, bg: 'oklch(0.68 0.18 22 / 0.13)' },
  refunded: { color: C.muted, bg: 'oklch(0.62 0.012 262 / 0.15)' },
}

function AreaChart({ data }: { data: number[] }) {
  const W = 640
  const H = 190
  const max = Math.max(...data) * 1.15
  const pts = data.map((v, i) => [ (i / (data.length - 1)) * W, H - (v / max) * H ] as const)
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className='h-full w-full' preserveAspectRatio='none'>
      <defs>
        <linearGradient id='pulse-fill' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={C.accent} stopOpacity='0.35' />
          <stop offset='100%' stopColor={C.accent} stopOpacity='0' />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1='0' x2={W} y1={H * t} y2={H * t} stroke={C.border} strokeWidth='1' />
      ))}
      <path d={area} fill='url(#pulse-fill)' />
      <path d={line} fill='none' stroke={C.accent} strokeWidth='2.5' strokeLinejoin='round' strokeLinecap='round' />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r='4' fill={C.accent} stroke={C.bg} strokeWidth='2' />
    </svg>
  )
}

function OrdersTable({ rows, compact }: { rows: typeof ORDERS; compact?: boolean }) {
  return (
    <table className='w-full text-left text-[13px]' style={{ color: C.fg }}>
      <thead>
        <tr className='text-[11px] uppercase' style={{ color: C.muted, letterSpacing: '0.08em' }}>
          <th className='py-2.5 pl-4 font-medium'>Customer</th>
          {!compact && <th className='py-2.5 font-medium'>Email</th>}
          <th className='py-2.5 font-medium'>Plan</th>
          <th className='py-2.5 font-medium'>Amount</th>
          <th className='py-2.5 font-medium'>Status</th>
          <th className='py-2.5 pr-4 text-right font-medium'>Date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => (
          <tr
            key={o.email}
            className='transition-colors'
            style={{ borderTop: `1px solid ${C.border}` }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.panelUp)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <td className='py-3 pl-4 font-medium'>{o.customer}</td>
            {!compact && <td className='py-3' style={{ color: C.muted }}>{o.email}</td>}
            <td className='py-3'>{o.plan}</td>
            <td className='py-3'>{o.amount}</td>
            <td className='py-3'>
              <span
                className='rounded-full px-2 py-0.5 text-[11px] font-medium'
                style={{ color: STATUS_STYLE[o.status].color, background: STATUS_STYLE[o.status].bg }}>
                {o.status}
              </span>
            </td>
            <td className='py-3 pr-4 text-right' style={{ color: C.muted }}>{o.date}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr style={{ borderTop: `1px solid ${C.border}` }}>
            <td colSpan={6} className='py-8 text-center' style={{ color: C.muted }}>
              No orders match your filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export default function DashboardDemo() {
  const [period, setPeriod] = useState<Period>('30d')
  const [view, setView] = useState<'overview' | 'orders'>('overview')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | OrderStatus>('all')

  const filtered = useMemo(
    () =>
      ORDERS.filter(
        (o) =>
          (status === 'all' || o.status === status) &&
          (query === '' ||
            `${o.customer} ${o.email} ${o.plan}`.toLowerCase().includes(query.toLowerCase()))
      ),
    [query, status]
  )

  const nav = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'orders' as const, label: 'Orders', icon: CreditCard },
  ]
  const navStatic = [
    { label: 'Customers', icon: Users },
    { label: 'Reports', icon: BarChart3 },
    { label: 'Settings', icon: Settings },
  ]

  return (
    <div className='flex min-h-full' style={{ background: C.bg, color: C.fg }}>
      {/* Sidebar */}
      <aside
        className='hidden w-52 shrink-0 flex-col gap-1 p-3 sm:flex'
        style={{ borderRight: `1px solid ${C.border}` }}>
        <div className='mb-4 flex items-center gap-2 px-2 pt-1'>
          <span
            className='grid h-7 w-7 place-items-center rounded-lg text-[13px] font-bold'
            style={{ background: C.accent, color: 'white', fontFamily: 'var(--font-space-grotesk)' }}>
            P
          </span>
          <span className='text-[15px] font-semibold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            Pulse
          </span>
        </div>
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            className='flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors'
            style={{
              background: view === n.id ? C.accentSoft : 'transparent',
              color: view === n.id ? C.fg : C.muted,
            }}>
            <n.icon className='h-4 w-4' />
            {n.label}
          </button>
        ))}
        {navStatic.map((n) => (
          <span
            key={n.label}
            className='flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px]'
            style={{ color: C.muted, opacity: 0.55 }}
            title='Included in the full build'>
            <n.icon className='h-4 w-4' />
            {n.label}
          </span>
        ))}
      </aside>

      {/* Main */}
      <main className='min-w-0 flex-1 p-4 sm:p-6'>
        {/* Top bar */}
        <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-[19px] font-semibold' style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              {view === 'overview' ? 'Overview' : 'Orders'}
            </h1>
            <p className='text-[12.5px]' style={{ color: C.muted }}>
              Acme Inc. · production
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {view === 'overview' && (
              <div className='flex rounded-lg p-0.5' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                {(['7d', '30d', '90d'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className='rounded-md px-3 py-1 text-[12.5px] font-medium transition-colors'
                    style={{
                      background: period === p ? C.accent : 'transparent',
                      color: period === p ? 'white' : C.muted,
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
            <span className='grid h-8 w-8 place-items-center rounded-lg' style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.muted }}>
              <Bell className='h-4 w-4' />
            </span>
            <span
              className='flex items-center gap-1.5 rounded-lg py-1 pr-2 pl-1'
              style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <span className='grid h-6 w-6 place-items-center rounded-md text-[11px] font-semibold' style={{ background: C.accentSoft, color: C.accent }}>
                BS
              </span>
              <ChevronDown className='h-3.5 w-3.5' style={{ color: C.muted }} />
            </span>
          </div>
        </div>

        {view === 'overview' ? (
          <>
            {/* KPIs */}
            <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
              {KPIS[period].map((k) => (
                <div key={k.label} className='rounded-xl p-4' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                  <p className='text-[12px]' style={{ color: C.muted }}>{k.label}</p>
                  <div className='mt-1.5 flex items-baseline gap-2'>
                    <span className='text-[22px] font-semibold' style={{ fontFamily: 'var(--font-space-grotesk)', letterSpacing: '-0.02em' }}>
                      {k.value}
                    </span>
                    <span
                      className='text-[12px] font-medium'
                      style={{ color: (k.label === 'Churn' ? k.delta < 0 : k.delta > 0) ? C.green : C.red }}>
                      {k.delta > 0 ? '+' : ''}{k.delta}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className='mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]'>
              <div className='rounded-xl p-4' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className='mb-3 flex items-center justify-between'>
                  <p className='text-[13.5px] font-medium'>Revenue</p>
                  <p className='text-[12px]' style={{ color: C.muted }}>last {period}</p>
                </div>
                <div className='h-44'>
                  <AreaChart data={SERIES[period]} />
                </div>
              </div>
              <div className='rounded-xl p-4' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <p className='mb-4 text-[13.5px] font-medium'>MRR by plan</p>
                <div className='flex flex-col gap-4'>
                  {PLANS.map((p) => (
                    <div key={p.name}>
                      <div className='mb-1.5 flex justify-between text-[12.5px]'>
                        <span>{p.name}</span>
                        <span style={{ color: C.muted }}>${(p.mrr / 1000).toFixed(1)}k</span>
                      </div>
                      <div className='h-2 rounded-full' style={{ background: C.panelUp }}>
                        <div className='h-2 rounded-full' style={{ width: `${p.pct}%`, background: C.accent }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent orders preview */}
            <div className='mt-3 overflow-hidden rounded-xl' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className='flex items-center justify-between px-4 pt-4 pb-1'>
                <p className='text-[13.5px] font-medium'>Recent orders</p>
                <button onClick={() => setView('orders')} className='text-[12.5px] font-medium' style={{ color: C.accent }}>
                  View all →
                </button>
              </div>
              <div className='overflow-x-auto'>
                <OrdersTable rows={ORDERS.slice(0, 5)} compact />
              </div>
            </div>
          </>
        ) : (
          <div className='overflow-hidden rounded-xl' style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className='flex flex-wrap items-center gap-2 p-4'>
              <div
                className='flex min-w-52 flex-1 items-center gap-2 rounded-lg px-3 py-2'
                style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <Search className='h-4 w-4 shrink-0' style={{ color: C.muted }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Search customer, email, plan…'
                  className='w-full bg-transparent text-[13px] outline-none'
                  style={{ color: C.fg }}
                />
              </div>
              <div className='flex rounded-lg p-0.5' style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                {(['all', 'paid', 'pending', 'failed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className='rounded-md px-2.5 py-1 text-[12px] font-medium capitalize transition-colors'
                    style={{
                      background: status === s ? C.panelUp : 'transparent',
                      color: status === s ? C.fg : C.muted,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className='overflow-x-auto'>
              <OrdersTable rows={filtered} />
            </div>
            <div className='px-4 py-3 text-[12px]' style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
              {filtered.length} of {ORDERS.length} orders
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
