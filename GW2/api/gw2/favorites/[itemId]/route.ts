import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params
  const id = Number(itemId)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await prisma.gw2Favorite.deleteMany({ where: { itemId: id } })
  return NextResponse.json({ ok: true })
}
