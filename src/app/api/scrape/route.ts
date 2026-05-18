import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { spawn } from 'child_process'
import path from 'path'

const bodySchema = z.object({
  zoneId: z.string().nullish(),  // null/undefined = todas las zonas activas
})

// GET — lista las últimas corridas (para mostrar estado en UI)
export async function GET() {
  const error = await requireAdmin()
  if (error) return error

  const runs = await prisma.scrapeRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(runs)
}

// POST — dispara un scrape (en background) y retorna inmediatamente con el ScrapeRun
export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  let body: unknown = {}
  try { body = await req.json() } catch { /* body opcional */ }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // ¿Hay alguna corrida activa? No permitir paralelismo (Inmuebles24 puede bloquear)
  const running = await prisma.scrapeRun.findFirst({
    where: { status: 'RUNNING' },
  })
  if (running) {
    return NextResponse.json(
      { error: 'Ya hay un scrape corriendo', runId: running.id },
      { status: 409 }
    )
  }

  // Determinar zona objetivo
  let zoneName = 'Todas las zonas'
  let zonaArg: string | null = null

  if (parsed.data.zoneId) {
    const zone = await prisma.zone.findUnique({ where: { id: parsed.data.zoneId } })
    if (!zone) return NextResponse.json({ error: 'Zona no encontrada' }, { status: 404 })
    if (!zone.active) return NextResponse.json({ error: 'La zona está inactiva' }, { status: 400 })
    zoneName = zone.name
    zonaArg = zone.name
  } else {
    const activeCount = await prisma.zone.count({ where: { active: true } })
    if (activeCount === 0) {
      return NextResponse.json({ error: 'No hay zonas activas' }, { status: 400 })
    }
  }

  // Crear ScrapeRun
  const run = await prisma.scrapeRun.create({
    data: {
      zoneId: parsed.data.zoneId ?? null,
      zoneName,
      status: 'RUNNING',
    },
  })

  // Spawn child process en background
  const cwd = process.cwd()
  const scriptArgs = ['run', 'scrape', '--', '--run-id', run.id]
  if (zonaArg) scriptArgs.push('--zona', zonaArg)

  const child = spawn('npm', scriptArgs, {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  })
  child.unref()

  return NextResponse.json({ runId: run.id, zoneName }, { status: 202 })
}
