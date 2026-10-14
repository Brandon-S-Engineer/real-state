import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
  ganado: z.boolean().optional(),
  vigilando: z.boolean().optional(),
  oculto: z.boolean().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.upworkJob.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const job = await prisma.upworkJob.update({
    where: { id },
    data: {
      ...(parsed.data.ganado !== undefined && { ganado: parsed.data.ganado, ganadoAt: parsed.data.ganado ? new Date() : null }),
      ...(parsed.data.vigilando !== undefined && { vigilando: parsed.data.vigilando }),
      ...(parsed.data.oculto !== undefined && { oculto: parsed.data.oculto }),
    },
  })

  return NextResponse.json(job)
}
