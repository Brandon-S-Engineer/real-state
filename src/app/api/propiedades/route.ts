import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const querySchema = z.object({
  zona:        z.string().optional(),
  status:      z.enum(['ACTIVE', 'SOLD', 'SUSPENDED', 'OVERPRICED']).optional(),
  precioMin:   z.coerce.number().optional(),
  precioMax:   z.coerce.number().optional(),
  m2Min:       z.coerce.number().optional(),
  m2Max:       z.coerce.number().optional(),
  recamaras:   z.coerce.number().int().optional(),
  dealScoreMin: z.coerce.number().optional(),
  q:           z.string().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(200).default(50),
  sortBy:      z.enum(['price', 'pricePerM2', 'dealScore', 'm2Constructed', 'createdAt', 'firstSeenAt']).default('firstSeenAt'),
  sortDir:     z.enum(['asc', 'desc']).default('desc'),
})

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { zona, status, precioMin, precioMax, m2Min, m2Max, recamaras,
          dealScoreMin, q, page, limit, sortBy, sortDir } = parsed.data

  const where: Prisma.ListingWhereInput = {
    ...(zona   && { zona }),
    ...(status && { status }),
    ...(precioMin !== undefined || precioMax !== undefined) && {
      price: {
        ...(precioMin !== undefined && { gte: precioMin }),
        ...(precioMax !== undefined && { lte: precioMax }),
      },
    },
    ...(m2Min !== undefined || m2Max !== undefined) && {
      m2Constructed: {
        ...(m2Min !== undefined && { gte: m2Min }),
        ...(m2Max !== undefined && { lte: m2Max }),
      },
    },
    ...(recamaras  !== undefined && { bedrooms: recamaras }),
    ...(dealScoreMin !== undefined && { dealScore: { gte: dealScoreMin } }),
    ...(q && {
      OR: [
        { title:      { contains: q, mode: 'insensitive' } },
        { desarrollo: { contains: q, mode: 'insensitive' } },
      ],
    }),
  }

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, sourceId: true, sourceUrl: true, title: true,
        zona: true, desarrollo: true, price: true,
        m2Constructed: true, m2Total: true, bedrooms: true, bathrooms: true,
        parkingSpaces: true, floor: true,
        pricePerM2: true, zoneAvgPricePerM2: true, dealScore: true,
        status: true, notes: true,
        firstSeenAt: true, lastSeenAt: true, updatedAt: true,
        images: true,
      },
    }),
  ])

  return NextResponse.json({
    data: listings,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}
