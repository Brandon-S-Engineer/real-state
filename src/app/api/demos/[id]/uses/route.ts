import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { demoUseSchema } from '@/lib/demos/shared'
import { toUseDTO } from '@/lib/demos/server'

type Params = { params: Promise<{ id: string }> }

// Registrar que este demo se usó en una propuesta.
export async function POST(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = demoUseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data

  // Si no eligieron un job capturado pero pegaron su URL, intenta ligarlo solo.
  let upworkJobId = d.upworkJobId ?? null
  if (!upworkJobId && d.jobUrl) {
    const job = await prisma.upworkJob.findFirst({ where: { url: d.jobUrl }, select: { id: true } })
    upworkJobId = job?.id ?? null
  }

  const use = await prisma.demoUse.create({
    data: { demoId: id, upworkJobId, jobTitle: d.jobTitle, jobUrl: d.jobUrl, sentAt: d.sentAt ?? new Date(), outcome: d.outcome, notes: d.notes },
  }).catch(() => null)
  if (!use) return NextResponse.json({ error: 'Demo no encontrado' }, { status: 404 })
  return NextResponse.json(toUseDTO(use), { status: 201 })
}
