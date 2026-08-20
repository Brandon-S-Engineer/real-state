// ── Captura de jobs de Upwork: la extensión solo manda el job crudo aquí,
//    el servidor calcula el score y hace upsert por uid (dedup).
//
// Acepta auth por sesión NextAuth (admin) O por API key Bearer.
// Soporta CORS para que la extensión Chrome pueda llamarlo desde su origen.

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireSessionOrApiKey, CORS_HEADERS, corsOk } from '@/lib/api-auth'
import { requireAdmin } from '@/lib/require-admin'
import { scoreUpworkJob } from '@/lib/upwork-score'

const jobSchema = z.object({
  uid:          z.string().min(1),
  title:        z.string().min(1),
  url:          z.string().min(1),
  description:  z.string().optional(),
  skills:       z.string().optional(),
  skillList:    z.array(z.string()).optional(),
  budget:       z.string().optional(),
  proposals:    z.number().optional(),
  proposalText: z.string().optional(),
  clientSpent:  z.number().optional(),
  spentText:    z.string().optional(),
  postedText:   z.string().optional(),
  postedHours:  z.number().optional(),
})

const bodySchema = z.array(jobSchema).min(1).max(200)

export function OPTIONS() {
  return corsOk()
}

export async function POST(req: Request) {
  const authError = await requireSessionOrApiKey(req)
  if (authError) {
    authError.headers.set('Access-Control-Allow-Origin', '*')
    return authError
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: CORS_HEADERS })
  }

  let created = 0
  let updated = 0
  let failed = 0

  // Varias pestañas de Upwork abiertas a la vez se recargan juntas (mismo
  // alarm) y mandan su POST casi al mismo instante. Si el mismo job nuevo
  // aparece en 2 búsquedas distintas, dos requests pueden competir por crear
  // la misma fila (mismo uid) en paralelo. Cada job se procesa en su propio
  // try/catch para que esa colisión — o cualquier otro error puntual — no
  // tumbe el resto del batch de esa pestaña.
  for (const job of parsed.data) {
    try {
      await upsertJob(job)
    } catch (err) {
      failed++
      console.error(`upwork job POST falló para uid=${job.uid}:`, err)
    }
  }

  return NextResponse.json({ created, updated, failed }, { status: 201, headers: CORS_HEADERS })

  async function findExisting(job: z.infer<typeof jobSchema>) {
    const byUid = await prisma.upworkJob.findUnique({ where: { uid: job.uid } })
    if (byUid) return byUid

    // Red de seguridad: Upwork a veces sirve el MISMO job posting con dos IDs
    // internos distintos dentro de la misma página (p.ej. aparece una vez en
    // el listado normal y otra vez en un carrusel de "recomendados"). Con
    // varias búsquedas corriendo en paralelo con intervalos distintos (hasta
    // 60 min + jitter), dos tabs pueden tropezarse con ese mismo duplicado
    // con horas de diferencia, no solo segundos — por eso la ventana es
    // generosa (3h, más que el intervalo más largo configurable). Mismo
    // título + mismo presupuesto en esa ventana ≈ casi seguro el mismo job
    // real — lo tratamos como tal en vez de crear una fila (y dispararle una
    // alerta) duplicada. Riesgo aceptado: dos clientes distintos posteando el
    // mismo título genérico sin presupuesto fijo en esa ventana se
    // fusionarían — poco probable y de bajo costo si pasa.
    return prisma.upworkJob.findFirst({
      where: {
        title: job.title,
        budget: job.budget ?? undefined,
        createdAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async function upsertJob(job: z.infer<typeof jobSchema>) {
    const existing = await findExisting(job)

    // Mezcla primero con lo ya guardado — si la extensión manda un payload
    // parcial (p.ej. solo refresca proposals/postedHours), el score se calcula
    // sobre los datos completos, no sobre el fragmento recién recibido.
    const skillsArr = job.skillList?.length
      ? job.skillList
      : job.skills
        ? job.skills.split(/\s{2,}|,/).map((s) => s.trim()).filter(Boolean)
        : (Array.isArray(existing?.skills) ? existing.skills as string[] : [])

    const merged = {
      uid: job.uid,
      title: job.title,
      url: job.url,
      description: job.description ?? existing?.description,
      skills: skillsArr.join(' '),
      budget: job.budget ?? existing?.budget,
      proposals: job.proposals ?? existing?.proposals,
      proposalText: job.proposalText ?? existing?.proposalText,
      clientSpent: job.clientSpent ?? existing?.clientSpent,
      spentText: job.spentText ?? existing?.spentText,
      postedText: job.postedText ?? existing?.postedText,
      postedHours: job.postedHours ?? existing?.postedHours,
    }

    const { score, reasons } = scoreUpworkJob(merged)

    const updateData = {
      title: job.title,
      url: job.url,
      description: merged.description,
      skills: skillsArr,
      budget: merged.budget,
      proposals: merged.proposals,
      proposalText: merged.proposalText,
      clientSpent: merged.clientSpent,
      spentText: merged.spentText,
      postedText: merged.postedText,
      postedHours: merged.postedHours,
      score,
      reasons,
      lastSeenAt: new Date(),
    }

    if (existing) {
      await prisma.upworkJob.update({ where: { id: existing.id }, data: updateData })
      updated++
      return
    }

    try {
      await prisma.upworkJob.create({
        data: {
          uid: job.uid,
          ...updateData,
          // Foto de la antigüedad reportada por Upwork en el momento exacto en
          // que vemos el job por primera vez — nunca se vuelve a tocar. Sin esto,
          // un job que ya tenía 5h cuando lo capturamos por primera vez se
          // mostraría como "recién publicado" (edad = solo tiempo desde que
          // nosotros lo vimos, ignorando que ya tenía horas encima).
          initialPostedHours: merged.postedHours ?? 0,
        },
      })
      created++
    } catch (err) {
      // Con varias pestañas escaneando búsquedas distintas, el mismo job
      // nuevo puede llegar por 2 requests casi al mismo tiempo — ninguna vio
      // la fila del otro en el findUnique de arriba, y la segunda create()
      // choca contra el índice único de uid. En vez de perder el batch
      // entero de esa pestaña, tratamos esto como "alguien más ya lo creó" y
      // actualizamos esa fila con nuestros datos.
      const isUidCollision = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
      if (!isUidCollision) throw err

      const winner = await prisma.upworkJob.findUnique({ where: { uid: job.uid } })
      if (!winner) throw err
      await prisma.upworkJob.update({ where: { id: winner.id }, data: updateData })
      updated++
    }
  }
}

const querySchema = z.object({
  q:               z.string().optional(),
  scoreMin:        z.coerce.number().optional(),
  postedHoursMax:  z.coerce.number().optional(),
  proposalsMax:    z.coerce.number().optional(),
  ganado:          z.enum(['true', 'false']).optional(),
  page:            z.coerce.number().int().min(1).default(1),
  limit:           z.coerce.number().int().min(1).max(500).default(200),
  sortBy:          z.enum(['score', 'postedHours', 'createdAt', 'lastSeenAt']).default('score'),
  sortDir:         z.enum(['asc', 'desc']).default('desc'),
})

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { q, scoreMin, postedHoursMax, proposalsMax, ganado, page, limit, sortBy, sortDir } = parsed.data

  const where: Prisma.UpworkJobWhereInput = {
    ...(scoreMin !== undefined && { score: { gte: scoreMin } }),
    ...(postedHoursMax !== undefined && { postedHours: { lte: postedHoursMax } }),
    ...(proposalsMax !== undefined && { proposals: { lte: proposalsMax } }),
    ...(ganado !== undefined && { ganado: ganado === 'true' }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    }),
  }

  const [total, jobs] = await Promise.all([
    prisma.upworkJob.count({ where }),
    prisma.upworkJob.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    data: jobs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

// ── Purga ────────────────────────────────────────────────────────────────────
// Vacía la tabla para poder calibrar una búsqueda desde cero: se limpia, se
// deja correr SOLO la búsqueda nueva, y lo que aparezca es señal limpia de qué
// tan buena es esa query (sin el ruido de todas las búsquedas anteriores).
//
// Los jobs marcados como ganado se conservan siempre — son historial real, no
// ruido de calibración. Con ?includeGanado=true se borran también.

export async function DELETE(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const includeGanado = searchParams.get('includeGanado') === 'true'

  const { count } = await prisma.upworkJob.deleteMany({
    where: includeGanado ? {} : { ganado: false },
  })

  const kept = includeGanado ? 0 : await prisma.upworkJob.count()

  return NextResponse.json({ ok: true, deleted: count, kept })
}
