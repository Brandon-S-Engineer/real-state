import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { searchSchema } from '@/lib/electronicos/schemas'

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = searchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const s = await prisma.elecSearch.create({ data: parsed.data })
  return NextResponse.json(s, { status: 201 })
}
