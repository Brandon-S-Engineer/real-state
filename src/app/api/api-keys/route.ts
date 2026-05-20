import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateApiKey } from '@/lib/api-auth'

const createSchema = z.object({
  name: z.string().min(1).max(80),
})

export async function GET() {
  const error = await requireAdmin()
  if (error) return error

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
  })

  return NextResponse.json(keys)
}

export async function POST(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { plaintext, hash, prefix } = generateApiKey()

  const apiKey = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      keyHash: hash,
      prefix,
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  })

  // El plaintext SOLO se devuelve aquí. Después de esto, nunca más.
  return NextResponse.json({ ...apiKey, plaintext }, { status: 201 })
}
