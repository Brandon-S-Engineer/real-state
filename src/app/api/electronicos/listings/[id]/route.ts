import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildConfigKey } from '@/lib/electronicos/parse-specs'
import { getElecSettings, indexGroups, loadWindowRows, scoreListing } from '@/lib/electronicos/stats'
import { toListingDTO } from '@/lib/electronicos/serialize'

const patchSchema = z.object({
  comprado: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['ACTIVO', 'DESAPARECIDO']).optional(),
  // Corrección manual de specs → specsManual = true (el re-parseo ya no los toca)
  specs: z.object({
    line: z.string().nullable(),
    chip: z.string().nullable(),
    ramGb: z.number().int().nullable(),
    ssdGb: z.number().int().nullable(),
    price: z.number().nullable().optional(),
  }).optional(),
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

  const existing = await prisma.elecListing.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { comprado, notes, status, specs } = parsed.data
  let listing = await prisma.elecListing.update({
    where: { id },
    data: {
      ...(comprado !== undefined && { comprado, compradoAt: comprado ? new Date() : null }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && {
        status,
        disappearedAt: status === 'DESAPARECIDO' ? existing.disappearedAt ?? new Date() : null,
        daysOnMarket: status === 'DESAPARECIDO'
          ? Math.round(((Date.now() - (existing.postedAt ?? existing.firstSeenAt).getTime()) / 86_400_000) * 10) / 10
          : null,
      }),
      ...(specs && {
        line: specs.line, chip: specs.chip, ramGb: specs.ramGb, ssdGb: specs.ssdGb,
        ...(specs.price !== undefined && { price: specs.price }),
        configKey: buildConfigKey(specs),
        specsManual: true,
        needsReview: false,
        parseConfidence: 1,
        parseNotes: 'corregido a mano',
      }),
    },
    include: { zone: true },
  })

  if (specs) {
    const settings = await getElecSettings()
    const { score, reasons } = scoreListing(listing, indexGroups(await loadWindowRows(settings)), settings)
    listing = await prisma.elecListing.update({ where: { id }, data: { opportunityScore: score, scoreReasons: reasons }, include: { zone: true } })
  }

  return NextResponse.json(toListingDTO(listing))
}

export async function DELETE(_req: Request, { params }: Params) {
  const error = await requireAdmin()
  if (error) return error
  const { id } = await params
  await prisma.elecListing.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
