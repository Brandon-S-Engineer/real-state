import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getElecSettings } from '@/lib/electronicos/stats'

export async function GET() {
  const error = await requireAdmin()
  if (error) return error
  return NextResponse.json(await getElecSettings())
}

const patchSchema = z.object({
  minScoreAlert: z.number().int().min(0).max(10).optional(),
  disappearSessions: z.number().int().min(1).max(10).optional(),
  disappearMinHours: z.number().int().min(1).max(720).optional(),
  fastSaleDays: z.number().int().min(1).max(60).optional(),
  windowDays: z.number().int().min(7).max(365).optional(),
  minSample: z.number().int().min(1).max(50).optional(),
})

export async function PATCH(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const settings = await prisma.elecSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...parsed.data },
    update: parsed.data,
  })
  return NextResponse.json(settings)
}
