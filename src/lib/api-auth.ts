// ── Auth helper para endpoints que acepten sesión O API key ──────────────────
//
// Las API keys se generan con prefijo "rsk_" (real state key) + 40 chars random.
// Solo guardamos el hash sha256 en DB; el texto plano se muestra UNA vez al usuario
// al crearlo.

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'

const KEY_PREFIX = 'rsk_'
const KEY_BODY_LEN = 40

/** Genera una API key nueva (no la guarda — eso lo hace el caller). */
export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const body = randomBytes(30).toString('base64url').slice(0, KEY_BODY_LEN)
  const plaintext = `${KEY_PREFIX}${body}`
  const hash = createHash('sha256').update(plaintext).digest('hex')
  const prefix = plaintext.slice(0, 12)  // "rsk_xxxxxxxx" para mostrar en UI
  return { plaintext, hash, prefix }
}

function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

/**
 * Verifica request: acepta sesión NextAuth O Authorization: Bearer rsk_xxx
 * Devuelve null si autorizado, o NextResponse con error si no.
 *
 * Si se autoriza con API key, actualiza lastUsedAt en background.
 */
export async function requireSessionOrApiKey(req: Request): Promise<NextResponse | null> {
  // 1) Intentar sesión NextAuth (admin)
  const session = await auth()
  if (session && session.user.role === 'ADMIN') return null

  // 2) Intentar API key
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim()
    if (key.startsWith(KEY_PREFIX)) {
      const hash = hashKey(key)
      const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hash } })
      if (apiKey) {
        // Actualizar lastUsedAt sin bloquear la respuesta
        prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {})
        return null
      }
    }
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

/** Headers CORS para endpoints que la extensión va a llamar desde chrome-extension://* */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function corsOk() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
