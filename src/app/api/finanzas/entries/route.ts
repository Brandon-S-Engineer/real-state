import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { entrySchema } from '@/lib/finanzas/shared'
import { toEntryDTO } from '@/lib/finanzas/server'

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = entrySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data
  const fxRate = d.currency === 'MXN' ? 1 : d.fxRate
  const entry = await prisma.financeEntry.create({
    data: { ...d, fxRate, note: d.note || null, amountMxn: Math.round(d.amount * fxRate * 100) / 100 },
  })
  return NextResponse.json(toEntryDTO(entry), { status: 201 })
}
