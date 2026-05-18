'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, X, ExternalLink, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Zone = {
  id: string
  name: string
  searchUrl: string
  locationKeywords: string[]
  desarrolloKeywords: string[]
  active: boolean
  createdAt: string
}

type ZoneDraft = {
  id: string
  name: string
  searchUrl: string
  locationKeywords: string
  desarrolloKeywords: string
  active: boolean
}

function toDraft(z: Zone): ZoneDraft {
  return {
    id: z.id,
    name: z.name,
    searchUrl: z.searchUrl,
    locationKeywords: z.locationKeywords.join(', '),
    desarrolloKeywords: z.desarrolloKeywords.join(', '),
    active: z.active,
  }
}

function emptyDraft(): ZoneDraft {
  return {
    id: '__new__',
    name: '',
    searchUrl: '',
    locationKeywords: '',
    desarrolloKeywords: '',
    active: true,
  }
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// ── Card / Form ───────────────────────────────────────────────────────────────

function ZoneCard({
  zone,
  isNew,
  onSave,
  onCancel,
  onDelete,
  onScrape,
  scraping,
}: {
  zone: ZoneDraft
  isNew: boolean
  onSave: (draft: ZoneDraft) => Promise<void>
  onCancel: () => void
  onDelete?: (id: string) => Promise<void>
  onScrape?: (id: string) => Promise<void>
  scraping: boolean
}) {
  const [editing, setEditing] = useState(isNew)
  const [draft, setDraft] = useState(zone)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(zone) }, [zone])

  const valid = draft.name.trim() && draft.searchUrl.trim().startsWith('http')

  const save = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    if (isNew) {
      onCancel()
    } else {
      setDraft(zone)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className='rounded-xl border-2 border-ring bg-card p-4 space-y-3'>
        <div className='grid sm:grid-cols-2 gap-3'>
          <div className='space-y-1'>
            <label className='text-xs font-medium text-muted-foreground'>Nombre</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder='ej. Polanco'
              autoFocus={isNew}
            />
          </div>
          <div className='space-y-1'>
            <label className='text-xs font-medium text-muted-foreground'>URL de búsqueda en Inmuebles24</label>
            <Input
              value={draft.searchUrl}
              onChange={(e) => setDraft((d) => ({ ...d, searchUrl: e.target.value }))}
              placeholder='https://www.inmuebles24.com/departamentos-en-venta-en-polanco.html'
            />
          </div>
        </div>

        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>
            Palabras clave de ubicación
            <span className='ml-1 font-normal text-muted-foreground/70'>
              (separadas por coma — filtra listings cuya ubicación no coincida)
            </span>
          </label>
          <Input
            value={draft.locationKeywords}
            onChange={(e) => setDraft((d) => ({ ...d, locationKeywords: e.target.value }))}
            placeholder='Polanco, Miguel Hidalgo'
          />
        </div>

        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>
            Palabras clave de desarrollos
            <span className='ml-1 font-normal text-muted-foreground/70'>
              (opcional — detecta el desarrollo desde el título)
            </span>
          </label>
          <Input
            value={draft.desarrolloKeywords}
            onChange={(e) => setDraft((d) => ({ ...d, desarrolloKeywords: e.target.value }))}
            placeholder='Residencial X, Torre Y'
          />
        </div>

        <label className='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={draft.active}
            onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
          />
          Activa (se incluye al hacer scrape)
        </label>

        <div className='flex gap-2 justify-end'>
          <Button variant='ghost' size='sm' onClick={cancel} disabled={saving}>
            <X className='h-3.5 w-3.5 mr-1.5' />
            Cancelar
          </Button>
          <Button size='sm' onClick={save} disabled={saving || !valid}>
            {saving ? <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' /> : null}
            Guardar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='rounded-xl border bg-card p-4 group'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1 space-y-1'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h3 className='font-medium text-sm'>{zone.name}</h3>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
              zone.active
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            )}>
              {zone.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <a
            href={zone.searchUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-full'
          >
            <ExternalLink className='h-3 w-3 shrink-0' />
            <span className='truncate'>{zone.searchUrl}</span>
          </a>
          {(zone.locationKeywords || zone.desarrolloKeywords) && (
            <div className='text-xs text-muted-foreground space-y-0.5 pt-1'>
              {zone.locationKeywords && (
                <p><span className='font-medium'>Ubicación:</span> {zone.locationKeywords}</p>
              )}
              {zone.desarrolloKeywords && (
                <p><span className='font-medium'>Desarrollos:</span> {zone.desarrolloKeywords}</p>
              )}
            </div>
          )}
        </div>

        <div className='flex gap-1 shrink-0'>
          {onScrape && (
            <button
              onClick={() => onScrape(zone.id)}
              disabled={scraping || !zone.active}
              title={zone.active ? 'Scrapear esta zona' : 'Activa la zona para scrapear'}
              className='h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
            >
              {scraping ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Play className='h-3.5 w-3.5' />}
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            title='Editar'
            className='h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
          >
            <Pencil className='h-3.5 w-3.5' />
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (confirm(`¿Borrar la zona "${zone.name}"? Los listings asociados se conservan.`)) {
                  onDelete(zone.id)
                }
              }}
              title='Borrar'
              className='h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ZonasClient() {
  const [zonas, setZonas] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [scrapingId, setScrapingId] = useState<string | null>(null)

  const fetchZonas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/zonas')
      const data = await res.json()
      setZonas(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Error cargando zonas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchZonas() }, [fetchZonas])

  const handleSave = async (draft: ZoneDraft) => {
    const payload = {
      name: draft.name.trim(),
      searchUrl: draft.searchUrl.trim(),
      locationKeywords: parseKeywords(draft.locationKeywords),
      desarrolloKeywords: parseKeywords(draft.desarrolloKeywords),
      active: draft.active,
    }

    const isNew = draft.id === '__new__'
    const url = isNew ? '/api/zonas' : `/api/zonas/${draft.id}`
    const method = isNew ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error?.toString() ?? 'Error al guardar')
      throw new Error('save failed')
    }

    toast.success(isNew ? 'Zona creada' : 'Zona actualizada')
    if (isNew) setCreating(false)
    await fetchZonas()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/zonas/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Error al borrar')
      return
    }
    toast.success('Zona borrada')
    await fetchZonas()
  }

  const handleScrape = async (zoneId: string | null) => {
    setScrapingId(zoneId ?? '__all__')
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
      toast.success(`Scrape iniciado: ${data.zoneName}. Tarda ~1-2 min.`)
    } catch {
      toast.error('Error al iniciar scrape')
    } finally {
      setScrapingId(null)
    }
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-start justify-between gap-3 flex-wrap'>
        <div>
          <h1 className='text-xl font-semibold'>Zonas</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Define qué zonas de Inmuebles24 scrapear. {zonas.length} zona{zonas.length !== 1 ? 's' : ''} configurada{zonas.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleScrape(null)}
            disabled={scrapingId !== null || zonas.filter((z) => z.active).length === 0}
          >
            {scrapingId === '__all__' ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <Play className='h-3.5 w-3.5 mr-1.5' />}
            Scrapear todas
          </Button>
          <Button size='sm' onClick={() => setCreating(true)} disabled={creating}>
            <Plus className='h-3.5 w-3.5 mr-1.5' />
            Nueva zona
          </Button>
        </div>
      </div>

      {creating && (
        <ZoneCard
          zone={emptyDraft()}
          isNew
          onSave={handleSave}
          onCancel={() => setCreating(false)}
          scraping={false}
        />
      )}

      {loading ? (
        <div className='flex items-center justify-center py-12 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin' />
        </div>
      ) : zonas.length === 0 && !creating ? (
        <div className='rounded-xl border-2 border-dashed py-12 text-center text-muted-foreground space-y-3'>
          <p>No hay zonas configuradas.</p>
          <Button size='sm' onClick={() => setCreating(true)}>
            <Plus className='h-3.5 w-3.5 mr-1.5' />
            Agregar la primera
          </Button>
        </div>
      ) : (
        <div className='grid gap-3 md:grid-cols-2'>
          {zonas.map((z) => (
            <ZoneCard
              key={z.id}
              zone={toDraft(z)}
              isNew={false}
              onSave={handleSave}
              onCancel={() => {}}
              onDelete={handleDelete}
              onScrape={(id) => handleScrape(id)}
              scraping={scrapingId === z.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
