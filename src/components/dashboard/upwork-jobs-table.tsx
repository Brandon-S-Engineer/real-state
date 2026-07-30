'use client'

import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState, type ColumnFiltersState,
} from '@tanstack/react-table'
import { Fragment, useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ExternalLink, RefreshCw, Loader2, ChevronDown, ChevronRight, Bell, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type UpworkJob = {
  id: string
  uid: string
  url: string
  title: string
  description: string | null
  skills: string[]
  budget: string | null
  proposals: number | null
  proposalText: string | null
  spentText: string | null
  postedText: string | null
  postedHours: number | null
  initialPostedHours: number | null
  score: number | null
  reasons: { pts: number; why: string }[]
  ganado: boolean
  ganadoAt: string | null
  firstSeenAt: string
  lastSeenAt: string
  createdAt: string
}

function notifyJob(job: UpworkJob) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const n = new Notification(`🎯 Score ${job.score}/10 — Upwork`, {
    body: job.title + (job.budget ? `\n${job.budget}` : ''),
    tag: job.uid,     // evita duplicados si el mismo job llega dos veces
  })
  n.onclick = () => {
    window.open(job.url, '_blank')
    n.close()
  }
}

// ── Sonido de alerta ─────────────────────────────────────────────────────
// Campanita de dos notas sintetizada con Web Audio API — sin archivo de
// audio que mantener. Los navegadores bloquean el audio hasta que hay un
// gesto del usuario en la página, por eso el AudioContext se crea/desbloquea
// en la primera interacción (ver efecto en el componente principal).
let audioCtx: AudioContext | null = null

function unlockAlertAudio() {
  if (typeof window === 'undefined') return
  if (!audioCtx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctx) audioCtx = new Ctx()
  }
  audioCtx?.resume().catch(() => {})
}

function playAlertChime(elite: boolean) {
  if (!audioCtx) return
  const now = audioCtx.currentTime
  const notes = elite ? [880, 1174.66, 1567.98] : [880, 1318.51] // elite: 3 notas ascendentes, normal: 2
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

// ── Toast de alerta ───────────────────────────────────────────────────────
// Tarjeta grande y con color por tier — reemplaza el toast.success genérico
// (una línea gris que se pierde entre el resto) por algo que de verdad se
// note: ícono con pulso, badge "NUEVO MATCH" y borde de color según score.
const TIER_BORDER: Record<string, string> = {
  elite: 'border-l-blue-500',
  high: 'border-l-green-500',
  mid: 'border-l-yellow-500',
  low: 'border-l-muted-foreground',
}

function AlertToastCard({ job }: { job: UpworkJob }) {
  const tier = scoreTier(job.score ?? 0)
  return (
    <div
      role='alert'
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border border-l-4 bg-background px-4 py-3 shadow-xl',
        'animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300',
        TIER_BORDER[tier],
      )}
    >
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full', SCORE_CLASS[tier])}>
        <Bell className='h-4 w-4' />
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400'>
            🎯 Nuevo match
          </span>
          <ScoreBadge score={job.score} />
        </div>
        <div className='mt-0.5 truncate text-sm font-medium'>{job.title}</div>
        {job.budget && <div className='truncate text-xs text-muted-foreground'>{job.budget}</div>}
      </div>
      <button
        type='button'
        onClick={() => window.open(job.url, '_blank')}
        className='shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90'
      >
        Abrir
      </button>
    </div>
  )
}

// Arma un bloque de texto con todo lo necesario para juzgar si aplicar o no
// (título, presupuesto, propuestas, historial del cliente, score + razones,
// skills y descripción completa). Compartido entre la copia de un solo job
// y la copia masiva de todos los filtrados.
function formatJobBody(job: UpworkJob): string {
  const clean = (s: string | null, re: RegExp) => (s || '').replace(re, '').trim()
  const lines = [
    `Título: ${job.title}`,
    `Score del sistema: ${job.score ?? '—'}/10`,
    `Presupuesto: ${job.budget || 'no especificado'}`,
    `Propuestas: ${clean(job.proposalText, /proposals?:\s*/i) || (job.proposals != null ? String(job.proposals) : '—')}`,
    `Historial del cliente (gastado): ${clean(job.spentText, /spent:?\s*/i) || '—'}`,
    `Publicado: ${clean(job.postedText, /posted:?\s*/i) || '—'}`,
    `Skills: ${job.skills.length ? job.skills.join(', ') : '—'}`,
    `URL: ${job.url}`,
  ]

  if (job.reasons?.length) {
    lines.push('', 'Desglose del score:')
    for (const r of job.reasons) {
      const sign = r.pts >= 0 ? `+${r.pts}` : `${r.pts}`
      lines.push(`  ${sign}\t${r.why}`)
    }
  }

  lines.push('', 'Descripción:', job.description?.trim() || '(sin descripción)')
  return lines.join('\n')
}

function formatJobForReview(job: UpworkJob): string {
  return ['¿APLICAR A ESTE JOB DE UPWORK? Dame tu veredicto (sí / no) y por qué.', '', formatJobBody(job)].join('\n')
}

// Igual que formatJobForReview pero para varios jobs a la vez — una sola
// pregunta arriba y cada job numerado y separado, para pegarle a Claude la
// tanda completa (p.ej. "estos son los 9 con score ≥8 de las últimas 2h").
function formatJobsForBulkReview(jobs: UpworkJob[]): string {
  const intro = [
    `¿A CUÁLES DE ESTOS ${jobs.length} JOBS DE UPWORK APLICO?`,
    'Para cada uno dame tu veredicto (sí / no) y por qué. Al final decime cuál es tu top pick si hay alguno.',
  ].join('\n')

  const blocks = jobs.map((job, i) => `${'─'.repeat(60)}\nJOB ${i + 1}/${jobs.length}\n${'─'.repeat(60)}\n${formatJobBody(job)}`)

  return [intro, ...blocks].join('\n\n')
}

function downloadTextFile(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function copyJobForReview(job: UpworkJob) {
  const text = formatJobForReview(job)
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Job copiado — pégamelo para el veredicto')
  } catch {
    toast.error('No se pudo copiar al portapapeles')
  }
}

function downloadJobsForBulkReview(jobs: UpworkJob[]) {
  if (!jobs.length) {
    toast.error('No hay jobs con estos filtros')
    return
  }
  const text = formatJobsForBulkReview(jobs)
  downloadTextFile(text, `upwork-jobs-${new Date().toISOString().slice(0, 10)}.txt`)
  toast.success(`${jobs.length} job${jobs.length !== 1 ? 's' : ''} descargados — pégaselo a Claude`)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreTier(s: number) { return s >= 9 ? 'elite' : s >= 7 ? 'high' : s >= 4 ? 'mid' : 'low' }
function propTier(p: number) { return p <= 4 ? 'fire' : p <= 9 ? 'bolt' : 'crowd' }

const SCORE_CLASS: Record<string, string> = {
  elite: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  mid:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low:   'bg-muted text-muted-foreground',
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className='text-muted-foreground text-xs'>—</span>
  const tier = scoreTier(score)
  return (
    <span className={cn('inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-xs font-medium', SCORE_CLASS[tier])}>
      {score}/10
    </span>
  )
}

function ProposalsBadge({ job }: { job: UpworkJob }) {
  const p = job.proposals ?? 99
  const tier = propTier(p)
  const cleaned = (job.proposalText || '').replace(/proposals?:\s*/i, '').trim()
  const label = tier === 'fire' ? '<5 props' : tier === 'bolt' ? (cleaned || '5–9') : (cleaned || 'muchas')
  const cls = tier === 'fire'
    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    : tier === 'bolt'
      ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
      : 'bg-muted text-muted-foreground'
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', cls)}>{label}</span>
}

// Para "Publicado", postedHours ascendente = más reciente primero (menos
// horas = más nuevo). Visualmente eso se siente como "↓ = lo más reciente
// arriba", al revés del mapeo genérico asc→↑/desc→↓ que usan las demás
// columnas numéricas — por eso esta columna invierte la flecha.
function sortArrow(columnId: string, sorted: false | 'asc' | 'desc'): string {
  if (!sorted) return ''
  if (columnId === 'postedHours') return sorted === 'asc' ? ' ↓' : ' ↑'
  return sorted === 'asc' ? ' ↑' : ' ↓'
}

// La edad real = tiempo transcurrido desde que NOSOTROS vimos el job por
// primera vez + la antigüedad que Upwork ya reportaba en ese momento
// (initialPostedHours, fijada una sola vez al crear el registro). Ninguna
// de las dos partes solas basta: confiar solo en postedText se congela si el
// job se cae de los resultados ("hace 1h" para siempre en un job de 3 días);
// confiar solo en "tiempo desde firstSeenAt" ignora que el job ya podía tener
// horas/días de publicado la primera vez que lo capturamos (mostraría "ahora"
// para un job que ya llevaba 5h cuando lo vimos).
function trueAgeHours(j: { firstSeenAt: string; initialPostedHours: number | null }): number {
  const elapsedSinceCapture = (Date.now() - new Date(j.firstSeenAt).getTime()) / 3_600_000
  return elapsedSinceCapture + (j.initialPostedHours ?? 0)
}

function formatAge(hours: number): string {
  if (hours < 1 / 60) return 'ahora'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

// ── Descripción: formato + keywords destacadas ──────────────────────────────
// content.js manda la descripción como un solo bloque de texto plano (Upwork
// ya la entrega así en el tile de búsqueda, sin <strong>/<li> reales) — por
// eso aquí reconstruimos estructura con heurísticas de texto: títulos en
// "**negrita**", subtítulos tipo "Label: resto de la oración" y bullets
// " - Algo" se separan en bloques. No es un parser de markdown real, es
// best-effort para que se pueda leer de un vistazo.

type DescBlock = { type: 'heading'; text: string } | { type: 'list'; items: string[] } | { type: 'p'; text: string }

function structureDescription(raw: string): DescBlock[] {
  let t = raw.replace(/\*\*(.+?)\*\*/g, '\n\nH::$1\n')
  t = t.replace(/[.:]\s+([A-Z][A-Za-z&/ ]{2,40}):\s+/g, (_m, label: string) => `.\n\nH::${label}\n`)
  t = t.replace(/ - (?=[A-Z])/g, '\n- ')

  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const blocks: DescBlock[] = []
  let listBuffer: string[] = []
  const flushList = () => {
    if (listBuffer.length) { blocks.push({ type: 'list', items: listBuffer }); listBuffer = [] }
  }

  for (const line of lines) {
    if (line.startsWith('H::')) {
      flushList()
      blocks.push({ type: 'heading', text: line.slice(3) })
    } else if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
    } else {
      flushList()
      blocks.push({ type: 'p', text: line })
    }
  }
  flushList()
  return blocks
}

// Mismas señales que ya usa scoreUpworkJob (src/lib/upwork-score.ts) — verde
// para tu stack/nicho bueno, azul para IA/automatización, celeste para señales
// visuales (mostrable en gif), rojo para red flags (empleo/largo plazo/vago)
// y stacks fuera del tuyo (mobile nativo, backends en otro lenguaje).
const HIGHLIGHT_RULES: { re: RegExp; cls: string }[] = [
  { re: /\b(next\.?js|react(?!\s*native)|node\.?js|express|tailwind|supabase|firebase|stripe|vercel|prisma|mongodb|postgres|typescript)\b/gi,
    cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { re: /\b(saas|mvp|chatbot|ai[- ]agent|ai[- ]assistant|llm|rag|openai|gpt-?\d*|claude|anthropic|gemini|automation|automate|workflow)\b/gi,
    cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { re: /\b(ui\/ux|front-?end|landing page|dashboard|web ?app|website|figma|mockup|prototype|wireframe|e-?commerce)\b/gi,
    cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  { re: /\b(part-?time|full-?time|retainer|per month|ongoing|long-?term|co-?founder|equity|architect|tech lead|join (?:our|the) team|react native|flutter|swift(?:ui)?|kotlin|xamarin|laravel|django|spring ?boot|ruby on rails)\b/gi,
    cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
]

function highlightKeywords(text: string, keyBase: string): ReactNode[] {
  const matches: { start: number; end: number; cls: string }[] = []
  for (const { re, cls } of HIGHLIGHT_RULES) {
    let m: RegExpExecArray | null
    re.lastIndex = 0
    while ((m = re.exec(text))) matches.push({ start: m.index, end: m.index + m[0].length, cls })
  }
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))

  const kept: typeof matches = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.start >= lastEnd) { kept.push(m); lastEnd = m.end }
  }
  if (kept.length === 0) return [text]

  const nodes: ReactNode[] = []
  let cursor = 0
  kept.forEach((m, i) => {
    if (m.start > cursor) nodes.push(text.slice(cursor, m.start))
    nodes.push(
      <span key={`${keyBase}-${i}`} className={cn('rounded px-0.5', m.cls)}>
        {text.slice(m.start, m.end)}
      </span>,
    )
    cursor = m.end
  })
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function DescriptionView({ text }: { text: string }) {
  const blocks = useMemo(() => structureDescription(text), [text])
  return (
    <div className='text-sm text-muted-foreground space-y-2'>
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <div key={i} className='font-semibold text-foreground text-xs uppercase tracking-wide mt-3 first:mt-0'>
              {highlightKeywords(b.text, `h${i}`)}
            </div>
          )
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className='list-disc pl-4 space-y-1'>
              {b.items.map((item, j) => <li key={j}>{highlightKeywords(item, `l${i}-${j}`)}</li>)}
            </ul>
          )
        }
        return <p key={i}>{highlightKeywords(b.text, `p${i}`)}</p>
      })}
    </div>
  )
}

// ── Filters bar ───────────────────────────────────────────────────────────────

type Filters = {
  q: string
  scoreMin: number // 0 = "Todos" (sin filtro), 1–10 = umbral real
  postedHoursMax: string
  ganado: string // '' | 'true' | 'false'
}

const FILTERS_KEY = 'upwork-filters'
const FILTERS_DEFAULT: Filters = { q: '', scoreMin: 7, postedHoursMax: '', ganado: '' }

function loadStoredFilters(): Filters {
  if (typeof window === 'undefined') return FILTERS_DEFAULT
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY)
    if (!raw) return FILTERS_DEFAULT
    const parsed = JSON.parse(raw) as Partial<Filters>
    return {
      q: typeof parsed.q === 'string' ? parsed.q : FILTERS_DEFAULT.q,
      scoreMin: Number.isFinite(Number(parsed.scoreMin)) ? Math.min(10, Math.max(0, Number(parsed.scoreMin))) : FILTERS_DEFAULT.scoreMin,
      postedHoursMax: typeof parsed.postedHoursMax === 'string' ? parsed.postedHoursMax : FILTERS_DEFAULT.postedHoursMax,
      ganado: typeof parsed.ganado === 'string' ? parsed.ganado : FILTERS_DEFAULT.ganado,
    }
  } catch { return FILTERS_DEFAULT }
}

const AGE_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: '1h',    value: '1' },
  { label: '2h',    value: '2' },
  { label: '4h',    value: '4' },
  { label: '8h',    value: '8' },
  { label: '24h',   value: '24' },
  { label: '2d',    value: '48' },
  { label: '3d',    value: '72' },
  { label: '7d',    value: '168' },
]

function FiltersBar({ filters, onChange, onRecalcular, recalculating, minScoreAlert, onMinScoreAlertChange }: {
  filters: Filters
  onChange: (f: Partial<Filters>) => void
  onRecalcular: () => void
  recalculating: boolean
  minScoreAlert: number
  onMinScoreAlertChange: (v: number) => void
}) {
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className='flex flex-wrap gap-2 items-end'>
      <div className='flex items-center gap-1.5 px-2.5 h-9 rounded-md border bg-accent/40' title='Se guarda solo, sin botón'>
        <Bell className='h-3.5 w-3.5 text-muted-foreground' />
        <span className='text-sm text-muted-foreground whitespace-nowrap'>Alertarme si score ≥</span>
        <Input
          type='number'
          min={0}
          max={10}
          value={minScoreAlert}
          onChange={(e) => onMinScoreAlertChange(Number(e.target.value))}
          className='w-14 h-7 border-0 bg-transparent px-1 text-center'
        />
      </div>

      <Input
        placeholder='Buscar título o descripción...'
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value })}
        className='w-56'
      />

      <div className='flex items-center gap-1'>
        <span className='text-sm text-muted-foreground whitespace-nowrap'>Score ≥</span>
        <select
          value={filters.scoreMin}
          onChange={(e) => onChange({ scoreMin: Number(e.target.value) })}
          className='border rounded-md px-2 py-2 text-sm bg-background h-9 w-20'
        >
          <option value={0}>Todos</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className='flex items-center gap-1'>
        <span className='text-sm text-muted-foreground whitespace-nowrap'>Antigüedad máx.</span>
        <select
          value={filters.postedHoursMax}
          onChange={(e) => onChange({ postedHoursMax: e.target.value })}
          className='border rounded-md px-2 py-2 text-sm bg-background h-9'
        >
          {AGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <select
        value={filters.ganado}
        onChange={(e) => onChange({ ganado: e.target.value })}
        className='border rounded-md px-3 py-2 text-sm bg-background h-9'
      >
        <option value=''>Todos</option>
        <option value='true'>Ganados</option>
        <option value='false'>No ganados</option>
      </select>

      {hasFilters && (
        <Button variant='ghost' size='sm' onClick={() => onChange({ q: '', scoreMin: 0, postedHoursMax: '', ganado: '' })}>
          Limpiar
        </Button>
      )}

      <div className='ml-auto'>
        <Button variant='outline' size='sm' onClick={onRecalcular} disabled={recalculating}>
          {recalculating ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5 mr-1.5' />}
          Recalcular scores
        </Button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function UpworkJobsTable({ jobs: initial, initialMinScoreAlert }: { jobs: UpworkJob[]; initialMinScoreAlert: number }) {
  const [jobs, setJobs] = useState(initial)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'postedHours', desc: false }])
  const [columnFilters] = useState<ColumnFiltersState>([])
  const [recalculating, setRecalculating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [minScoreAlert, setMinScoreAlert] = useState(initialMinScoreAlert)

  const [filters, setFilters] = useState<Filters>(loadStoredFilters)

  // Todos los filtros se guardan solos — sobreviven a recargas y navegación.
  useEffect(() => {
    window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters))
  }, [filters])

  // Pide permiso de notificaciones del OS una sola vez — si ya fue concedido
  // o denegado, el browser ignora la llamada sin mostrar ningún prompt.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Desbloquea el audio de la alerta en la primera interacción — los
  // navegadores no dejan sonar nada antes de un gesto del usuario.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAlertAudio, { once: true })
    window.addEventListener('keydown', unlockAlertAudio, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlockAlertAudio)
      window.removeEventListener('keydown', unlockAlertAudio)
    }
  }, [])

  const reloadJobs = useCallback(async () => {
    const fresh = await fetch('/api/upwork/jobs?limit=500&sortBy=score&sortDir=desc')
    if (fresh.ok) {
      const json = await fresh.json()
      setJobs(json.data)
    }
  }, [])

  // Guarda el umbral de alerta solo (debounced), sin botón — "ponerlo y ya".
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/upwork/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minScoreAlert }),
      }).catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [minScoreAlert])

  // ── Alertas en vivo ──────────────────────────────────────────────────────
  // Cada 15s pregunta al CRM por los jobs más nuevos. Si algo capturado
  // DESPUÉS de cargar la página cumple el score mínimo, avisa con un toast +
  // un sonido suave y lo mezcla a la tabla. Esta es la única fuente de
  // alertas ahora — la extensión ya no notifica nada por su cuenta.
  const lastSeenCreatedAtRef = useRef<string>(
    initial.reduce((max, j) => (j.createdAt > max ? j.createdAt : max), '1970-01-01T00:00:00.000Z'),
  )
  const minScoreAlertRef = useRef(minScoreAlert)
  minScoreAlertRef.current = minScoreAlert

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Ordenado por lastSeenAt (no createdAt): así también entran jobs
        // VIEJOS que la extensión volvió a ver hace poco (proposals, score,
        // postedHours refrescados) — con createdAt solo se veían los jobs
        // recién creados y todo lo demás se quedaba congelado hasta recargar.
        const res = await fetch('/api/upwork/jobs?limit=50&sortBy=lastSeenAt&sortDir=desc')
        if (!res.ok) return
        const { data } = await res.json() as { data: UpworkJob[] }
        if (!data.length) return

        // Mezcla siempre, no solo cuando hay un job nuevo — así "ganado"
        // cambiado desde otra pestaña, scores recalculados, o datos
        // refrescados por la extensión se ven sin recargar la página.
        setJobs((prev) => {
          const byUid = new Map(prev.map((j) => [j.uid, j]))
          for (const j of data) byUid.set(j.uid, j)
          return Array.from(byUid.values())
        })

        const cursor = lastSeenCreatedAtRef.current
        const fresh = data.filter((j) => j.createdAt > cursor)

        if (fresh.length) {
          const newest = fresh.reduce((max, j) => (j.createdAt > max ? j.createdAt : max), cursor)
          lastSeenCreatedAtRef.current = newest

          const qualifying = fresh.filter((j) => (j.score ?? 0) >= minScoreAlertRef.current)
          for (const job of qualifying.slice(0, 5)) {
            notifyJob(job)
            const elite = (job.score ?? 0) >= 9
            playAlertChime(elite)
            // Toast grande como registro in-tab de lo que llegó mientras estabas fuera.
            // Elite se queda visible hasta que el usuario lo cierra a mano.
            toast.custom(() => <AlertToastCard job={job} />, {
              duration: elite ? Infinity : 8000,
            })
          }
        }
      } catch {
        // si falla el poll, se reintenta en el próximo tick
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const handleRecalcular = async () => {
    setRecalculating(true)
    try {
      const res = await fetch('/api/upwork/recalcular', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Scores recalculados (${data.updated} jobs)`)
      await reloadJobs()
    } catch {
      toast.error('Error al recalcular')
    } finally {
      setRecalculating(false)
    }
  }

  const handleToggleGanado = async (job: UpworkJob, value: boolean) => {
    // Optimista: actualiza la UI antes de que responda el servidor
    setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, ganado: value } : j))
    try {
      const res = await fetch(`/api/upwork/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ganado: value }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revertir si falló
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, ganado: !value } : j))
      toast.error('No se pudo guardar')
    }
  }

  // Filtrado client-side
  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (filters.q) {
        const q = filters.q.toLowerCase()
        if (!j.title.toLowerCase().includes(q) && !(j.description ?? '').toLowerCase().includes(q)) return false
      }
      if (filters.scoreMin > 0 && (j.score ?? -Infinity) < filters.scoreMin) return false
      if (filters.postedHoursMax && trueAgeHours(j) > Number(filters.postedHoursMax)) return false
      if (filters.ganado && String(j.ganado) !== filters.ganado) return false
      return true
    })
  }, [jobs, filters])

  const columns: ColumnDef<UpworkJob>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        const expanded = expandedId === row.original.id
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : row.original.id) }}
            className='p-1 text-muted-foreground hover:text-foreground'
          >
            {expanded ? <ChevronDown className='h-3.5 w-3.5' /> : <ChevronRight className='h-3.5 w-3.5' />}
          </button>
        )
      },
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }) => <ScoreBadge score={row.original.score} />,
    },
    {
      accessorKey: 'title',
      header: 'Job',
      cell: ({ row }) => (
        <div className='max-w-[420px]'>
          <div className='font-medium text-sm truncate'>{row.original.title}</div>
          <div className='text-xs text-muted-foreground truncate'>
            {row.original.budget || '—'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'proposals',
      header: 'Propuestas',
      cell: ({ row }) => <ProposalsBadge job={row.original} />,
    },
    {
      id: 'postedHours',
      accessorFn: (row) => trueAgeHours(row),
      header: 'Publicado',
      cell: ({ row }) => (
        <span className='text-xs text-muted-foreground' title={row.original.postedText ?? undefined}>
          {formatAge(trueAgeHours(row.original))}
        </span>
      ),
    },
    {
      accessorKey: 'ganado',
      header: 'Ganado',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={row.original.ganado}
            onChange={(v) => handleToggleGanado(row.original, v)}
          />
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div
          className='flex items-center gap-0.5'
          onClick={(e) => e.stopPropagation()}>
          <button
            type='button'
            onClick={() => copyJobForReview(row.original)}
            className='p-1.5 rounded hover:bg-muted inline-flex items-center text-muted-foreground hover:text-foreground transition-colors'
            title='Copiar para revisión (Claude)'
          >
            <Copy className='h-3.5 w-3.5' />
          </button>
          <a
            href={row.original.url}
            target='_blank'
            rel='noopener noreferrer'
            className='p-1.5 rounded hover:bg-muted inline-flex items-center text-muted-foreground hover:text-foreground transition-colors'
            title='Abrir en Upwork'
          >
            <ExternalLink className='h-3.5 w-3.5' />
          </a>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  return (
    <div className='space-y-4'>
      <FiltersBar
        filters={filters}
        onChange={(partial) => setFilters((f) => ({ ...f, ...partial }))}
        onRecalcular={handleRecalcular}
        recalculating={recalculating}
        minScoreAlert={minScoreAlert}
        onMinScoreAlertChange={setMinScoreAlert}
      />

      <div className='flex items-center justify-between'>
        <div className='text-sm text-muted-foreground'>
          {filtered.length} job{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== jobs.length && ` de ${jobs.length}`}
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => downloadJobsForBulkReview(filtered)}
          disabled={filtered.length === 0}
        >
          <Download className='h-3.5 w-3.5 mr-1.5' />
          Descargar {filtered.length || ''} para Claude
        </Button>
      </div>

      <div className='rounded-md border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className='border-b bg-muted/50'>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className='px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap'
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {sortArrow(header.column.id, header.column.getIsSorted())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className='px-4 py-12 text-center text-muted-foreground'>
                  No hay jobs con esos filtros
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === row.original.id ? null : row.original.id)}
                    className='border-b hover:bg-muted/30 transition-colors cursor-pointer'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className='px-4 py-3'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expandedId === row.original.id && (
                    <tr key={`${row.id}-detail`} className='border-b bg-muted/20'>
                      <td colSpan={columns.length} className='px-4 py-3'>
                        {row.original.skills.length > 0 && (
                          <div className='flex flex-wrap gap-1 mb-2'>
                            {row.original.skills.map((s) => (
                              <span key={s} className='px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground'>{s}</span>
                            ))}
                          </div>
                        )}
                        {row.original.reasons.length > 0 && (
                          <div className='mb-2'>
                            <div className='text-xs font-medium text-muted-foreground mb-1'>Desglose de score</div>
                            <div className='flex flex-wrap gap-1.5'>
                              {row.original.reasons.map((r, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                                    r.pts >= 0
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                                  )}
                                >
                                  {r.pts > 0 ? '+' : ''}{r.pts} {r.why}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {row.original.description && (
                          <DescriptionView text={row.original.description} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}
        </p>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant='outline' size='sm' onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
