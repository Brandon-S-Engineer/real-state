import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET() {
  const error = await requireAdmin()
  if (error) return error

  const settings = await prisma.upworkSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

  return NextResponse.json(settings)
}

const patchSchema = z.object({
  minScoreAlert: z.number().int().min(0).max(10),
})

export async function PATCH(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const settings = await prisma.upworkSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', minScoreAlert: parsed.data.minScoreAlert },
    update: { minScoreAlert: parsed.data.minScoreAlert },
  })

  return NextResponse.json(settings)
}
