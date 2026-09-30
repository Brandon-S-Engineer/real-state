import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { USE_OUTCOMES } from '@/lib/demos/shared'
import { toUseDTO } from '@/lib/demos/server'

type Params = { params: Promise<{ useId: string }> }

const patchSchema = z.object({
  outcome: z.enum(USE_OUTCOMES).optional(),
  notes: z.string().trim().nullable().optional().transform((v) => (v === undefined ? undefined : v || null)),
})

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { useId } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const use = await prisma.demoUse.update({ where: { id: useId }, data: parsed.data }).catch(() => null)
  if (!use) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toUseDTO(use))
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { useId } = await params
  await prisma.demoUse.delete({ where: { id: useId } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
