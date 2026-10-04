import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'
import type { Demo, DemoDemandWeek, DemoUse } from '@prisma/client'
import {
  jobMatches, postedAt, weekStartOf,
  type DemoDTO, type DemoEdge, type DemoStatus, type DemoUseDTO, type DemoUseOutcome, type FlowStep,
} from './shared'

export const DEMOS_TAG = 'demos'

const asFlow = (v: unknown): FlowStep[] => (Array.isArray(v) ? (v as FlowStep[]) : [])

export function toUseDTO(u: DemoUse): DemoUseDTO {
  return {
    id: u.id,
    demoId: u.demoId,
    upworkJobId: u.upworkJobId,
    jobTitle: u.jobTitle,
    jobUrl: u.jobUrl,
    sentAt: u.sentAt.toISOString(),
    outcome: u.outcome as DemoUseOutcome,
    notes: u.notes,
  }
}

export function toDemoDTO(d: Demo & { uses?: DemoUse[]; demand?: DemoDemandWeek[] }): DemoDTO {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    buildOrder: d.buildOrder,
    status: d.status as DemoStatus,
    niche: d.niche,
    tiers: d.tiers,
    edges: d.edges as DemoEdge[],
    summary: d.summary,
    problem: d.problem,
    stack: d.stack,
    flow: asFlow(d.flow),
    repoPath: d.repoPath,
    repoUrl: d.repoUrl,
    videoUrl: d.videoUrl,
    matchKeywords: d.matchKeywords,
    excludeKeywords: d.excludeKeywords,
    notes: d.notes,
    publishedAt: d.publishedAt?.toISOString() ?? null,
    updatedAt: d.updatedAt.toISOString(),
    uses: (d.uses ?? []).map(toUseDTO),
    demand: (d.demand ?? []).map((w) => ({
      weekStart: w.weekStart.toISOString().slice(0, 10),
      matches: w.matches,
      totalCaptured: w.totalCaptured,
    })),
  }
}

// ── Público ──────────────────────────────────────────────────────────────────

// Solo lo que el portafolio muestra: nada de repo, notas, keywords ni propuestas.
export type PublicDemo = {
  slug: string
  title: string
  niche: string
  tiers: number[]
  edges: DemoEdge[]
  summary: string
  problem: string
  stack: string[]
  flow: FlowStep[]
  videoUrl: string
}

/**
 * Demos publicados, cacheados (se invalidan con revalidateTag(DEMOS_TAG) en
 * cada cambio desde el CRM). Falla cerrado: si la DB no responde, el
 * portafolio se comporta como si no hubiera demos, nunca muestra algo a medias.
 */
export const getPublishedDemos = unstable_cache(
  async (): Promise<PublicDemo[]> => {
    try {
      const rows = await prisma.demo.findMany({
        where: { status: 'PUBLISHED', videoUrl: { not: null } },
        orderBy: [{ buildOrder: 'asc' }, { publishedAt: 'asc' }],
      })
      return rows.map((d) => ({
        slug: d.slug,
        title: d.title,
        niche: d.niche,
        tiers: d.tiers,
        edges: d.edges as DemoEdge[],
        summary: d.summary,
        problem: d.problem,
        stack: d.stack,
        flow: asFlow(d.flow),
        videoUrl: d.videoUrl!,
      }))
    } catch (e) {
      console.error('[demos] getPublishedDemos failed — hiding demos', e)
      return []
    }
  },
  ['published-demos'],
  { tags: [DEMOS_TAG], revalidate: 3600 },
)

// Todas las soluciones visibles en /solutions (todo menos ARCHIVED), con o sin
// video. Sin video se muestran como lo que son: el diseño de la solución y un
// aviso honesto de que el video viene en camino — nunca un video falso.
export type PublicSolution = Omit<PublicDemo, 'videoUrl'> & { videoUrl: string | null }

export const getPublicSolutions = unstable_cache(
  async (): Promise<PublicSolution[]> => {
    try {
      const rows = await prisma.demo.findMany({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: [{ buildOrder: 'asc' }, { createdAt: 'asc' }],
      })
      return rows.map((d) => ({
        slug: d.slug,
        title: d.title,
        niche: d.niche,
        tiers: d.tiers,
        edges: d.edges as DemoEdge[],
        summary: d.summary,
        problem: d.problem,
        stack: d.stack,
        flow: asFlow(d.flow),
        // Solo un demo PUBLISHED enseña su video; un link guardado a medias no sale.
        videoUrl: d.status === 'PUBLISHED' ? d.videoUrl : null,
      }))
    } catch (e) {
      console.error('[demos] getPublicSolutions failed', e)
      return []
    }
  },
  ['public-solutions'],
  { tags: [DEMOS_TAG], revalidate: 3600 },
)

// ── Demanda ──────────────────────────────────────────────────────────────────

/**
 * Recalcula la demanda semanal de cada demo desde los jobs capturados y la
 * persiste. Los conteos solo suben (max con lo guardado): la tabla UpworkJob
 * se purga al calibrar búsquedas y eso no debe borrar la historia.
 */
export async function refreshDemand() {
  const [demos, jobs] = await Promise.all([
    prisma.demo.findMany({ select: { id: true, matchKeywords: true, excludeKeywords: true } }),
    prisma.upworkJob.findMany({
      select: { title: true, description: true, skills: true, firstSeenAt: true, initialPostedHours: true },
    }),
  ])
  if (demos.length === 0 || jobs.length === 0) return

  const totals = new Map<string, number>()
  const weekOf = jobs.map((j) => {
    const w = weekStartOf(postedAt(j))
    totals.set(w, (totals.get(w) ?? 0) + 1)
    return w
  })

  const existing = await prisma.demoDemandWeek.findMany({
    where: { weekStart: { in: [...totals.keys()].map((w) => new Date(`${w}T00:00:00Z`)) } },
  })
  const prev = new Map(existing.map((e) => [`${e.demoId}|${e.weekStart.toISOString().slice(0, 10)}`, e]))

  const writes = []
  for (const d of demos) {
    const matches = new Map<string, number>()
    jobs.forEach((j, i) => {
      if (jobMatches(j, d.matchKeywords, d.excludeKeywords)) matches.set(weekOf[i], (matches.get(weekOf[i]) ?? 0) + 1)
    })
    for (const [week, total] of totals) {
      const old = prev.get(`${d.id}|${week}`)
      const m = Math.max(old?.matches ?? 0, matches.get(week) ?? 0)
      const t = Math.max(old?.totalCaptured ?? 0, total)
      if (old && old.matches === m && old.totalCaptured === t) continue
      const weekStart = new Date(`${week}T00:00:00Z`)
      writes.push(
        prisma.demoDemandWeek.upsert({
          where: { demoId_weekStart: { demoId: d.id, weekStart } },
          create: { demoId: d.id, weekStart, matches: m, totalCaptured: t },
          update: { matches: m, totalCaptured: t },
        }),
      )
    }
  }
  if (writes.length) await prisma.$transaction(writes)
}
