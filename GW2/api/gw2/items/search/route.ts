import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Sección GW2 sin autenticación a propósito — herramienta de uso personal,
// datos de economía de juego, no hay nada sensible (CRM real sigue detrás de login).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const items = await prisma.gw2Item.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
    take: 20,
  })
  return NextResponse.json(items)
}
