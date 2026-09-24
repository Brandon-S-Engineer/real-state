import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { zoneSchema } from '@/lib/electronicos/schemas'
import { ensureDefaultZones } from '@/lib/electronicos/zones'
import { toZoneDTO } from '@/lib/electronicos/serialize'


export async function GET() {
  const error = await requireAdmin()
  if (error) return error
  return NextResponse.json({ data: (await ensureDefaultZones()).map(toZoneDTO) })
}

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = zoneSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const zone = await prisma.elecZone.create({ data: parsed.data })
  return NextResponse.json(toZoneDTO(zone), { status: 201 })
}
