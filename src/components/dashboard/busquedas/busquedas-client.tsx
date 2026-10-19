'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, ExternalLink, ListPlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DEFAULT_SEARCHES, isLink, searchHost, searchTitle, searchUrl, type QuickSearch } from '@/lib/busquedas'

// Qué búsquedas ya abriste hoy (por navegador): para ir tachando la ronda del día
const OPENED_KEY = 'busquedas-opened'
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

function loadOpened(): Record<string, string> {
  try { return JSON.parse(window.localStorage.getItem(OPENED_KEY) ?? '{}') } catch { return {} }
}

const money = (n: number | null) => (n ? `$${n.toLocaleString('es-MX')}+` : 'sin mínimo')

// bulk: pegar varias de golpe, una por línea (texto o link)
type Draft = { id?: string; query: string; label: string; groupName: string; minPrice: string; bulk?: boolean }

const toSearch = (r: { id: string; query: string; label: string | null; groupName: string; minPrice: number | null }): QuickSearch =>
  ({ id: r.id, query: r.query, label: r.label, groupName: r.groupName, minPrice: r.minPrice, custom: true })

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
    for (const s of list) window.open(searchUrl(s), '_blank', 'noopener')
    markOpened(list.map((s) => s.id))
  }

  const resetDay = () => {
    setOpened({})
    try { window.localStorage.removeItem(OPENED_KEY) } catch { /* modo privado */ }
  }

  const save = async () => {
    if (!draft) return
    const groupName = draft.groupName.trim() || 'Mis búsquedas'
    const lines = draft.bulk ? draft.query.split('\n').map((l) => l.trim()).filter(Boolean) : [draft.query.trim()].filter(Boolean)
    if (!lines.length) { toast.error('Escribe qué buscar o pega un link'); return }
    const minPrice = draft.minPrice.trim() ? Number(draft.minPrice) : null
    if (minPrice != null && !(minPrice >= 0)) { toast.error('Precio mínimo inválido'); return }
    setSaving(true)
    try {
      const body = (query: string) => JSON.stringify({
        query, groupName,
        label: draft.bulk ? null : draft.label.trim() || null,
        minPrice: isLink(query) ? null : minPrice,
      })
      if (draft.id) {
        const res = await fetch(`/api/busquedas/${draft.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: body(lines[0]) })
        if (!res.ok) throw new Error()
        const s = toSearch(await res.json())
        setCustom((xs) => xs.map((x) => (x.id === s.id ? s : x)))
        toast.success('Búsqueda actualizada')
      } else {
        const created: QuickSearch[] = []
        for (const q of lines) {
          const res = await fetch('/api/busquedas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(q) })
          if (!res.ok) throw new Error()
          created.push(toSearch(await res.json()))
        }
        setCustom((xs) => [...xs, ...created])
        toast.success(created.length > 1 ? `${created.length} búsquedas agregadas` : 'Búsqueda agregada')
      }
      setDraft(null)
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s: QuickSearch) => {
    if (!window.confirm(`¿Borrar la búsqueda "${searchTitle(s)}"?`)) return
    const res = await fetch(`/api/busquedas/${s.id}`, { method: 'DELETE' })
    if (res.ok) setCustom((xs) => xs.filter((x) => x.id !== s.id))
    else toast.error('No se pudo borrar')
  }

  const doneToday = (id: string) => opened[id] === today()
  const groupNames = groups.map(([g]) => g)

  return (
    <div className='p-3 sm:p-6 space-y-6'>
      <div className='flex flex-wrap items-start gap-3'>
        <div>
          <h1 className='text-xl font-semibold'>Búsquedas</h1>
          <p className='text-sm text-muted-foreground'>Marketplace CDMX, más nuevos primero. Ábrelas con la extensión activa y scrollea hasta que ya no salgan nuevos. También puedes guardar links (Upwork o lo que sea) para no tenerlos en favoritos.</p>
        </div>
        <div className='ml-auto flex gap-2'>
          <Button variant='outline' size='sm' onClick={resetDay}>Reiniciar ronda</Button>
          <Button variant='outline' size='sm' onClick={() => setDraft({ query: '', label: '', groupName: 'Mis búsquedas', minPrice: '', bulk: true })}>
            <ListPlus className='h-3.5 w-3.5 mr-1.5' />Pegar varias
          </Button>
          <Button size='sm' onClick={() => setDraft({ query: '', label: '', groupName: 'Mis búsquedas', minPrice: '5000' })}>
            <Plus className='h-3.5 w-3.5 mr-1.5' />Nueva búsqueda
          </Button>
        </div>
      </div>

      {draft && (() => {
        const link = !draft.bulk && isLink(draft.query)
        return (
          <div className='rounded-lg border p-4 space-y-3'>
            <div className='text-sm font-medium'>{draft.id ? 'Editar búsqueda' : draft.bulk ? 'Pegar varias búsquedas' : 'Nueva búsqueda'}</div>
            {draft.bulk ? (
              <textarea
                autoFocus
                rows={6}
                placeholder={'Una por línea: texto para Marketplace o un link completo\nhttps://www.upwork.com/nx/search/jobs/?q=…\nneverfull'}
                value={draft.query}
                onChange={(e) => setDraft({ ...draft, query: e.target.value })}
                className='w-full rounded-md border bg-transparent px-3 py-2 text-sm font-mono'
              />
            ) : (
              <Input
                autoFocus
                placeholder='Qué buscar (ej. neverfull) o pega un link (Upwork, etc.)'
                value={draft.query}
                onChange={(e) => setDraft({ ...draft, query: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') save() }}
              />
            )}
            <div className='flex flex-wrap gap-2 items-center'>
              {!draft.bulk && (
                <Input
                  placeholder={link ? 'Nombre (ej. Upwork · Next.js)' : 'Nombre (opcional)'}
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  className='w-60'
                />
              )}
              <Input
                list='busquedas-grupos'
                placeholder='Grupo'
                value={draft.groupName}
                onChange={(e) => setDraft({ ...draft, groupName: e.target.value })}
                className='w-44'
              />
              <datalist id='busquedas-grupos'>{groupNames.map((g) => <option key={g} value={g} />)}</datalist>
              {!link && (
                <Input
                  type='number'
                  placeholder={draft.bulk ? 'Mínimo (solo texto)' : 'Precio mínimo'}
                  value={draft.minPrice}
                  onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })}
                  className='w-40'
                />
              )}
              <Button size='sm' onClick={save} disabled={saving}><Check className='h-3.5 w-3.5 mr-1.5' />Guardar</Button>
              <Button size='sm' variant='ghost' onClick={() => setDraft(null)}><X className='h-3.5 w-3.5' /></Button>
            </div>
            {!draft.bulk && draft.query.trim() && !link && (
              <div className='text-xs text-muted-foreground break-all'>{searchUrl({ query: draft.query, minPrice: draft.minPrice ? Number(draft.minPrice) : null })}</div>
            )}
          </div>
        )
      })()}

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
                      href={searchUrl(s)}
                      target='_blank'
                      rel='noopener noreferrer'
                      onClick={() => markOpened([s.id])}
                      className='min-w-0 flex-1'
                    >
                      <div className={cn('flex items-center gap-1.5 text-sm font-medium truncate', isDone && 'text-muted-foreground')}>
                        {isDone && <Check className='h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0' />}
                        <span className='truncate'>{searchTitle(s)}</span>
                        <ExternalLink className='h-3 w-3 text-muted-foreground shrink-0' />
                      </div>
                      <div className='text-xs text-muted-foreground truncate'>{searchHost(s.query) ?? money(s.minPrice)}</div>
                    </a>
                    {s.custom && (
                      <div className='flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <button
                          title='Editar'
                          onClick={() => setDraft({ id: s.id, query: s.query, label: s.label ?? '', groupName: s.groupName, minPrice: s.minPrice != null ? String(s.minPrice) : '' })}
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
        Las de Apple y Bolsos son fijas. Si pegas un link se abre tal cual (el nombre sale de lo que busca, o ponle uno). En las marcas el mínimo es ~40% del piso de un bolso auténtico para que también salgan carteras y cinturones;
        lo que quede abajo del piso lo marca el CRM como sospechoso. Las tuyas se guardan en el CRM y se pueden editar o borrar (pasa el mouse encima).
      </p>
    </div>
  )
}
