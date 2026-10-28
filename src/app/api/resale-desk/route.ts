// Endpoint público del Deal Desk de Resale Intelligence. Evalúa un anuncio
// real (por id) o uno pegado como texto, y transmite cada paso de los agentes
// como NDJSON para que la UI los muestre en vivo.

import { z } from 'zod'
import { DeskError, runDesk, type DeskEvent } from '@/lib/resale/desk'

export const runtime = 'nodejs'
export const maxDuration = 60

const bodySchema = z
  .object({
    listingId: z.string().min(5).max(40).optional(),
    text: z.string().min(8).max(1500).optional(),
  })
  .refine((b) => b.listingId || b.text, 'listingId or text is required')

// Mismo esquema que el agente del proyecto 01: límite por IP en memoria.
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 20
const hits = new Map<string, number[]>()

function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) return true
  recent.push(now)
  hits.set(ip, recent)
  return false
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (rateLimited(ip)) {
    return Response.json({ error: 'Demo limit reached for this hour. Try again later.' }, { status: 429 })
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: DeskEvent | { type: 'error'; message: string }) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'))
      try {
        await runDesk(parsed.data, send)
      } catch (e) {
        console.error('resale desk failed', e)
        send({ type: 'error', message: e instanceof DeskError ? e.message : 'Something went wrong. Try again.' })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } })
}
