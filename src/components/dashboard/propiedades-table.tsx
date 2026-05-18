'use client'

import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState, type ColumnFiltersState,
} from '@tanstack/react-table'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ExternalLink, RefreshCw, TrendingDown, TrendingUp, Minus, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Listing = {
  id: string
  sourceId: string
  sourceUrl: string
  title: string
  zona: string
  desarrollo: string | null
  price: number
  m2Constructed: number | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number | null
  pricePerM2: number | null
  zoneAvgPricePerM2: number | null
  dealScore: number | null
  status: 'ACTIVE' | 'SOLD' | 'SUSPENDED' | 'OVERPRICED'
  notes: string | null
  firstSeenAt: string
  lastSeenAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Listing['status'], string> = {
  ACTIVE: 'Activo',
  SOLD: 'Vendido',
  SUSPENDED: 'Suspendido',
  OVERPRICED: 'Sobreprecio',
}

const STATUS_CLASS: Record<Listing['status'], string> = {
  ACTIVE:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  SOLD:       'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SUSPENDED:  'bg-muted text-muted-foreground',
  OVERPRICED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function DealScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className='text-muted-foreground text-xs'>—</span>

  const abs = Math.abs(score).toFixed(1)

  if (score >= 10) return (
    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'>
      <TrendingDown className='h-3 w-3' />{abs}% abajo
    </span>
  )
  if (score > 0) return (
    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'>
      <Minus className='h-3 w-3' />{abs}% abajo
    </span>
  )
  return (
    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'>
      <TrendingUp className='h-3 w-3' />{abs}% arriba
    </span>
  )
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

// ── Filters bar ───────────────────────────────────────────────────────────────

type Filters = {
  q: string
  zona: string
  status: string
  recamaras: string
  precioMax: string
  dealScoreMin: string
}

type ZoneOpt = { id: string; name: string; active: boolean }

function FiltersBar({ filters, onChange, zonas, zoneOptions, onRecalcular, onScrape, scraping }: {
  filters: Filters
  onChange: (f: Partial<Filters>) => void
  zonas: string[]
  zoneOptions: ZoneOpt[]
  onRecalcular: () => void
  onScrape: (zoneId: string | null) => void
  scraping: boolean
}) {
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className='flex flex-wrap gap-2 items-end'>
      <Input
        placeholder='Buscar título o desarrollo...'
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value })}
        className='w-52'
      />

      <select
        value={filters.zona}
        onChange={(e) => onChange({ zona: e.target.value })}
        className='border rounded-md px-3 py-2 text-sm bg-background h-9'
      >
        <option value=''>Todas las zonas</option>
        {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value })}
        className='border rounded-md px-3 py-2 text-sm bg-background h-9'
      >
        <option value=''>Todos los status</option>
        <option value='ACTIVE'>Activo</option>
        <option value='SOLD'>Vendido</option>
        <option value='SUSPENDED'>Suspendido</option>
        <option value='OVERPRICED'>Sobreprecio</option>
      </select>

      <select
        value={filters.recamaras}
        onChange={(e) => onChange({ recamaras: e.target.value })}
        className='border rounded-md px-3 py-2 text-sm bg-background h-9'
      >
        <option value=''>Recámaras</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} rec.</option>)}
      </select>

      <div className='flex items-center gap-1'>
        <span className='text-sm text-muted-foreground whitespace-nowrap'>Máx. precio</span>
        <Input
          type='number'
          placeholder='15,000,000'
          value={filters.precioMax}
          onChange={(e) => onChange({ precioMax: e.target.value })}
          className='w-36'
        />
      </div>

      <div className='flex items-center gap-1'>
        <span className='text-sm text-muted-foreground whitespace-nowrap'>Deal ≥</span>
        <Input
          type='number'
          placeholder='10'
          value={filters.dealScoreMin}
          onChange={(e) => onChange({ dealScoreMin: e.target.value })}
          className='w-20'
        />
        <span className='text-sm text-muted-foreground'>%</span>
      </div>

      {hasFilters && (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => onChange({ q: '', zona: '', status: '', recamaras: '', precioMax: '', dealScoreMin: '' })}
        >
          Limpiar
        </Button>
      )}

      <div className='ml-auto flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            const matched = filters.zona
              ? zoneOptions.find((z) => z.name === filters.zona)
              : null
            onScrape(matched?.id ?? null)
          }}
          disabled={scraping}
        >
          {scraping ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <Play className='h-3.5 w-3.5 mr-1.5' />}
          {filters.zona ? `Scrapear ${filters.zona}` : 'Scrapear todas'}
        </Button>
        <Button variant='outline' size='sm' onClick={onRecalcular}>
          <RefreshCw className='h-3.5 w-3.5 mr-1.5' />
          Recalcular scores
        </Button>
      </div>
    </div>
  )
}

// ── ScrapeRun status banner ───────────────────────────────────────────────────

type ScrapeRun = {
  id: string
  zoneName: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAt: string
  finishedAt: string | null
  listingsNew: number
  listingsUpdated: number
  listingsUnchanged: number
  listingsSuspended: number
  error: string | null
}

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

function ScrapeStatusBanner({ runningRun, lastFinishedRun }: {
  runningRun: ScrapeRun | null
  lastFinishedRun: ScrapeRun | null
}) {
  if (runningRun) {
    return (
      <div className='rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm flex items-center gap-2'>
        <Loader2 className='h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0' />
        <span className='text-blue-900 dark:text-blue-200'>
          Scrapeando <strong>{runningRun.zoneName}</strong> — iniciado {relativeTime(runningRun.startedAt)}
          {runningRun.listingsNew + runningRun.listingsUpdated > 0 && (
            <span className='text-blue-700 dark:text-blue-300'>
              {' '}· {runningRun.listingsNew} nuevos, {runningRun.listingsUpdated} actualizados hasta ahora
            </span>
          )}
        </span>
      </div>
    )
  }

  if (!lastFinishedRun) return null

  const isFailed = lastFinishedRun.status === 'FAILED'
  return (
    <div className={cn(
      'rounded-md border px-3 py-2 text-sm flex items-center gap-2',
      isFailed
        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
        : 'border-border bg-muted/30 text-muted-foreground'
    )}>
      {isFailed
        ? <XCircle className='h-4 w-4 text-red-600 dark:text-red-400 shrink-0' />
        : <CheckCircle2 className='h-4 w-4 text-green-600 dark:text-green-400 shrink-0' />}
      <span>
        Último scrape de <strong className='text-foreground'>{lastFinishedRun.zoneName}</strong> {relativeTime(lastFinishedRun.finishedAt ?? lastFinishedRun.startedAt)}
        {!isFailed && (
          <>
            {' '}· +{lastFinishedRun.listingsNew} nuevos, ~{lastFinishedRun.listingsUpdated} actualizados
            {lastFinishedRun.listingsSuspended > 0 && `, ${lastFinishedRun.listingsSuspended} suspendidos`}
          </>
        )}
        {isFailed && lastFinishedRun.error && ` — ${lastFinishedRun.error}`}
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PropiedadesTable({ listings: initial }: { listings: Listing[] }) {
  const router = useRouter()
  const [listings, setListings] = useState(initial)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dealScore', desc: true }])
  const [columnFilters] = useState<ColumnFiltersState>([])
  const [recalculating, setRecalculating] = useState(false)

  const [filters, setFilters] = useState<Filters>({
    q: '', zona: '', status: '', recamaras: '', precioMax: '', dealScoreMin: '',
  })

  const [zoneOptions, setZoneOptions] = useState<ZoneOpt[]>([])
  const [runningRun, setRunningRun] = useState<ScrapeRun | null>(null)
  const [lastFinishedRun, setLastFinishedRun] = useState<ScrapeRun | null>(null)

  const zonas = useMemo(() => [...new Set(listings.map((l) => l.zona))].sort(), [listings])

  const reloadListings = useCallback(async () => {
    const fresh = await fetch('/api/propiedades?limit=500&sortBy=dealScore&sortDir=desc')
    if (fresh.ok) {
      const json = await fresh.json()
      setListings(json.data)
    }
  }, [])

  const refreshRunState = useCallback(async () => {
    const [zRes, sRes] = await Promise.all([
      fetch('/api/zonas'),
      fetch('/api/scrape'),
    ])
    if (zRes.ok) {
      const zs = await zRes.json()
      setZoneOptions(zs.map((z: { id: string; name: string; active: boolean }) => ({ id: z.id, name: z.name, active: z.active })))
    }
    if (sRes.ok) {
      const runs: ScrapeRun[] = await sRes.json()
      const running = runs.find((r) => r.status === 'RUNNING') ?? null
      const finished = runs.find((r) => r.status !== 'RUNNING') ?? null
      setRunningRun(running)
      setLastFinishedRun(finished)
      return running
    }
    return null
  }, [])

  // Cargar estado inicial
  useEffect(() => { refreshRunState() }, [refreshRunState])

  // Polling cuando hay un scrape corriendo
  useEffect(() => {
    if (!runningRun) return
    const interval = setInterval(async () => {
      const wasRunning = runningRun
      const stillRunning = await refreshRunState()
      // Si terminó, recargar listings
      if (wasRunning && !stillRunning) {
        await reloadListings()
        toast.success('Scrape finalizado — listings actualizados')
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [runningRun, refreshRunState, reloadListings])

  const handleScrape = async (zoneId: string | null) => {
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al iniciar scrape')
        return
      }
      toast.success(`Scrape iniciado: ${data.zoneName}`)
      await refreshRunState()
    } catch {
      toast.error('Error al iniciar scrape')
    }
  }

  // Filtrado client-side
  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (filters.q) {
        const q = filters.q.toLowerCase()
        if (!l.title.toLowerCase().includes(q) && !(l.desarrollo ?? '').toLowerCase().includes(q)) return false
      }
      if (filters.zona     && l.zona !== filters.zona) return false
      if (filters.status   && l.status !== filters.status) return false
      if (filters.recamaras && l.bedrooms !== Number(filters.recamaras)) return false
      if (filters.precioMax && l.price > Number(filters.precioMax)) return false
      if (filters.dealScoreMin && (l.dealScore ?? -Infinity) < Number(filters.dealScoreMin)) return false
      return true
    })
  }, [listings, filters])

  const handleRecalcular = async () => {
    setRecalculating(true)
    try {
      const res = await fetch('/api/propiedades/recalcular', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Scores actualizados. ${data.oportunidades} oportunidades detectadas.`)
      await reloadListings()
    } catch {
      toast.error('Error al recalcular')
    } finally {
      setRecalculating(false)
    }
  }

  const columns: ColumnDef<Listing>[] = [
    {
      accessorKey: 'title',
      header: 'Propiedad',
      cell: ({ row }) => (
        <div className='max-w-[260px]'>
          <div className='font-medium text-sm truncate'>{row.original.title}</div>
          {row.original.desarrollo && (
            <div className='text-xs text-muted-foreground truncate'>{row.original.desarrollo}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'zona',
      header: 'Zona',
      cell: ({ row }) => <span className='text-sm'>{row.original.zona}</span>,
    },
    {
      accessorKey: 'price',
      header: 'Precio',
      cell: ({ row }) => <span className='font-mono text-sm'>{fmt(row.original.price)}</span>,
    },
    {
      accessorKey: 'pricePerM2',
      header: '$/m²',
      cell: ({ row }) => row.original.pricePerM2
        ? <span className='font-mono text-sm text-muted-foreground'>{fmt(row.original.pricePerM2)}</span>
        : <span className='text-muted-foreground text-xs'>—</span>,
    },
    {
      accessorKey: 'm2Constructed',
      header: 'm²',
      cell: ({ row }) => row.original.m2Constructed
        ? <span className='text-sm'>{row.original.m2Constructed} m²</span>
        : <span className='text-muted-foreground text-xs'>—</span>,
    },
    {
      accessorKey: 'bedrooms',
      header: 'Rec.',
      cell: ({ row }) => row.original.bedrooms ?? <span className='text-muted-foreground text-xs'>—</span>,
    },
    {
      accessorKey: 'dealScore',
      header: 'Deal Score',
      cell: ({ row }) => <DealScoreBadge score={row.original.dealScore} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_CLASS[row.original.status])}>
          {STATUS_LABEL[row.original.status]}
        </span>
      ),
    },
    {
      accessorKey: 'lastSeenAt',
      header: 'Visto',
      cell: ({ row }) => (
        <span className='text-xs text-muted-foreground'>
          {new Date(row.original.lastSeenAt).toLocaleDateString('es-MX')}
        </span>
      ),
    },
    {
      id: 'open',
      header: '',
      cell: ({ row }) => (
        <a
          href={row.original.sourceUrl}
          target='_blank'
          rel='noopener noreferrer'
          onClick={(e) => e.stopPropagation()}
          className='p-1.5 rounded hover:bg-muted inline-flex items-center text-muted-foreground hover:text-foreground transition-colors'
          title='Ver en Inmuebles24'
        >
          <ExternalLink className='h-3.5 w-3.5' />
        </a>
      ),
    },
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  return (
    <div className='space-y-4'>
      <ScrapeStatusBanner runningRun={runningRun} lastFinishedRun={lastFinishedRun} />

      <FiltersBar
        filters={filters}
        onChange={(partial) => setFilters((f) => ({ ...f, ...partial }))}
        zonas={zonas}
        zoneOptions={zoneOptions}
        onRecalcular={handleRecalcular}
        onScrape={handleScrape}
        scraping={runningRun !== null}
      />

      {/* Contador */}
      <div className='text-sm text-muted-foreground'>
        {filtered.length} propiedad{filtered.length !== 1 ? 'es' : ''}
        {filtered.length !== listings.length && ` de ${listings.length}`}
        {recalculating && <span className='ml-2 italic'>Recalculando…</span>}
      </div>

      <div className='rounded-md border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className='border-b bg-muted/50'>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className='px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap'
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className='px-4 py-12 text-center text-muted-foreground'>
                  No hay propiedades con esos filtros
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/dashboard/propiedades/${row.original.id}`)}
                  className='border-b hover:bg-muted/30 transition-colors cursor-pointer'
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className='px-4 py-3'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}
        </p>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant='outline' size='sm' onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
