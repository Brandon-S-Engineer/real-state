import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params
  const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true } })
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const historia = await prisma.priceHistory.findMany({
    where: { listingId: id },
    orderBy: { recordedAt: 'asc' },
    select: { id: true, price: true, changeType: true, recordedAt: true },
  })

  return NextResponse.json(historia)
}
