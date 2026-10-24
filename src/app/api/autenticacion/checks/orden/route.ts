import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { authCheckOrderSchema } from '@/lib/electronicos/schemas'

// Recibe los ids en el orden nuevo y reescribe position
export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = authCheckOrderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  await prisma.$transaction(parsed.data.ids.map((id, position) => prisma.authCheck.updateMany({ where: { id }, data: { position } })))
  return NextResponse.json({ ok: true })
}
