import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { entrySchema } from '@/lib/finanzas/shared'
import { toEntryDTO } from '@/lib/finanzas/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = entrySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data
  const fxRate = d.currency === 'MXN' ? 1 : d.fxRate
  const entry = await prisma.financeEntry.update({
    where: { id },
    data: { ...d, fxRate, note: d.note || null, amountMxn: Math.round(d.amount * fxRate * 100) / 100 },
  }).catch(() => null)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toEntryDTO(entry))
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  await prisma.financeEntry.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
