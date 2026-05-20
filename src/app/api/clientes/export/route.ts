import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * Exporta TODA la data del CRM personal.
 * ?format=csv → planito con campos principales (para Excel)
 * ?format=json → dump completo (clientes + contactos) para portabilidad real
 */
export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'csv'

  const clientes = await prisma.cliente.findMany({
    include: { contactos: { orderBy: { fechaProgramada: 'asc' } } },
    orderBy: [{ etapa: 'asc' }, { nombre: 'asc' }],
  })

  const fechaStamp = new Date().toISOString().slice(0, 10)

  if (format === 'json') {
    return new NextResponse(JSON.stringify(clientes, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="crm-${fechaStamp}.json"`,
      },
    })
  }

  // CSV plano de clientes (sin contactos — eso va en JSON)
  const headers = [
    'nombre', 'telefono', 'email', 'type', 'etapa', 'fuente',
    'motivacion', 'timeline', 'presupuestoMin', 'presupuestoMax',
    'referredByName', 'tags', 'spouseName', 'birthday',
    'notasPerma', 'ultimoContactoAt', 'proximoContactoAt',
    'createdAt',
  ]

  const escape = (v: unknown): string => {
    if (v == null) return ''
    const s = v instanceof Date ? v.toISOString() : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const lines = [headers.join(',')]
  for (const c of clientes) {
    const tags = Array.isArray(c.tags) ? (c.tags as string[]).join('; ') : ''
    lines.push([
      escape(c.nombre),
      escape(c.telefono),
      escape(c.email),
      escape(c.type),
      escape(c.etapa),
      escape(c.fuente),
      escape(c.motivacion),
      escape(c.timeline),
      escape(c.presupuestoMin),
      escape(c.presupuestoMax),
      escape(c.referredByName),
      escape(tags),
      escape(c.spouseName),
      escape(c.birthday),
      escape(c.notasPerma),
      escape(c.ultimoContactoAt),
      escape(c.proximoContactoAt),
      escape(c.createdAt),
    ].join(','))
  }

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="crm-${fechaStamp}.csv"`,
    },
  })
}
