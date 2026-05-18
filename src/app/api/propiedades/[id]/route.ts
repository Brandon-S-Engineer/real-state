import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
  title:        z.string().min(1).optional(),
  zona:         z.string().min(1).optional(),
  desarrollo:   z.string().nullable().optional(),
  price:        z.number().positive().optional(),
  m2Constructed: z.number().positive().nullable().optional(),
  m2Total:      z.number().positive().nullable().optional(),
  bedrooms:     z.number().int().nonnegative().nullable().optional(),
  bathrooms:    z.number().nonnegative().nullable().optional(),
  parkingSpaces: z.number().int().nonnegative().nullable().optional(),
  floor:        z.number().int().nullable().optional(),
  notes:        z.string().nullable().optional(),
  status:       z.enum(['ACTIVE', 'SOLD', 'SUSPENDED', 'OVERPRICED']).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params
  const listing = await prisma.listing.findUnique({ where: { id } })
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(listing)
}

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.listing.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Si el precio cambió manualmente, registrar en historial
  const data = parsed.data
  const priceChanged = data.price !== undefined && Math.abs(existing.price - data.price) > 1
  const changeType = data.price !== undefined && data.price > existing.price ? 'INCREASE' : 'DECREASE'

  const listing = await prisma.listing.update({
    where: { id },
    data: {
      ...data,
      ...(priceChanged && data.price !== undefined
        ? {
            priceHistory: {
              create: { price: data.price, changeType, recordedAt: new Date() },
            },
          }
        : {}),
    },
  })

  return NextResponse.json(listing)
}
