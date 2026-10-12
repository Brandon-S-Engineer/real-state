'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DEFAULT_SEARCHES, marketplaceUrl, type QuickSearch } from '@/lib/busquedas'

// Qué búsquedas ya abriste hoy (por navegador): para ir tachando la ronda del día
const OPENED_KEY = 'busquedas-opened'
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

function loadOpened(): Record<string, string> {
  try { return JSON.parse(window.localStorage.getItem(OPENED_KEY) ?? '{}') } catch { return {} }
}

const money = (n: number | null) => (n ? `$${n.toLocaleString('es-MX')}+` : 'sin mínimo')

type Draft = { id?: string; query: string; groupName: string; minPrice: string }

export default function BusquedasClient({ initialCustom }: { initialCustom: QuickSearch[] }) {
  const [custom, setCustom] = useState(initialCustom)
  const [opened, setOpened] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => setOpened(loadOpened()), [])

  const groups = useMemo(() => {
    const m = new Map<string, QuickSearch[]>()
    for (const s of [...DEFAULT_SEARCHES, ...custom]) m.set(s.groupName, [...(m.get(s.groupName) ?? []), s])
    return [...m.entries()]
  }, [custom])

  const markOpened = (ids: string[]) => {
    const next = { ...opened }
    for (const id of ids) next[id] = today()
    setOpened(next)
    try { window.localStorage.setItem(OPENED_KEY, JSON.stringify(next)) } catch { /* modo privado */ }
  }

  const openAll = (list: QuickSearch[]) => {
    // El navegador puede bloquear las pestañas después de la primera: permite ventanas emergentes para el CRM
    for (const s of list) window.open(marketplaceUrl(s.query, s.minPrice), '_blank', 'noopener')
    markOpened(list.map((s) => s.id))
  }

  const resetDay = () => {
    setOpened({})
    try { window.localStorage.removeItem(OPENED_KEY) } catch { /* modo privado */ }
  }

  const save = async () => {
    if (!draft || !draft.query.trim()) { toast.error('Escribe qué buscar'); return }
    const minPrice = draft.minPrice.trim() ? Number(draft.minPrice) : null
    if (minPrice != null && !(minPrice >= 0)) { toast.error('Precio mínimo inválido'); return }
    setSaving(true)
    try {
      const res = await fetch(draft.id ? `/api/busquedas/${draft.id}` : '/api/busquedas', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: draft.query.trim(), groupName: draft.groupName.trim() || 'Mis búsquedas', minPrice }),
      })
      if (!res.ok) throw new Error()
      const r = await res.json()
      const s: QuickSearch = { id: r.id, query: r.query, groupName: r.groupName, minPrice: r.minPrice, custom: true }
      setCustom((xs) => (draft.id ? xs.map((x) => (x.id === s.id ? s : x)) : [...xs, s]))
      setDraft(null)
      toast.success(draft.id ? 'Búsqueda actualizada' : 'Búsqueda agregada')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s: QuickSearch) => {
    if (!window.confirm(`¿Borrar la búsqueda "${s.query}"?`)) return
    const res = await fetch(`/api/busquedas/${s.id}`, { method: 'DELETE' })
    if (res.ok) setCustom((xs) => xs.filter((x) => x.id !== s.id))
    else toast.error('No se pudo borrar')
  }

  const doneToday = (id: string) => opened[id] === today()
  const groupNames = groups.map(([g]) => g)

  return (
    <div className='p-6 space-y-6'>
      <div className='flex flex-wrap items-start gap-3'>
        <div>
          <h1 className='text-xl font-semibold'>Búsquedas</h1>
          <p className='text-sm text-muted-foreground'>Marketplace CDMX, más nuevos primero. Ábrelas con la extensión activa y scrollea hasta que ya no salgan nuevos.</p>
        </div>
        <div className='ml-auto flex gap-2'>
          <Button variant='outline' size='sm' onClick={resetDay}>Reiniciar ronda</Button>
          <Button size='sm' onClick={() => setDraft({ query: '', groupName: 'Mis búsquedas', minPrice: '5000' })}>
            <Plus className='h-3.5 w-3.5 mr-1.5' />Nueva búsqueda
          </Button>
        </div>
      </div>

      {draft && (
        <div className='rounded-lg border p-4 space-y-3'>
          <div className='text-sm font-medium'>{draft.id ? 'Editar búsqueda' : 'Nueva búsqueda'}</div>
          <div className='flex flex-wrap gap-2 items-center'>
            <Input
              autoFocus
              placeholder='Qué buscar (ej. neverfull)'
              value={draft.query}
              onChange={(e) => setDraft({ ...draft, query: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') save() }}
              className='w-60'
            />
            <Input
              list='busquedas-grupos'
              placeholder='Grupo'
              value={draft.groupName}
              onChange={(e) => setDraft({ ...draft, groupName: e.target.value })}
              className='w-44'
            />
            <datalist id='busquedas-grupos'>{groupNames.map((g) => <option key={g} value={g} />)}</datalist>
            <Input
              type='number'
              placeholder='Precio mínimo'
              value={draft.minPrice}
              onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })}
              className='w-36'
            />
            <Button size='sm' onClick={save} disabled={saving}><Check className='h-3.5 w-3.5 mr-1.5' />Guardar</Button>
            <Button size='sm' variant='ghost' onClick={() => setDraft(null)}><X className='h-3.5 w-3.5' /></Button>
          </div>
          {draft.query.trim() && (
            <div className='text-xs text-muted-foreground break-all'>{marketplaceUrl(draft.query.trim(), draft.minPrice ? Number(draft.minPrice) : null)}</div>
          )}
        </div>
      )}

      {groups.map(([group, list]) => {
        const done = list.filter((s) => doneToday(s.id)).length
        return (
          <section key={group} className='space-y-2'>
            <div className='flex items-center gap-3'>
              <h2 className='text-base font-semibold'>{group}</h2>
              <span className='text-xs text-muted-foreground'>{done} / {list.length} hoy</span>
              <Button
                variant='outline'
                size='sm'
                className='ml-auto'
                title='Abre todas en pestañas nuevas (permite ventanas emergentes para el CRM si solo abre una)'
                onClick={() => openAll(list.filter((s) => !doneToday(s.id)))}
                disabled={done === list.length}
              >
                Abrir pendientes
              </Button>
            </div>
            <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {list.map((s) => {
                const isDone = doneToday(s.id)
                return (
                  <div key={s.id} className={cn('group flex items-center gap-2 rounded-md border px-3 py-2', isDone && 'bg-muted/40')}>
                    <a
                      href={marketplaceUrl(s.query, s.minPrice)}
                      target='_blank'
                      rel='noopener noreferrer'
                      onClick={() => markOpened([s.id])}
                      className='min-w-0 flex-1'
                    >
                      <div className={cn('flex items-center gap-1.5 text-sm font-medium truncate', isDone && 'text-muted-foreground')}>
                        {isDone && <Check className='h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0' />}
                        <span className='truncate'>{s.query}</span>
                        <ExternalLink className='h-3 w-3 text-muted-foreground shrink-0' />
                      </div>
                      <div className='text-xs text-muted-foreground'>{money(s.minPrice)}</div>
                    </a>
                    {s.custom && (
                      <div className='flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <button
                          title='Editar'
                          onClick={() => setDraft({ id: s.id, query: s.query, groupName: s.groupName, minPrice: s.minPrice != null ? String(s.minPrice) : '' })}
                          className='p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted'
                        ><Pencil className='h-3.5 w-3.5' /></button>
                        <button title='Borrar' onClick={() => remove(s)} className='p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-muted'>
                          <Trash2 className='h-3.5 w-3.5' />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <p className='text-xs text-muted-foreground'>
        Las de Apple y Bolsos son fijas. En las marcas el mínimo es ~40% del piso de un bolso auténtico para que también salgan carteras y cinturones;
        lo que quede abajo del piso lo marca el CRM como sospechoso. Las tuyas se guardan en el CRM y se pueden editar o borrar (pasa el mouse encima).
      </p>
    </div>
  )
}
