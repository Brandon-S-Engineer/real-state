import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import PriceHistoryChart from '@/components/dashboard/price-history-chart'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

const STATUS_LABEL = { ACTIVE: 'Activo', SOLD: 'Vendido', SUSPENDED: 'Suspendido', OVERPRICED: 'Sobreprecio' }
const STATUS_CLASS = {
  ACTIVE:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  SOLD:       'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SUSPENDED:  'bg-muted text-muted-foreground',
  OVERPRICED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className='space-y-0.5'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='text-sm font-medium'>{value ?? '—'}</p>
    </div>
  )
}

function DealScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className='text-muted-foreground text-sm'>Sin datos</span>
  const abs = Math.abs(score).toFixed(1)
  if (score >= 10) return (
    <span className='inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400'>
      <TrendingDown className='h-4 w-4' />{abs}% abajo del promedio
    </span>
  )
  if (score > 0) return (
    <span className='inline-flex items-center gap-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-400'>
      <Minus className='h-4 w-4' />{abs}% abajo del promedio
    </span>
  )
  return (
    <span className='inline-flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400'>
      <TrendingUp className='h-4 w-4' />{abs}% arriba del promedio
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Params = { params: Promise<{ id: string }> }

export default async function PropiedadDetailPage({ params }: Params) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const [listing, historia] = await Promise.all([
    prisma.listing.findUnique({ where: { id } }),
    prisma.priceHistory.findMany({
      where: { listingId: id },
      orderBy: { recordedAt: 'asc' },
      select: { price: true, changeType: true, recordedAt: true },
    }),
  ])

  if (!listing) notFound()

  const chartData = historia.map((h) => ({
    date: h.recordedAt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }),
    price: h.price,
  }))

  return (
    <div className='p-6 space-y-6 max-w-4xl'>
      {/* Back + title */}
      <div className='space-y-1'>
        <Link
          href='/dashboard/propiedades'
          className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          Propiedades
        </Link>
        <a
          href={listing.sourceUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='group inline-flex items-start gap-2 hover:text-primary transition-colors'
        >
          <h1 className='text-lg font-semibold leading-tight'>{listing.title}</h1>
          <ExternalLink className='h-4 w-4 mt-1 shrink-0 text-muted-foreground group-hover:text-primary transition-colors' />
        </a>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_CLASS[listing.status])}>
            {STATUS_LABEL[listing.status]}
          </span>
          {listing.zona && <span className='text-sm text-muted-foreground'>{listing.zona}</span>}
          {listing.desarrollo && <span className='text-sm text-muted-foreground'>· {listing.desarrollo}</span>}
        </div>

        <a
          href={listing.sourceUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity'
        >
          <ExternalLink className='h-3.5 w-3.5' />
          Ver en Inmuebles24
        </a>
      </div>

      {/* Métricas principales */}
      <div className='rounded-lg border p-4 grid grid-cols-2 sm:grid-cols-4 gap-4'>
        <Stat label='Precio' value={fmt(listing.price)} />
        <Stat label='$/m²' value={listing.pricePerM2 ? fmt(listing.pricePerM2) : null} />
        <Stat label='Promedio zona' value={listing.zoneAvgPricePerM2 ? fmt(listing.zoneAvgPricePerM2) : null} />
        <div className='space-y-0.5'>
          <p className='text-xs text-muted-foreground'>Deal Score</p>
          <DealScoreBadge score={listing.dealScore} />
        </div>
      </div>

      {/* Características */}
      <div className='rounded-lg border p-4 grid grid-cols-2 sm:grid-cols-5 gap-4'>
        <Stat label='m² construidos' value={listing.m2Constructed ? `${listing.m2Constructed} m²` : null} />
        <Stat label='m² terreno' value={listing.m2Total ? `${listing.m2Total} m²` : null} />
        <Stat label='Recámaras' value={listing.bedrooms} />
        <Stat label='Baños' value={listing.bathrooms} />
        <Stat label='Estacionamientos' value={listing.parkingSpaces} />
      </div>

      {/* Historial de precios */}
      <div className='rounded-lg border p-4 space-y-3'>
        <div>
          <h2 className='text-sm font-medium'>Historial de precios</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {historia.length === 1
              ? 'Primera vez visto'
              : `${historia.length} registros`}
          </p>
        </div>

        {historia.length <= 1 ? (
          <p className='text-sm text-muted-foreground py-6 text-center'>
            Solo hay un registro de precio — la gráfica aparecerá cuando el scraper detecte cambios.
          </p>
        ) : (
          <PriceHistoryChart data={chartData} />
        )}
      </div>

      {/* Fechas */}
      <div className='text-xs text-muted-foreground space-x-4'>
        <span>Visto por primera vez: {listing.firstSeenAt.toLocaleDateString('es-MX')}</span>
        <span>Último scrape: {listing.lastSeenAt.toLocaleDateString('es-MX')}</span>
      </div>
    </div>
  )
}
