'use client'

import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  ExternalLink, RefreshCw, Loader2, ChevronDown, ChevronRight, Bell, Copy, Download, Trash2,
  Pencil, MessageSquare, ShoppingCart, AlertTriangle, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ElecListingDTO } from '@/lib/electronicos/serialize'
import { cleanPrices, isPriceUsable, percentile } from '@/lib/electronicos/math'
import {
  CATALOG, LINES, LINE_LABEL, ScoreBadge, SpecsEditorDialog, ZoneBadge, configShort, daysAgo,
  downloadFile, formatDays, formatSsd, money, scoreTier,
} from './shared'

// ── Referencia de mercado (client-side, misma lógica que el score) ────────────

type MarketRef = { p25: number; median: number; sellMedian: number; n: number; basis: 'config' | 'línea+chip' }

function buildMarketRefs(listings: ElecListingDTO[], minSample: number): Map<string, MarketRef> {
  const byConfig = new Map<string, ElecListingDTO[]>()
  const byLineChip = new Map<string, ElecListingDTO[]>()
  for (const l of listings) {
    if (!isPriceUsable(l)) continue
    if (l.configKey && !l.configKey.includes('?')) byConfig.set(l.configKey, [...(byConfig.get(l.configKey) ?? []), l])
    if (l.line && l.chip) {
      const k = `${l.line}|${l.chip}`
      byLineChip.set(k, [...(byLineChip.get(k) ?? []), l])
    }
  }
  const refs = new Map<string, MarketRef>()
  for (const l of listings) {
    let group: ElecListingDTO[] = []
    let basis: MarketRef['basis'] = 'config'
    if (l.configKey && !l.configKey.includes('?')) group = (byConfig.get(l.configKey) ?? []).filter((x) => x.id !== l.id)
    if (group.length < minSample && l.line && l.chip) {
      group = (byLineChip.get(`${l.line}|${l.chip}`) ?? []).filter((x) => x.id !== l.id)
      basis = 'línea+chip'
    }
    if (group.length < minSample) continue
    const prices = cleanPrices(group.map((g) => g.price!))
    const sell = cleanPrices(group.filter((g) => g.zoneKind === 'VENTA').map((g) => g.price!))
    const median = percentile(prices, 0.5)!
    refs.set(l.id, {
      p25: percentile(prices, 0.25)!,
      median,
      sellMedian: sell.length >= 2 ? percentile(sell, 0.5)! : median,
      n: prices.length,
      basis,
    })
  }
  return refs
}

/** Oferta que deja ≥ $2,500 contra la mediana de venta (redondeada a $500). */
function suggestOffer(l: ElecListingDTO, ref: MarketRef | undefined) {
  if (!ref || !l.price) return null
  const target = Math.floor((ref.sellMedian - 2500) / 500) * 500
  const offer = Math.min(l.price, target)
  if (offer <= 0) return null
  return { offer, margin: ref.sellMedian - offer }
}

function sellerMessage(l: ElecListingDTO, offer: number | null) {
  const what = l.line && l.chip ? `MacBook ${configShort(l).replace(/ · \?/g, '')}` : l.title
  const base = `¡Hola! ¿Sigue disponible tu ${what}?`
  if (!offer || !l.price || offer >= l.price) return `${base} Me interesa, ¿podemos vernos hoy en una plaza? Pago en efectivo.`
  return `${base} Me interesa. ¿Aceptarías ${money(offer)} en efectivo? Puedo verte hoy en una plaza comercial.`
}

// ── Alertas (mismo patrón que Upwork) ────────────────────────────────────────

let audioCtx: AudioContext | null = null
function unlockAlertAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctx) audioCtx = new Ctx()
  }
  audioCtx?.resume().catch(() => {})
}
function playAlertChime(elite: boolean) {
  if (!audioCtx) return
  const now = audioCtx.currentTime
  const notes = elite ? [880, 1174.66, 1567.98] : [880, 1318.51]
  notes.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator()
    const gain = audioCtx!.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = now + i * 0.11
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)
    osc.connect(gain)
    gain.connect(audioCtx!.destination)
    osc.start(start)
    osc.stop(start + 0.45)
  })
}

function notifyListing(l: ElecListingDTO) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const n = new Notification(`💻 Score ${l.opportunityScore}/10 — ${money(l.price)}`, {
    body: `${l.title}\n${l.locationText ?? ''}`,
    tag: l.externalId,
  })
  n.onclick = () => { window.open(l.url, '_blank'); n.close() }
}

function AlertToastCard({ l, onClose }: { l: ElecListingDTO; onClose: () => void }) {
  return (
    <div role='alert' className='relative flex w-full items-start gap-3 rounded-lg border border-l-4 border-l-green-500 bg-background px-4 py-3 pr-7 shadow-xl animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300'>
      <button type='button' onClick={onClose} aria-label='Cerrar' className='absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground'>
        <X className='h-3.5 w-3.5' />
      </button>
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full', 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400')}>
        <Bell className='h-4 w-4' />
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='text-[10px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400'>💻 Oportunidad</span>
          <ScoreBadge score={l.opportunityScore} />
        </div>
        <div className='mt-0.5 truncate text-sm font-medium'>{l.title}</div>
        <div className='truncate text-xs text-muted-foreground'>{money(l.price)} · {l.locationText ?? '—'}</div>
      </div>
      <button type='button' onClick={() => window.open(l.url, '_blank')} className='shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90'>
        Abrir
      </button>
    </div>
  )
}

// ── Export ───────────────────────────────────────────────────────────────────

function exportRow(l: ElecListingDTO, ref?: MarketRef) {
  return {
    titulo: l.title,
    url: l.url,
    fuente: l.sourceName,
    precio: l.price,
    precioAnterior: l.originalPrice,
    config: configShort(l),
    linea: l.line, chip: l.chip, ramGb: l.ramGb, ssdGb: l.ssdGb, anio: l.year,
    bateriaSalud: l.batteryHealth, ciclos: l.batteryCycles,
    condicion: l.condition,
    flags: Object.entries(l.flags).filter(([, v]) => v).map(([k]) => k).join(','),
    ubicacion: l.locationText, zona: l.zoneName ?? l.zoneKind,
    score: l.opportunityScore,
    razones: l.scoreReasons.map((r) => `${r.pts > 0 ? '+' : ''}${r.pts} ${r.why}`).join(' | '),
    mercadoP25: ref?.p25 ?? null, mercadoMediana: ref?.median ?? null, mercadoVentaMediana: ref?.sellMedian ?? null, mercadoN: ref?.n ?? null,
    estado: l.status, diasEnMercado: l.daysOnMarket,
    primeraVez: l.firstSeenAt, ultimaVez: l.lastSeenAt,
    confianzaParser: l.parseConfidence,
    descripcion: l.description,
  }
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

// ── Filtros ──────────────────────────────────────────────────────────────────

type Filters = {
  q: string
  scoreMin: number
  line: string
  chip: string
  ram: string
  ssd: string
  zone: string // COMPRA | VENTA | OTRA
  source: string // MARKETPLACE | FB_GROUP
  priceMin: string
  priceMax: string
  maxAgeDays: string
  status: string // ACTIVO | DESAPARECIDO | COMPRADO | ''
  review: boolean
  configKey: string // viene de la tabla de precios
}

const FILTERS_KEY = 'elec-listings-filters'
const FILTERS_DEFAULT: Filters = {
  q: '', scoreMin: 0, line: '', chip: '', ram: '', ssd: '', zone: '', source: '',
  priceMin: '', priceMax: '', maxAgeDays: '', status: 'ACTIVO', review: false, configKey: '',
}

function loadStoredFilters(): Filters {
  if (typeof window === 'undefined') return FILTERS_DEFAULT
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY)
    return raw ? { ...FILTERS_DEFAULT, ...(JSON.parse(raw) as Partial<Filters>) } : FILTERS_DEFAULT
  } catch { return FILTERS_DEFAULT }
}

const sel = 'border rounded-md px-2 py-2 text-sm bg-background h-9'

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ElecListingsTable({
  listings, setListings, minScoreAlert, onMinScoreAlertChange, minSample, configFilter, onClearConfigFilter, onRegisterTrade,
}: {
  listings: ElecListingDTO[]
  setListings: (fn: (prev: ElecListingDTO[]) => ElecListingDTO[]) => void
  minScoreAlert: number
  onMinScoreAlertChange: (v: number) => void
  minSample: number
  configFilter: string | null
  onClearConfigFilter: () => void
  onRegisterTrade: (l: ElecListingDTO) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'opportunityScore', desc: true }])
  const [filters, setFilters] = useState<Filters>(loadStoredFilters)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const [purging, setPurging] = useState(false)
  const [editing, setEditing] = useState<ElecListingDTO | null>(null)

  useEffect(() => { window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters)) }, [filters])
  useEffect(() => {
    if (configFilter) setFilters((f) => ({ ...f, configKey: configFilter, status: '' }))
  }, [configFilter])

  const refs = useMemo(() => buildMarketRefs(listings, minSample), [listings, minSample])

  // ── Notificaciones + polling ─────────────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    window.addEventListener('pointerdown', unlockAlertAudio, { once: true })
    window.addEventListener('keydown', unlockAlertAudio, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlockAlertAudio)
      window.removeEventListener('keydown', unlockAlertAudio)
    }
  }, [])

  const minScoreRef = useRef(minScoreAlert)
  minScoreRef.current = minScoreAlert
  const cursorRef = useRef(new Date().toISOString())
  const knownIds = useRef(new Set(listings.map((l) => l.id)))

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const since = cursorRef.current
        cursorRef.current = new Date().toISOString()
        const res = await fetch(`/api/electronicos/listings?since=${encodeURIComponent(since)}`)
        if (!res.ok) return
        const { data } = (await res.json()) as { data: ElecListingDTO[] }
        if (!data.length) return
        setListings((prev) => {
          const byId = new Map(prev.map((l) => [l.id, l]))
          for (const l of data) byId.set(l.id, l)
          return Array.from(byId.values())
        })
        const fresh = data.filter((l) => !knownIds.current.has(l.id))
        fresh.forEach((l) => knownIds.current.add(l.id))
        for (const l of fresh.filter((x) => (x.opportunityScore ?? 0) >= minScoreRef.current).slice(0, 5)) {
          const elite = (l.opportunityScore ?? 0) >= 9
          notifyListing(l)
          playAlertChime(elite)
          toast.custom((t) => <AlertToastCard l={l} onClose={() => toast.dismiss(t)} />, { duration: elite ? Infinity : 10000 })
        }
      } catch { /* reintenta en el próximo tick */ }
    }, 20000)
    return () => clearInterval(interval)
  }, [setListings])

  const reload = useCallback(async () => {
    const res = await fetch('/api/electronicos/listings')
    if (res.ok) {
      const { data } = await res.json()
      setListings(() => data)
    }
  }, [setListings])

  const handleRecalcular = async () => {
    setRecalculating(true)
    try {
      const res = await fetch('/api/electronicos/recalcular', { method: 'POST' })
      if (!res.ok) throw new Error()
      const d = await res.json()
      toast.success(`${d.reparsed} re-parseados · ${d.scored} scores · ${d.disappeared} desaparecidos${d.removed ? ` · ${d.removed} descartados` : ''}`)
      await reload()
    } catch {
      toast.error('Error al recalcular')
    } finally {
      setRecalculating(false)
    }
  }

  const handlePurgar = async () => {
    const keep = listings.filter((l) => l.comprado).length
    if (!confirm(`¿Borrar ${listings.length - keep} listings capturados${keep ? ` (se conservan ${keep} comprados)` : ''}? No se puede deshacer.`)) return
    setPurging(true)
    try {
      const res = await fetch('/api/electronicos/listings', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      const d = await res.json()
      toast.success(`${d.deleted} borrados${d.kept ? ` — ${d.kept} conservados` : ''}`)
      await reload()
    } catch {
      toast.error('Error al limpiar')
    } finally {
      setPurging(false)
    }
  }

  const patch = async (l: ElecListingDTO, body: Record<string, unknown>, optimistic: Partial<ElecListingDTO>) => {
    setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, ...optimistic } : x)))
    try {
      const res = await fetch(`/api/electronicos/listings/${l.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setListings((prev) => prev.map((x) => (x.id === l.id ? updated : x)))
    } catch {
      setListings((prev) => prev.map((x) => (x.id === l.id ? l : x)))
      toast.error('No se pudo guardar')
    }
  }

  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(msg) } catch { toast.error('No se pudo copiar') }
  }

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => listings.filter((l) => {
    if (filters.q) {
      const q = filters.q.toLowerCase()
      if (!l.title.toLowerCase().includes(q) && !(l.description ?? '').toLowerCase().includes(q)) return false
    }
    if (filters.configKey && l.configKey !== filters.configKey) return false
    if (filters.scoreMin > 0 && (l.opportunityScore ?? -1) < filters.scoreMin) return false
    if (filters.line && l.line !== filters.line) return false
    if (filters.chip && l.chip !== filters.chip) return false
    if (filters.ram && String(l.ramGb) !== filters.ram) return false
    if (filters.ssd && String(l.ssdGb) !== filters.ssd) return false
    if (filters.zone && l.zoneKind !== filters.zone) return false
    if (filters.source && l.source !== filters.source) return false
    if (filters.priceMin && (l.price ?? 0) < Number(filters.priceMin)) return false
    if (filters.priceMax && (l.price ?? Infinity) > Number(filters.priceMax)) return false
    if (filters.maxAgeDays && (daysAgo(l.postedAt ?? l.firstSeenAt) ?? 0) > Number(filters.maxAgeDays)) return false
    if (filters.status === 'COMPRADO' ? !l.comprado : filters.status && l.status !== filters.status) return false
    if (filters.review && !l.needsReview) return false
    return true
  }), [listings, filters])

  const reviewCount = useMemo(() => listings.filter((l) => l.needsReview && l.status === 'ACTIVO').length, [listings])
  const chips = Array.from(new Set(CATALOG.flatMap((e) => e.chips)))
  const hasFilters = JSON.stringify({ ...filters }) !== JSON.stringify(FILTERS_DEFAULT)

  // ── Columnas ─────────────────────────────────────────────────────────────
  const columns: ColumnDef<ElecListingDTO>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <button onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === row.original.id ? null : row.original.id) }} className='p-1 text-muted-foreground hover:text-foreground'>
          {expandedId === row.original.id ? <ChevronDown className='h-3.5 w-3.5' /> : <ChevronRight className='h-3.5 w-3.5' />}
        </button>
      ),
    },
    {
      accessorKey: 'opportunityScore',
      header: 'Score',
      sortingFn: (a, b) => (a.original.opportunityScore ?? -1) - (b.original.opportunityScore ?? -1),
      cell: ({ row }) => <ScoreBadge score={row.original.opportunityScore} />,
    },
    {
      accessorKey: 'title',
      header: 'Listing',
      cell: ({ row }) => {
        const l = row.original
        return (
          <div className='flex items-center gap-3 max-w-[420px]'>
            {l.imageUrl
              ? <img src={l.imageUrl} alt='' referrerPolicy='no-referrer' className='h-10 w-10 rounded object-cover shrink-0 bg-muted' />
              : <div className='h-10 w-10 rounded bg-muted shrink-0' />}
            <div className='min-w-0'>
              <div className='font-medium text-sm truncate'>{l.title}</div>
              <div className='text-xs text-muted-foreground truncate flex items-center gap-1'>
                {l.needsReview && <AlertTriangle className='h-3 w-3 text-amber-500 shrink-0' />}
                {configShort(l)}
                {l.batteryHealth ? ` · 🔋${l.batteryHealth}%` : ''}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'price',
      header: 'Precio',
      sortingFn: (a, b) => (a.original.price ?? 0) - (b.original.price ?? 0),
      cell: ({ row }) => {
        const l = row.original
        const ref = refs.get(l.id)
        const delta = ref && l.price ? (l.price - ref.median) / ref.median : null
        return (
          <div className='whitespace-nowrap'>
            <div className='font-medium'>{money(l.price)}</div>
            <div className='text-xs'>
              {l.originalPrice && <span className='text-muted-foreground line-through mr-1'>{money(l.originalPrice)}</span>}
              {delta != null && (
                <span className={delta <= -0.1 ? 'text-green-600 dark:text-green-400' : delta >= 0.1 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'} title={`Mediana ${money(ref!.median)} (${ref!.basis}, n=${ref!.n})`}>
                  {delta > 0 ? '+' : ''}{Math.round(delta * 100)}% vs mercado
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: 'zone',
      accessorFn: (l) => l.zoneKind,
      header: 'Zona',
      cell: ({ row }) => (
        <div className='space-y-0.5'>
          <ZoneBadge kind={row.original.zoneKind} name={row.original.zoneName} />
          <div className='text-xs text-muted-foreground truncate max-w-[140px]'>{row.original.locationText ?? '—'}</div>
        </div>
      ),
    },
    {
      id: 'age',
      accessorFn: (l) => daysAgo(l.postedAt ?? l.firstSeenAt),
      header: 'Antigüedad',
      cell: ({ row }) => {
        const l = row.original
        return (
          <div className='text-xs text-muted-foreground whitespace-nowrap' title={`Visto por primera vez ${new Date(l.firstSeenAt).toLocaleString('es-MX')}`}>
            {formatDays(daysAgo(l.postedAt ?? l.firstSeenAt))}
            {l.status === 'DESAPARECIDO' && <div className='text-amber-600 dark:text-amber-400'>{l.soldConfirmed ? 'vendido' : 'desapareció'} · {formatDays(l.daysOnMarket)}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: 'source',
      header: 'Fuente',
      cell: ({ row }) => (
        <span className='text-xs text-muted-foreground truncate max-w-[120px] inline-block' title={row.original.sourceName}>
          {row.original.source === 'MARKETPLACE' ? 'Marketplace' : row.original.sourceName}
        </span>
      ),
    },
    {
      accessorKey: 'comprado',
      header: 'Comprado',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch checked={row.original.comprado} onChange={(v) => patch(row.original, { comprado: v }, { comprado: v })} />
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const l = row.original
        const btn = 'p-1.5 rounded hover:bg-muted inline-flex items-center text-muted-foreground hover:text-foreground transition-colors'
        return (
          <div className='flex items-center gap-0.5' onClick={(e) => e.stopPropagation()}>
            <button type='button' className={btn} title='Corregir specs' onClick={() => setEditing(l)}><Pencil className='h-3.5 w-3.5' /></button>
            <button type='button' className={btn} title='Copiar para Claude' onClick={() => copy(JSON.stringify(exportRow(l, refs.get(l.id)), null, 2), 'Listing copiado')}><Copy className='h-3.5 w-3.5' /></button>
            <a href={l.url} target='_blank' rel='noopener noreferrer' className={btn} title='Abrir publicación'><ExternalLink className='h-3.5 w-3.5' /></a>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  const set = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }))

  return (
    <div className='space-y-4'>
      {/* Barra de filtros */}
      <div className='flex flex-wrap gap-2 items-end'>
        <div className='flex items-center gap-1.5 px-2.5 h-9 rounded-md border bg-accent/40' title='Se guarda solo'>
          <Bell className='h-3.5 w-3.5 text-muted-foreground' />
          <span className='text-sm text-muted-foreground whitespace-nowrap'>Alertarme si score ≥</span>
          <Input type='number' min={0} max={10} value={minScoreAlert} onChange={(e) => onMinScoreAlertChange(Number(e.target.value))} className='w-14 h-7 border-0 bg-transparent px-1 text-center' />
        </div>
        <Input placeholder='Buscar título o descripción...' value={filters.q} onChange={(e) => set({ q: e.target.value })} className='w-52' />
        <select value={filters.scoreMin} onChange={(e) => set({ scoreMin: Number(e.target.value) })} className={cn(sel, 'w-28')}>
          <option value={0}>Score: todos</option>
          {[4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>Score ≥ {n}</option>)}
        </select>
        <select value={filters.line} onChange={(e) => set({ line: e.target.value })} className={sel}>
          <option value=''>Modelo</option>
          {LINES.map((l) => <option key={l} value={l}>{LINE_LABEL[l]}</option>)}
        </select>
        <select value={filters.chip} onChange={(e) => set({ chip: e.target.value })} className={sel}>
          <option value=''>Chip</option>
          {chips.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.ram} onChange={(e) => set({ ram: e.target.value })} className={sel}>
          <option value=''>RAM</option>
          {[8, 16, 18, 24, 32, 36, 48, 64].map((r) => <option key={r} value={r}>{r}GB</option>)}
        </select>
        <select value={filters.ssd} onChange={(e) => set({ ssd: e.target.value })} className={sel}>
          <option value=''>SSD</option>
          {[256, 512, 1024, 2048, 4096].map((s) => <option key={s} value={s}>{formatSsd(s)}</option>)}
        </select>
        <select value={filters.zone} onChange={(e) => set({ zone: e.target.value })} className={sel}>
          <option value=''>Zona</option>
          <option value='COMPRA'>Compra</option>
          <option value='VENTA'>Venta</option>
          <option value='OTRA'>Otra</option>
        </select>
        <select value={filters.source} onChange={(e) => set({ source: e.target.value })} className={sel}>
          <option value=''>Fuente</option>
          <option value='MARKETPLACE'>Marketplace</option>
          <option value='FB_GROUP'>Grupos</option>
        </select>
        <div className='flex items-center gap-1'>
          <Input type='number' placeholder='$ min' value={filters.priceMin} onChange={(e) => set({ priceMin: e.target.value })} className='w-24' />
          <span className='text-muted-foreground text-sm'>–</span>
          <Input type='number' placeholder='$ máx' value={filters.priceMax} onChange={(e) => set({ priceMax: e.target.value })} className='w-24' />
        </div>
        <select value={filters.maxAgeDays} onChange={(e) => set({ maxAgeDays: e.target.value })} className={sel}>
          <option value=''>Antigüedad</option>
          {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>≤ {d}d</option>)}
        </select>
        <select value={filters.status} onChange={(e) => set({ status: e.target.value })} className={sel}>
          <option value=''>Estado: todos</option>
          <option value='ACTIVO'>Activos</option>
          <option value='DESAPARECIDO'>Desaparecidos</option>
          <option value='COMPRADO'>Comprados</option>
        </select>
        <Button variant={filters.review ? 'default' : 'outline'} size='sm' onClick={() => set({ review: !filters.review })} title='Listings con specs dudosos — corrígelos con el lápiz'>
          <AlertTriangle className='h-3.5 w-3.5 mr-1.5' />
          Revisar ({reviewCount})
        </Button>
        {hasFilters && (
          <Button variant='ghost' size='sm' onClick={() => { setFilters(FILTERS_DEFAULT); onClearConfigFilter() }}>Limpiar</Button>
        )}
        <div className='ml-auto flex gap-2'>
          <Button variant='outline' size='sm' onClick={handleRecalcular} disabled={recalculating} title='Re-parsea specs, reasigna zonas, detecta desaparecidos y recalcula scores'>
            {recalculating ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5 mr-1.5' />}
            Recalcular scores
          </Button>
          <Button variant='outline' size='sm' onClick={handlePurgar} disabled={purging} className='text-destructive hover:text-destructive' title='Borra lo capturado (conserva comprados y trades)'>
            {purging ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <Trash2 className='h-3.5 w-3.5 mr-1.5' />}
            Limpiar guardados
          </Button>
        </div>
      </div>

      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='text-sm text-muted-foreground'>
          {filtered.length} listing{filtered.length !== 1 ? 's' : ''}{filtered.length !== listings.length && ` de ${listings.length}`}
          {filters.configKey && (
            <span className='ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs'>
              {configShort({ line: filters.configKey.split('|')[0], chip: filters.configKey.split('|')[1], ramGb: Number(filters.configKey.split('|')[2]) || null, ssdGb: Number(filters.configKey.split('|')[3]) || null })}
              <button onClick={() => { set({ configKey: '' }); onClearConfigFilter() }} className='hover:text-foreground'>✕</button>
            </span>
          )}
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' disabled={!filtered.length} onClick={() => {
            downloadFile(JSON.stringify({ generado: new Date().toISOString(), listings: filtered.map((l) => exportRow(l, refs.get(l.id))) }, null, 2), `macbooks-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
            toast.success(`${filtered.length} listings descargados — pégaselos a Claude`)
          }}>
            <Download className='h-3.5 w-3.5 mr-1.5' />
            Descargar {filtered.length || ''} para Claude
          </Button>
          <Button variant='outline' size='sm' disabled={!filtered.length} onClick={() => downloadFile(toCsv(filtered.map((l) => exportRow(l, refs.get(l.id)))), `macbooks-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')}>
            CSV
          </Button>
        </div>
      </div>

      <div className='rounded-md border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className='border-b bg-muted/50'>
                {hg.headers.map((header) => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()} className='px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap'>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className='px-4 py-12 text-center text-muted-foreground'>
                  {listings.length ? 'No hay listings con esos filtros' : 'Aún no hay capturas — abre Marketplace con la extensión activa y scrollea una búsqueda de MacBook'}
                </td>
              </tr>
            ) : table.getRowModel().rows.map((row) => {
              const l = row.original
              const ref = refs.get(l.id)
              const offer = suggestOffer(l, ref)
              const tier = l.opportunityScore != null ? scoreTier(l.opportunityScore) : 'low'
              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                    className={cn('border-b hover:bg-muted/30 transition-colors cursor-pointer', l.status === 'DESAPARECIDO' && 'opacity-60', tier === 'elite' && 'bg-blue-50/40 dark:bg-blue-950/10')}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className='px-4 py-3'>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                  {expandedId === l.id && (
                    <tr className='border-b bg-muted/20'>
                      <td colSpan={columns.length} className='px-4 py-3 space-y-3'>
                        <div className='grid gap-3 md:grid-cols-3'>
                          <div className='space-y-1 text-xs'>
                            <div className='font-medium text-muted-foreground'>Mercado ({ref ? `${ref.basis}, n=${ref.n}` : 'poca data'})</div>
                            {ref ? (
                              <div>P25 {money(ref.p25)} · mediana {money(ref.median)} · venta {money(ref.sellMedian)}</div>
                            ) : <div className='text-muted-foreground'>Se necesitan ≥{minSample} listings comparables</div>}
                            {offer && (
                              <div className='text-green-700 dark:text-green-400'>Oferta sugerida {money(offer.offer)} → margen {money(offer.margin)}</div>
                            )}
                          </div>
                          <div className='space-y-1 text-xs'>
                            <div className='font-medium text-muted-foreground'>Specs</div>
                            <div>{configShort(l)}{l.year ? ` · ${l.year}` : ''}{l.color ? ` · ${l.color}` : ''}</div>
                            <div>
                              {l.batteryHealth ? `Batería ${l.batteryHealth}%` : ''}{l.batteryCycles != null ? ` · ${l.batteryCycles} ciclos` : ''}
                              {l.condition ? ` · ${l.condition}` : ''}
                            </div>
                            <div className='flex flex-wrap gap-1'>
                              {Object.entries(l.flags).filter(([, v]) => v).map(([k]) => (
                                <span key={k} className='px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>{k}</span>
                              ))}
                            </div>
                            <div className='text-muted-foreground'>Confianza parser {Math.round(l.parseConfidence * 100)}%{l.specsManual ? ' (manual)' : ''}{l.parseNotes ? ` — ${l.parseNotes}` : ''}</div>
                          </div>
                          <div className='flex flex-wrap gap-2 items-start md:justify-end'>
                            <Button size='sm' variant='outline' onClick={() => copy(sellerMessage(l, offer?.offer ?? null), 'Mensaje copiado — pégalo en Messenger')}>
                              <MessageSquare className='h-3.5 w-3.5 mr-1.5' /> Mensaje al vendedor
                            </Button>
                            <Button size='sm' variant='outline' onClick={() => onRegisterTrade(l)}>
                              <ShoppingCart className='h-3.5 w-3.5 mr-1.5' /> Registrar compra
                            </Button>
                            <Button size='sm' variant='ghost' onClick={() => patch(l, { status: l.status === 'ACTIVO' ? 'DESAPARECIDO' : 'ACTIVO' }, { status: l.status === 'ACTIVO' ? 'DESAPARECIDO' : 'ACTIVO' })}>
                              Marcar {l.status === 'ACTIVO' ? 'desaparecido' : 'activo'}
                            </Button>
                          </div>
                        </div>
                        {l.scoreReasons.length > 0 && (
                          <div className='flex flex-wrap gap-1.5'>
                            {l.scoreReasons.map((r, i) => (
                              <span key={i} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                                r.pts > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : r.pts < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-muted text-muted-foreground')}>
                                {r.pts !== 0 && `${r.pts > 0 ? '+' : ''}${r.pts} `}{r.why}
                              </span>
                            ))}
                          </div>
                        )}
                        {l.description && <p className='text-sm whitespace-pre-line text-muted-foreground max-h-48 overflow-y-auto'>{l.description}</p>}
                        {l.sellerName && <p className='text-xs text-muted-foreground'>Vendedor: {l.sellerName}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>Página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}</p>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <Button variant='outline' size='sm' onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>
      </div>

      <SpecsEditorDialog
        listing={editing}
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null) }}
        onSaved={(u) => setListings((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
      />
    </div>
  )
}
