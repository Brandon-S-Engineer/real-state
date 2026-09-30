// Demos: tipos, catálogos y lógica pura (server + cliente).
//
// Regla de honestidad: un demo solo es público con status PUBLISHED, y no se
// puede pasar a PUBLISHED mientras publishBlockers() devuelva algo. Así nada
// sin video real, diagrama y problema llega al portafolio.

import { z } from 'zod'

export const DEMO_STATUSES = ['PLANNED', 'BUILDING', 'RECORDED', 'PUBLISHED', 'ARCHIVED'] as const
export type DemoStatus = (typeof DEMO_STATUSES)[number]
export const STATUS_LABEL: Record<DemoStatus, string> = {
  PLANNED: 'Planeado',
  BUILDING: 'En construcción',
  RECORDED: 'Grabado (privado)',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}

export const DEMO_EDGES = ['EMAIL', 'WHATSAPP', 'VOICE', 'WEB_CHAT', 'SMS'] as const
export type DemoEdge = (typeof DEMO_EDGES)[number]
export const EDGE_LABEL: Record<DemoEdge, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  VOICE: 'Phone / voice',
  WEB_CHAT: 'Web chat',
  SMS: 'SMS',
}

export const USE_OUTCOMES = ['SENT', 'REPLIED', 'INTERVIEW', 'HIRED', 'LOST'] as const
export type DemoUseOutcome = (typeof USE_OUTCOMES)[number]
export const OUTCOME_LABEL: Record<DemoUseOutcome, string> = {
  SENT: 'Enviada',
  REPLIED: 'Respondió',
  INTERVIEW: 'Entrevista',
  HIRED: 'Contratado',
  LOST: 'Perdida',
}

// Diagrama como datos: el portafolio lo dibuja con su propio sistema de diseño.
// edge = canal de entrada/salida (lo que cambia entre demos), brain = el
// cerebro compartido, action = efecto en otro sistema, human = escalamiento.
export const FLOW_KINDS = ['edge', 'brain', 'action', 'human'] as const
export type FlowKind = (typeof FLOW_KINDS)[number]
export type FlowStep = { label: string; detail?: string; kind: FlowKind }

const flowStepSchema = z.object({
  label: z.string().trim().min(1),
  detail: z.string().trim().optional(),
  kind: z.enum(FLOW_KINDS),
})

const strList = z.array(z.string().trim().min(1)).default([])
const optStr = z.string().trim().nullable().optional().transform((v) => v || null)

export const demoSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug en kebab-case'),
  title: z.string().trim().min(1),
  buildOrder: z.number().int().min(0).default(0),
  status: z.enum(DEMO_STATUSES).default('PLANNED'),
  niche: z.string().trim().min(1),
  tiers: z.array(z.number().int().min(1).max(4)).default([]),
  edges: z.array(z.enum(DEMO_EDGES)).default([]),
  summary: z.string().trim().min(1),
  problem: z.string().trim().min(1),
  stack: strList,
  flow: z.array(flowStepSchema).default([]),
  repoPath: optStr,
  repoUrl: optStr,
  videoUrl: optStr,
  matchKeywords: strList,
  excludeKeywords: strList,
  notes: optStr,
})
export type DemoInput = z.infer<typeof demoSchema>

export const demoUseSchema = z.object({
  upworkJobId: z.string().nullable().optional(),
  jobTitle: z.string().trim().min(1),
  jobUrl: optStr,
  sentAt: z.coerce.date().optional(),
  outcome: z.enum(USE_OUTCOMES).default('SENT'),
  notes: optStr,
})

export type DemoUseDTO = {
  id: string
  demoId: string
  upworkJobId: string | null
  jobTitle: string
  jobUrl: string | null
  sentAt: string
  outcome: DemoUseOutcome
  notes: string | null
}

export type DemandPoint = { weekStart: string; matches: number; totalCaptured: number }

export type DemoDTO = DemoInput & {
  id: string
  publishedAt: string | null
  updatedAt: string
  uses: DemoUseDTO[]
  demand: DemandPoint[]
}

/** Qué le falta a un demo para poder publicarse. Vacío = publicable. */
export function publishBlockers(d: Pick<DemoInput, 'videoUrl' | 'flow' | 'problem' | 'summary' | 'tiers' | 'stack'>): string[] {
  const out: string[] = []
  if (!d.videoUrl || !videoEmbed(d.videoUrl)) out.push('Video (Loom, YouTube o .mp4) de la build funcionando')
  if (d.flow.length < 2) out.push('Diagrama (al menos 2 pasos en el flujo)')
  if (!d.problem.trim()) out.push('Problema que resuelve')
  if (!d.summary.trim()) out.push('Resumen de una línea')
  if (d.tiers.length === 0) out.push('Al menos un nivel (1–4)')
  if (d.stack.length === 0) out.push('Stack')
  return out
}

/** URL embebible para Loom / YouTube / archivo de video, o null si no se reconoce. */
export function videoEmbed(url: string): { kind: 'iframe' | 'video'; src: string } | null {
  let u: URL
  try { u = new URL(url) } catch { return null }
  const host = u.hostname.replace(/^www\./, '')
  if (host === 'loom.com') {
    const id = u.pathname.match(/\/(?:share|embed)\/([a-zA-Z0-9]+)/)?.[1]
    return id ? { kind: 'iframe', src: `https://www.loom.com/embed/${id}` } : null
  }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/)?.[1]
    return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1)
    return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }
  if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: 'video', src: url }
  return null
}

// ── Demanda ──────────────────────────────────────────────────────────────────

export type JobText = { title: string; description: string | null; skills: unknown }

const norm = (s: string) => s.toLowerCase()

/** El job hace match con el patrón del demo si contiene alguna keyword y ninguna exclusión. */
export function jobMatches(job: JobText, include: string[], exclude: string[]): boolean {
  if (include.length === 0) return false
  const skills = Array.isArray(job.skills) ? job.skills.join(' ') : ''
  const text = norm(`${job.title} ${job.description ?? ''} ${skills}`)
  if (exclude.some((k) => text.includes(norm(k)))) return false
  return include.some((k) => text.includes(norm(k)))
}

/** Lunes (UTC) de la semana de una fecha, como YYYY-MM-DD. */
export function weekStartOf(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (x.getUTCDay() + 6) % 7 // lunes = 0
  x.setUTCDate(x.getUTCDate() - dow)
  return x.toISOString().slice(0, 10)
}

/** Fecha de publicación estimada del job: cuando lo vimos menos la antigüedad que ya tenía. */
export function postedAt(job: { firstSeenAt: Date; initialPostedHours: number | null }): Date {
  return new Date(job.firstSeenAt.getTime() - (job.initialPostedHours ?? 0) * 3_600_000)
}

/** Las últimas n semanas (más reciente al final), rellenando con ceros las que no tienen datos. */
export function lastWeeks(points: DemandPoint[], n: number, now = new Date()): DemandPoint[] {
  const byWeek = new Map(points.map((p) => [p.weekStart, p]))
  const out: DemandPoint[] = []
  const start = new Date(`${weekStartOf(now)}T00:00:00Z`)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() - i * 7)
    const key = d.toISOString().slice(0, 10)
    out.push(byWeek.get(key) ?? { weekStart: key, matches: 0, totalCaptured: 0 })
  }
  return out
}
