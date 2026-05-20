// ── Inbox: endpoint para que la extensión de Chrome (o cualquier integración)
//    cree leads desde FB Groups con un solo POST.
//
// Acepta auth por sesión NextAuth (admin) O por API key Bearer.
// Soporta CORS para que la extensión Chrome pueda llamarlo desde su origen.

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSessionOrApiKey, CORS_HEADERS, corsOk } from '@/lib/api-auth'

const inboxSchema = z.object({
  autor:        z.string().min(1).max(200),
  textoPost:    z.string().min(1).max(5000),
  grupo:        z.string().min(1).max(200),
  urlPost:      z.string().url().optional(),
  tipo:         z.enum(['POST', 'COMMENT']).default('POST'),
  postPadre:    z.string().max(2000).optional(),   // si es COMMENT, contexto del post original
})

export function OPTIONS() {
  return corsOk()
}

export async function POST(req: Request) {
  const authError = await requireSessionOrApiKey(req)
  if (authError) {
    // Mantener CORS headers en errores también
    authError.headers.set('Access-Control-Allow-Origin', '*')
    return authError
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS })
  }

  const parsed = inboxSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const { autor, textoPost, grupo, urlPost, tipo, postPadre } = parsed.data

  // Armar notas con todo el contexto disponible
  const notasParts: string[] = [
    `Capturado desde Facebook Group: ${grupo}`,
    `Tipo: ${tipo === 'POST' ? 'Publicación' : 'Comentario'}`,
  ]
  if (tipo === 'COMMENT' && postPadre) {
    notasParts.push('', '─── Post original ───', postPadre, '─────────────────────')
  }
  notasParts.push('', `${tipo === 'POST' ? 'Publicación' : 'Comentario'}:`, textoPost)
  if (urlPost) notasParts.push('', `Link: ${urlPost}`)

  const cliente = await prisma.cliente.create({
    data: {
      nombre: autor,
      telefono: null,
      type: 'COMPRADOR',
      etapa: 'D',                  // sin calificar — tú decides después
      fuente: 'FACEBOOK',
      notasPerma: notasParts.join('\n'),
      // Primer contacto registrado: lo capturamos
      contactos: {
        create: {
          tipo: 'NOTA',
          estado: 'REALIZADO',
          fechaProgramada: new Date(),
          realizadoAt: new Date(),
          resumen: `Detectado en ${grupo}${urlPost ? ` — ${urlPost}` : ''}`,
        },
      },
    },
    select: { id: true, nombre: true },
  })

  return NextResponse.json(
    { id: cliente.id, nombre: cliente.nombre, url: `/dashboard/clientes/${cliente.id}` },
    { status: 201, headers: CORS_HEADERS },
  )
}
