'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExternalLink, Eye, FolderGit2, Pencil, Plus, RefreshCw, Send, Trash2, Video } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DEMO_EDGES, DEMO_STATUSES, EDGE_LABEL, FLOW_KINDS, OUTCOME_LABEL, STATUS_LABEL, USE_OUTCOMES,
  lastWeeks, publishBlockers,
  type DemoDTO, type DemoEdge, type DemoInput, type DemoStatus, type DemoUseDTO, type DemoUseOutcome, type FlowKind, type FlowStep,
} from '@/lib/demos/shared'

export type JobLite = { id: string; title: string; url: string; postedAt: string; ganado: boolean }

const sel = 'w-full border rounded-md px-3 py-2 text-sm bg-background h-9'
const NICHES = ['Automation + RAG', 'Voice', 'Chatbots', 'Automation']
const DEMAND_WEEKS = 8
const RECENT_WEEKS = 4

const STATUS_TONE: Record<DemoStatus, string> = {
  PLANNED: 'bg-muted text-muted-foreground',
  BUILDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  RECORDED: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  PUBLISHED: 'bg-green-500/15 text-green-700 dark:text-green-400',
  ARCHIVED: 'bg-muted text-muted-foreground line-through',
}

const OUTCOME_TONE: Record<DemoUseOutcome, string> = {
  SENT: 'text-muted-foreground',
  REPLIED: 'text-sky-600 dark:text-sky-400',
  INTERVIEW: 'text-amber-600 dark:text-amber-400',
  HIRED: 'text-green-600 dark:text-green-400',
  LOST: 'text-red-600 dark:text-red-400',
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

// ── Flujo ↔ texto: una línea por paso, "tipo | etiqueta | detalle" ──────────────
const flowToText = (flow: FlowStep[]) => flow.map((s) => [s.kind, s.label, s.detail].filter(Boolean).join(' | ')).join('\n')
function textToFlow(text: string): FlowStep[] | string {
  const out: FlowStep[] = []
  for (const [i, raw] of text.split('\n').entries()) {
    const line = raw.trim()
    if (!line) continue
    const [kind, label, detail] = line.split('|').map((x) => x.trim())
    if (!FLOW_KINDS.includes(kind as FlowKind)) return `Línea ${i + 1}: el tipo debe ser ${FLOW_KINDS.join(', ')}`
    if (!label) return `Línea ${i + 1}: falta la etiqueta`
    out.push({ kind: kind as FlowKind, label, ...(detail ? { detail } : {}) })
  }
  return out
}

// ── Demanda ─────────────────────────────────────────────────────────────────
function demandStats(d: DemoDTO) {
  const weeks = lastWeeks(d.demand, DEMAND_WEEKS)
  const recent = weeks.slice(-RECENT_WEEKS)
  const matches = recent.reduce((a, w) => a + w.matches, 0)
  const total = recent.reduce((a, w) => a + w.totalCaptured, 0)
  return { weeks, matches, share: total > 0 ? matches / total : null }
}

function Sparkbars({ weeks }: { weeks: { weekStart: string; matches: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.matches))
  return (
    <div className='flex h-7 items-end gap-[3px]'>
      {weeks.map((w) => (
        <div
          key={w.weekStart}
          title={`Semana del ${fmtDate(`${w.weekStart}T12:00:00Z`)}: ${w.matches} jobs`}
          className={cn('w-2 rounded-sm', w.matches ? 'bg-foreground/70' : 'bg-muted')}
          style={{ height: `${Math.max(12, (w.matches / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

function proposalStats(uses: DemoUseDTO[]) {
  const hired = uses.filter((u) => u.outcome === 'HIRED').length
  const decided = uses.filter((u) => u.outcome === 'HIRED' || u.outcome === 'LOST').length
  return { sent: uses.length, hired, rate: uses.length ? hired / uses.length : null, decided }
}

// ── Editor de demo ──────────────────────────────────────────────────────────
type Draft = Omit<DemoInput, 'stack' | 'flow' | 'matchKeywords' | 'excludeKeywords'> & {
  id?: string
  stack: string
  flow: string
  matchKeywords: string
  excludeKeywords: string
}

const toDraft = (d?: DemoDTO, nextOrder = 1): Draft =>
  d
    ? {
        ...d,
        stack: d.stack.join(', '),
        flow: flowToText(d.flow),
        matchKeywords: d.matchKeywords.join(', '),
        excludeKeywords: d.excludeKeywords.join(', '),
      }
    : {
        slug: '', title: '', buildOrder: nextOrder, status: 'PLANNED', niche: '', tiers: [], edges: [], summary: '', problem: '',
        stack: '', flow: 'edge | Message arrives | channel\nbrain | Classify\nbrain | Retrieve | knowledge base (RAG)\nbrain | Reply\nhuman | Escalate when unsure',
        repoPath: '', repoUrl: '', videoUrl: '', matchKeywords: '', excludeKeywords: '', notes: '',
      }

function DemoDialog({ draft, onClose, onSaved }: { draft: Draft | null; onClose: () => void; onSaved: (d: DemoDTO) => void }) {
  const [f, setF] = useState<Draft | null>(draft)
  const [saving, setSaving] = useState(false)
  useEffect(() => setF(draft), [draft])
  if (!f) return null
  const set = (p: Partial<Draft>) => setF((x) => (x ? { ...x, ...p } : x))
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const flow = textToFlow(f.flow)
  const payload = typeof flow === 'string' ? null : {
    slug: f.slug, title: f.title, buildOrder: Number(f.buildOrder) || 0, status: f.status, niche: f.niche,
    tiers: [...f.tiers].sort(), edges: f.edges, summary: f.summary, problem: f.problem, stack: splitList(f.stack), flow,
    repoPath: f.repoPath, repoUrl: f.repoUrl, videoUrl: f.videoUrl,
    matchKeywords: splitList(f.matchKeywords), excludeKeywords: splitList(f.excludeKeywords), notes: f.notes,
  }
  const blockers = payload && f.status === 'PUBLISHED' ? publishBlockers({ ...payload, problem: payload.problem, summary: payload.summary }) : []

  const save = async () => {
    if (!payload) { toast.error(flow as string); return }
    if (!f.slug || !f.title || !f.niche || !f.summary || !f.problem) { toast.error('Slug, título, nicho, resumen y problema son requeridos'); return }
    setSaving(true)
    try {
      const res = await fetch(f.id ? `/api/demos/${f.id}` : '/api/demos', {
        method: f.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(body.blockers ? `Falta: ${body.blockers.join(' · ')}` : (typeof body.error === 'string' ? body.error : 'No se pudo guardar')); return }
      onSaved(body)
      toast.success(f.id ? 'Demo actualizado' : 'Demo creado')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!draft} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader><DialogTitle>{f.id ? `Editar · ${f.title}` : 'Nuevo demo'}</DialogTitle></DialogHeader>
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5 col-span-2 sm:col-span-1'>
            <Label>Título</Label>
            <Input value={f.title} onChange={(e) => set({ title: e.target.value, ...(!f.id && { slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }) })} />
          </div>
          <div className='space-y-1.5 col-span-2 sm:col-span-1'>
            <Label>Slug</Label>
            <Input value={f.slug} onChange={(e) => set({ slug: e.target.value })} className='font-mono text-xs' />
          </div>
          <div className='space-y-1.5'>
            <Label>Estado</Label>
            <select value={f.status} onChange={(e) => set({ status: e.target.value as DemoStatus })} className={sel}>
              {DEMO_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label>Orden</Label>
              <Input type='number' min={0} value={f.buildOrder} onChange={(e) => set({ buildOrder: Number(e.target.value) })} />
            </div>
            <div className='space-y-1.5'>
              <Label>Nicho</Label>
              <Input list='demo-niches' value={f.niche} onChange={(e) => set({ niche: e.target.value })} />
              <datalist id='demo-niches'>{NICHES.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label>Niveles que prueba</Label>
            <div className='flex gap-1.5'>
              {[1, 2, 3, 4].map((t) => (
                <button key={t} type='button' onClick={() => set({ tiers: toggle(f.tiers, t) })}
                  className={cn('h-9 w-9 rounded-md border text-sm', f.tiers.includes(t) ? 'bg-foreground text-background' : 'text-muted-foreground')}>{t}</button>
              ))}
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label>Canales (edges)</Label>
            <div className='flex flex-wrap gap-1.5'>
              {DEMO_EDGES.map((e) => (
                <button key={e} type='button' onClick={() => set({ edges: toggle<DemoEdge>(f.edges, e) })}
                  className={cn('h-9 px-2.5 rounded-md border text-xs', f.edges.includes(e) ? 'bg-foreground text-background' : 'text-muted-foreground')}>{EDGE_LABEL[e]}</button>
              ))}
            </div>
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Resumen (una línea, público)</Label>
            <Input value={f.summary} onChange={(e) => set({ summary: e.target.value })} />
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Problema que resuelve (público)</Label>
            <Textarea rows={2} value={f.problem} onChange={(e) => set({ problem: e.target.value })} />
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Stack (separado por comas)</Label>
            <Input value={f.stack} onChange={(e) => set({ stack: e.target.value })} />
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Diagrama — un paso por línea: tipo | etiqueta | detalle</Label>
            <Textarea rows={6} value={f.flow} onChange={(e) => set({ flow: e.target.value })} className='font-mono text-xs' />
            <p className={cn('text-xs', typeof flow === 'string' ? 'text-red-600' : 'text-muted-foreground')}>
              {typeof flow === 'string' ? flow : `Tipos: edge (canal) · brain (cerebro IA) · action (efecto) · human (escalamiento) — ${flow.length} pasos`}
            </p>
          </div>
          <div className='space-y-1.5'>
            <Label>Carpeta en el repo</Label>
            <Input value={f.repoPath ?? ''} onChange={(e) => set({ repoPath: e.target.value })} placeholder='demos/05-…' className='font-mono text-xs' />
          </div>
          <div className='space-y-1.5'>
            <Label>URL del repo</Label>
            <Input value={f.repoUrl ?? ''} onChange={(e) => set({ repoUrl: e.target.value })} />
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Video (Loom, YouTube o .mp4)</Label>
            <Input value={f.videoUrl ?? ''} onChange={(e) => set({ videoUrl: e.target.value })} placeholder='Solo de la build real funcionando' />
          </div>
          <div className='space-y-1.5 col-span-2 sm:col-span-1'>
            <Label>Patrón de demanda — keywords (coma)</Label>
            <Textarea rows={2} value={f.matchKeywords} onChange={(e) => set({ matchKeywords: e.target.value })} />
          </div>
          <div className='space-y-1.5 col-span-2 sm:col-span-1'>
            <Label>Excluir si contiene (coma)</Label>
            <Textarea rows={2} value={f.excludeKeywords} onChange={(e) => set({ excludeKeywords: e.target.value })} />
          </div>
          <p className='col-span-2 -mt-1 text-xs text-muted-foreground'>Cambiar keywords reinicia el historial de demanda de este demo (el conteo anterior ya no sería comparable).</p>
          <div className='space-y-1.5 col-span-2'>
            <Label>Notas (privadas)</Label>
            <Textarea rows={2} value={f.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
        {blockers.length > 0 && (
          <div className='rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs'>
            <div className='font-medium text-amber-700 dark:text-amber-400'>Aún no se puede publicar — falta:</div>
            <ul className='mt-1 list-disc pl-4 text-muted-foreground'>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}
        <Button onClick={save} disabled={saving || blockers.length > 0 || typeof flow === 'string'} className='w-full'>Guardar</Button>
      </DialogContent>
    </Dialog>
  )
}

// ── Registrar uso en una propuesta ──────────────────────────────────────────
function UseDialog({ demo, jobs, onClose, onSaved }: { demo: DemoDTO | null; jobs: JobLite[]; onClose: () => void; onSaved: (u: DemoUseDTO) => void }) {
  const [q, setQ] = useState('')
  const [job, setJob] = useState<JobLite | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [outcome, setOutcome] = useState<DemoUseOutcome>('SENT')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setQ(''); setJob(null); setTitle(''); setUrl(''); setOutcome('SENT'); setNotes('') }, [demo])

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? jobs.filter((j) => j.title.toLowerCase().includes(s)).slice(0, 6) : []
  }, [q, jobs])

  if (!demo) return null
  const save = async () => {
    const jobTitle = job?.title ?? title.trim()
    if (!jobTitle) { toast.error('Elige un job capturado o escribe el título'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/demos/${demo.id}/uses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upworkJobId: job?.id ?? null, jobTitle, jobUrl: job?.url ?? url, outcome, notes }),
      })
      if (!res.ok) throw new Error()
      onSaved(await res.json())
      toast.success('Propuesta registrada')
      onClose()
    } catch {
      toast.error('No se pudo registrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!demo} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader><DialogTitle>Usé “{demo.title}” en una propuesta</DialogTitle></DialogHeader>
        {job ? (
          <div className='rounded-md border p-3 text-sm flex items-start justify-between gap-3'>
            <span>{job.title}<span className='block text-xs text-muted-foreground'>Job capturado · {fmtDate(job.postedAt)}</span></span>
            <button className='text-xs text-muted-foreground underline' onClick={() => setJob(null)}>cambiar</button>
          </div>
        ) : (
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label>Buscar entre los jobs capturados</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Título del job…' />
              {matches.length > 0 && (
                <div className='rounded-md border divide-y'>
                  {matches.map((j) => (
                    <button key={j.id} onClick={() => setJob(j)} className='block w-full px-3 py-2 text-left text-sm hover:bg-muted'>
                      {j.title}<span className='block text-xs text-muted-foreground'>{fmtDate(j.postedAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className='text-xs text-muted-foreground'>…o si no está capturado:</div>
            <div className='grid grid-cols-2 gap-3'>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Título del job' />
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder='URL del job' />
            </div>
          </div>
        )}
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <Label>Resultado</Label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as DemoUseOutcome)} className={sel}>
              {USE_OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label>Nota</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder='qué adapté, precio…' />
          </div>
        </div>
        <Button onClick={save} disabled={saving} className='w-full'>Registrar</Button>
      </DialogContent>
    </Dialog>
  )
}

// ── Tarjeta de demo ─────────────────────────────────────────────────────────
function DemoCard({ d, onEdit, onUse, onUseChange, onUseDelete }: {
  d: DemoDTO
  onEdit: () => void
  onUse: () => void
  onUseChange: (u: DemoUseDTO) => void
  onUseDelete: (u: DemoUseDTO) => void
}) {
  const blockers = publishBlockers(d)
  const s = proposalStats(d.uses)

  const setOutcome = async (u: DemoUseDTO, outcome: DemoUseOutcome) => {
    onUseChange({ ...u, outcome })
    const res = await fetch(`/api/demos/uses/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }) }).catch(() => null)
    if (!res?.ok) toast.error('No se pudo actualizar')
  }

  return (
    <div className='rounded-lg border p-4 space-y-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-xs font-mono text-muted-foreground'>#{d.buildOrder}</span>
            <h3 className='font-semibold'>{d.title}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_TONE[d.status])}>{STATUS_LABEL[d.status]}</span>
          </div>
          <p className='text-sm text-muted-foreground mt-1'>{d.summary}</p>
          <div className='mt-2 flex flex-wrap gap-1.5 text-[11px]'>
            <span className='rounded border px-1.5 py-0.5'>{d.niche}</span>
            <span className='rounded border px-1.5 py-0.5'>Nivel {d.tiers.join('–') || '—'}</span>
            {d.edges.map((e) => <span key={e} className='rounded border px-1.5 py-0.5 text-muted-foreground'>{EDGE_LABEL[e]}</span>)}
          </div>
        </div>
        <div className='flex flex-wrap gap-1.5'>
          <Button size='sm' variant='outline' onClick={onUse}><Send className='h-3.5 w-3.5 mr-1.5' /> Usé en propuesta</Button>
          <Button size='sm' variant='outline' onClick={onEdit}><Pencil className='h-3.5 w-3.5' /></Button>
        </div>
      </div>

      <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs'>
        {d.repoUrl
          ? <a href={d.repoUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 hover:underline'><FolderGit2 className='h-3.5 w-3.5' />{d.repoPath ?? 'repo'}</a>
          : <span className='inline-flex items-center gap-1 text-muted-foreground'><FolderGit2 className='h-3.5 w-3.5' />sin repo</span>}
        {d.videoUrl
          ? <a href={d.videoUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 hover:underline'><Video className='h-3.5 w-3.5' />video</a>
          : <span className='inline-flex items-center gap-1 text-muted-foreground'><Video className='h-3.5 w-3.5' />sin video</span>}
        <a href={`/solutions/preview/${d.slug}`} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 hover:underline'><Eye className='h-3.5 w-3.5' />vista previa</a>
        {d.status !== 'ARCHIVED' && <a href={`/solutions#${d.slug}`} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-green-600 hover:underline'><ExternalLink className='h-3.5 w-3.5' />en el portafolio</a>}
      </div>

      {d.status !== 'PUBLISHED' && d.status !== 'ARCHIVED' && blockers.length > 0 && (
        <p className='text-xs text-muted-foreground'>Para publicar falta: {blockers.join(' · ')}</p>
      )}

      <div className='border-t pt-3'>
        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <span>Propuestas: {s.sent} · contratado: {s.hired}{s.rate != null && ` · ${Math.round(s.rate * 100)}%`}</span>
        </div>
        {d.uses.length > 0 && (
          <div className='mt-2 divide-y rounded-md border'>
            {d.uses.map((u) => (
              <div key={u.id} className='flex items-center gap-3 px-3 py-2 text-sm'>
                <span className='w-14 shrink-0 text-xs text-muted-foreground'>{fmtDate(u.sentAt)}</span>
                <span className='min-w-0 flex-1 truncate'>
                  {u.jobUrl ? <a href={u.jobUrl} target='_blank' rel='noopener noreferrer' className='hover:underline'>{u.jobTitle}</a> : u.jobTitle}
                </span>
                <select value={u.outcome} onChange={(e) => setOutcome(u, e.target.value as DemoUseOutcome)} className={cn('border rounded px-1.5 py-1 text-xs bg-background', OUTCOME_TONE[u.outcome])}>
                  {USE_OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
                </select>
                <button onClick={() => onUseDelete(u)} className='text-muted-foreground hover:text-red-600' title='Borrar'><Trash2 className='h-3.5 w-3.5' /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function DemosClient({ demos: initial, jobs }: { demos: DemoDTO[]; jobs: JobLite[] }) {
  const [demos, setDemos] = useState(initial)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [useFor, setUseFor] = useState<DemoDTO | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const ranking = useMemo(
    () => demos.filter((d) => d.status !== 'ARCHIVED').map((d) => ({ d, ...demandStats(d), ...proposalStats(d.uses) })).sort((a, b) => b.matches - a.matches),
    [demos],
  )
  const nextToBuild = ranking.find((r) => r.d.status === 'PLANNED' || r.d.status === 'BUILDING')
  const published = demos.filter((d) => d.status === 'PUBLISHED').length

  const upsert = (d: DemoDTO) => setDemos((prev) => (prev.some((x) => x.id === d.id) ? prev.map((x) => (x.id === d.id ? d : x)) : [...prev, d]).sort((a, b) => a.buildOrder - b.buildOrder))
  const patchUses = (demoId: string, fn: (uses: DemoUseDTO[]) => DemoUseDTO[]) => setDemos((prev) => prev.map((d) => (d.id === demoId ? { ...d, uses: fn(d.uses) } : d)))

  const refresh = async () => {
    setRefreshing(true)
    const res = await fetch('/api/demos/demand', { method: 'POST' }).catch(() => null)
    if (res?.ok) window.location.reload()
    else { toast.error('No se pudo actualizar'); setRefreshing(false) }
  }

  const removeUse = async (u: DemoUseDTO) => {
    if (!confirm(`¿Borrar el registro "${u.jobTitle}"?`)) return
    patchUses(u.demoId, (uses) => uses.filter((x) => x.id !== u.id))
    await fetch(`/api/demos/uses/${u.id}`, { method: 'DELETE' }).catch(() => toast.error('No se pudo borrar'))
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='text-xl font-semibold'>Demos</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {demos.length} en la biblioteca · {published} publicado{published !== 1 ? 's' : ''} en el portafolio
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='outline' onClick={refresh} disabled={refreshing}><RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Demanda</Button>
          <Button size='sm' onClick={() => setDraft(toDraft(undefined, (demos.at(-1)?.buildOrder ?? 0) + 1))}><Plus className='h-3.5 w-3.5 mr-1.5' /> Demo</Button>
        </div>
      </div>

      {/* Demanda: qué construir después */}
      <div className='rounded-lg border'>
        <div className='flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3'>
          <div>
            <div className='text-sm font-medium'>Demanda por patrón</div>
            <div className='text-xs text-muted-foreground'>Jobs capturados que coinciden con el patrón de cada demo · últimas {RECENT_WEEKS} semanas, por semana de publicación</div>
          </div>
          {nextToBuild && nextToBuild.matches > 0 && (
            <div className='text-xs'>Siguiente a construir por demanda: <span className='font-semibold'>{nextToBuild.d.title}</span></div>
          )}
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='text-xs text-muted-foreground'>
              <tr className='border-b'>
                <th className='px-4 py-2 text-left font-normal'>Demo</th>
                <th className='px-4 py-2 text-left font-normal'>Estado</th>
                <th className='px-4 py-2 text-right font-normal'>Jobs</th>
                <th className='px-4 py-2 text-right font-normal'>% capturados</th>
                <th className='px-4 py-2 text-left font-normal'>{DEMAND_WEEKS} semanas</th>
                <th className='px-4 py-2 text-right font-normal'>Propuestas</th>
                <th className='px-4 py-2 text-right font-normal'>Contratado</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.d.id} className='border-b last:border-0'>
                  <td className='px-4 py-2'>{r.d.title}</td>
                  <td className='px-4 py-2'><span className={cn('rounded-full px-2 py-0.5 text-[11px]', STATUS_TONE[r.d.status])}>{STATUS_LABEL[r.d.status]}</span></td>
                  <td className='px-4 py-2 text-right font-medium tabular-nums'>{r.matches}</td>
                  <td className='px-4 py-2 text-right tabular-nums text-muted-foreground'>{r.share == null ? '—' : `${Math.round(r.share * 100)}%`}</td>
                  <td className='px-4 py-2'><Sparkbars weeks={r.weeks} /></td>
                  <td className='px-4 py-2 text-right tabular-nums'>{r.sent}</td>
                  <td className='px-4 py-2 text-right tabular-nums'>{r.hired}{r.rate != null && <span className='text-muted-foreground'> · {Math.round(r.rate * 100)}%</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className='border-t px-4 py-2 text-xs text-muted-foreground'>
          Cuenta sobre los jobs que captura tu extensión, así que depende de tus búsquedas; el % normaliza por lo capturado. Se guarda por semana y sobrevive a las purgas de Upwork.
        </p>
      </div>

      <div className='space-y-3'>
        {demos.map((d) => (
          <DemoCard
            key={d.id}
            d={d}
            onEdit={() => setDraft(toDraft(d))}
            onUse={() => setUseFor(d)}
            onUseChange={(u) => patchUses(u.demoId, (uses) => uses.map((x) => (x.id === u.id ? u : x)))}
            onUseDelete={removeUse}
          />
        ))}
      </div>

      <DemoDialog draft={draft} onClose={() => setDraft(null)} onSaved={upsert} />
      <UseDialog demo={useFor} jobs={jobs} onClose={() => setUseFor(null)} onSaved={(u) => patchUses(u.demoId, (uses) => [u, ...uses])} />
    </div>
  )
}
