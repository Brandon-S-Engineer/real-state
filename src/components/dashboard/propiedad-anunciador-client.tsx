'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type PropiedadAnuncio, usePropiedadAnunciador } from '@/lib/propiedad-anunciador-store'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrecio(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function tipoYZona(p: PropiedadAnuncio, prefijo: string): string {
  const base = `${prefijo} en ${p.zona}`
  return p.desarrollo ? `${base} — ${p.desarrollo}` : base
}

function fichaTecnica(p: PropiedadAnuncio): string {
  const parts: string[] = []
  if (p.m2Constructed) parts.push(`${p.m2Constructed} m²`)
  if (p.bedrooms != null) parts.push(`${p.bedrooms} ${p.bedrooms === 1 ? 'recámara' : 'recámaras'}`)
  if (p.bathrooms != null) parts.push(`${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}`)
  if (p.parkingSpaces != null) parts.push(`${p.parkingSpaces} ${p.parkingSpaces === 1 ? 'estacionamiento' : 'estacionamientos'}`)
  return parts.join(' · ')
}

// ── Templates ─────────────────────────────────────────────────────────────────

function generarCorto(p: PropiedadAnuncio): string {
  const lines: string[] = []
  lines.push(tipoYZona(p, 'Departamento'))
  lines.push('')
  lines.push(fmtPrecio(p.price))
  const ficha = fichaTecnica(p)
  if (ficha) lines.push(ficha)
  lines.push('')
  lines.push('Escribeme para más información.')
  return lines.join('\n').trim()
}

function generarEstandar(p: PropiedadAnuncio): string {
  const lines: string[] = []
  lines.push(tipoYZona(p, 'Departamento en venta'))
  lines.push('')
  lines.push(`Precio: ${fmtPrecio(p.price)}`)
  const ficha = fichaTecnica(p)
  if (ficha) lines.push(ficha)
  lines.push('')
  if (p.amenities.length > 0) {
    const lista = p.amenities.slice(0, 6).join(', ').toLowerCase()
    lines.push(`Amenidades: ${lista}.`)
    lines.push('')
  }
  lines.push('Ubicado en una de las zonas más exclusivas de la ciudad, con acceso a centros comerciales, colegios y servicios.')
  lines.push('')
  lines.push('Escribeme para agendar una visita o recibir más información.')
  return lines.join('\n').trim()
}

function generarPremium(p: PropiedadAnuncio): string {
  const lines: string[] = []
  lines.push(`Exclusivo departamento en ${p.zona}`)
  if (p.desarrollo) lines.push(p.desarrollo)
  lines.push('')

  const detalleParts: string[] = []
  if (p.m2Constructed) detalleParts.push(`${p.m2Constructed} m² de superficie`)
  if (p.bedrooms != null) detalleParts.push(`${p.bedrooms} ${p.bedrooms === 1 ? 'recámara' : 'recámaras'}`)
  if (p.bathrooms != null) detalleParts.push(`${p.bathrooms} ${p.bathrooms === 1 ? 'baño completo' : 'baños completos'}`)
  if (p.parkingSpaces != null) detalleParts.push(`${p.parkingSpaces} ${p.parkingSpaces === 1 ? 'cajón' : 'cajones'} de estacionamiento`)

  if (detalleParts.length > 0) {
    lines.push(`Vive con amplitud y confort en este espectacular departamento: ${detalleParts.join(', ')}.`)
    lines.push('')
  }

  if (p.amenities.length > 0) {
    const lista = p.amenities.slice(0, 8).join(', ').toLowerCase()
    lines.push(`El desarrollo cuenta con amenidades de primer nivel: ${lista}.`)
    lines.push('')
  }

  lines.push(`Precio: ${fmtPrecio(p.price)} MXN.`)
  lines.push('')
  lines.push(`Ubicación privilegiada en ${p.zona}, con cercanía a hospitales, supermercados, colegios y vías rápidas de acceso.`)
  lines.push('')
  lines.push('Escribeme para conocer más detalles, programar una visita o recibir el folleto digital.')
  return lines.join('\n').trim()
}

const TEMPLATES = [
  { id: 'corto',    label: 'Corto',    desc: 'Ficha técnica directa, sin floritura.',   gen: generarCorto },
  { id: 'estandar', label: 'Estándar', desc: 'Con amenidades y un párrafo de contexto.', gen: generarEstandar },
  { id: 'premium',  label: 'Premium',  desc: 'Más narrativo, ideal para listings altos.', gen: generarPremium },
] as const

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter()
  return (
    <div className='flex flex-col items-center justify-center gap-5 py-24'>
      <div className='h-16 w-16 rounded-2xl bg-muted flex items-center justify-center'>
        <Building2 className='h-8 w-8 text-muted-foreground' />
      </div>
      <div className='text-center max-w-sm'>
        <h2 className='text-lg font-semibold'>Ninguna propiedad seleccionada</h2>
        <p className='text-sm text-muted-foreground mt-2 leading-relaxed'>
          Ve a propiedades y haz click en el ícono de megáfono de cualquier fila para generar anuncios.
        </p>
      </div>
      <Button variant='outline' onClick={() => router.push('/dashboard/propiedades')}>
        <ArrowLeft className='h-4 w-4 mr-2' />
        Ir a propiedades
      </Button>
    </div>
  )
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ label, desc, initial }: { label: string; desc: string; initial: string }) {
  const [text, setText] = useState(initial)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setText(initial) }, [initial])

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lineCount = text.split('\n').length

  return (
    <div className='rounded-xl border bg-card overflow-hidden'>
      <div className='flex items-start justify-between gap-3 px-4 py-3 border-b bg-muted/30'>
        <div className='min-w-0'>
          <p className='text-sm font-semibold'>{label}</p>
          <p className='text-xs text-muted-foreground mt-0.5'>{desc}</p>
        </div>
        <Button onClick={copy} size='sm' className='gap-1.5 shrink-0'>
          {copied ? <Check className='h-3.5 w-3.5' /> : <Copy className='h-3.5 w-3.5' />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.max(8, lineCount + 1)}
        className='w-full bg-background px-4 py-3 text-sm leading-relaxed resize-none focus-visible:outline-none border-0'
      />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PropiedadAnunciadorClient() {
  const { propiedad } = usePropiedadAnunciador()
  const router = useRouter()

  const textos = useMemo(() => {
    if (!propiedad) return null
    return TEMPLATES.map((t) => ({ ...t, text: t.gen(propiedad) }))
  }, [propiedad])

  if (!propiedad || !textos) return <EmptyState />

  return (
    <div className='p-6 space-y-6 max-w-5xl'>
      {/* Header */}
      <div className='flex items-start gap-3'>
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={() => router.push('/dashboard/propiedades')}
          className='mt-0.5 shrink-0'
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div className='flex-1 min-w-0'>
          <p className='text-xs text-muted-foreground'>{propiedad.zona}{propiedad.desarrollo ? ` · ${propiedad.desarrollo}` : ''}</p>
          <h1 className='text-lg font-semibold leading-tight truncate'>
            {fmtPrecio(propiedad.price)}
            <span className='ml-2 text-sm font-normal text-muted-foreground'>
              {fichaTecnica(propiedad)}
            </span>
          </h1>
        </div>
      </div>

      {/* Templates */}
      <div className='space-y-4'>
        <p className='text-xs text-muted-foreground'>
          Tres plantillas para que compares y elijas. Puedes editar cualquiera antes de copiar.
        </p>
        {textos.map((t) => (
          <TemplateCard key={t.id} label={t.label} desc={t.desc} initial={t.text} />
        ))}
      </div>
    </div>
  )
}
