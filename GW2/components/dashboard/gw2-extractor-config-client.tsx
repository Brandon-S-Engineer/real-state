'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCopper } from '@/lib/gw2/format'
import Gw2ItemPicker, { type Gw2ItemLite } from '@/components/dashboard/gw2-item-picker'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ExtractorSource = {
  id: string
  sourceItemId: number
  upgradeItemId: number
  blacklisted: boolean
  notes: string | null
  sourceItem: Gw2ItemLite | null
  upgradeItem: Gw2ItemLite | null
}

const RARITIES = ['Basic', 'Fine', 'Masterwork', 'Rare', 'Exotic', 'Ascended', 'Legendary'] as const

type SalvageRate = {
  id: string
  rarity: string
  levelMin: number
  levelMax: number
  expectedValue: number
  notes: string | null
}

// ── Fuentes (arma → upgrade que contiene) ───────────────────────────────────────

function SourcesSection() {
  const [sources, setSources] = useState<ExtractorSource[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sourceItem, setSourceItem] = useState<Gw2ItemLite | null>(null)
  const [upgradeItem, setUpgradeItem] = useState<Gw2ItemLite | null>(null)
  const [notes, setNotes] = useState('')

  const fetchSources = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gw2/extractor/sources')
      setSources(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSources() }, [fetchSources])

  const resetForm = () => {
    setSourceItem(null)
    setUpgradeItem(null)
    setNotes('')
    setAdding(false)
  }

  const handleAdd = async () => {
    if (!sourceItem || !upgradeItem) return
    setSaving(true)
    try {
      const res = await fetch('/api/gw2/extractor/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceItemId: sourceItem.id, upgradeItemId: upgradeItem.id, notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al guardar')
        return
      }
      toast.success('Fuente agregada')
      resetForm()
      await fetchSources()
    } finally {
      setSaving(false)
    }
  }

  const toggleBlacklist = async (s: ExtractorSource) => {
    const res = await fetch(`/api/gw2/extractor/sources/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blacklisted: !s.blacklisted }),
    })
    if (!res.ok) return toast.error('Error al actualizar')
    await fetchSources()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/gw2/extractor/sources/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Error al borrar')
    toast.success('Fuente borrada')
    await fetchSources()
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold'>Fuentes: arma/armadura → upgrade que contiene</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            La API no dice qué sigilo/runa trae cada exótico — se carga a mano (viene de la wiki, o de lo que ya sabés).
          </p>
        </div>
        <Button size='sm' onClick={() => setAdding(true)} disabled={adding}>
          <Plus className='h-3.5 w-3.5 mr-1.5' />
          Nueva
        </Button>
      </div>

      {adding && (
        <div className='rounded-xl border-2 border-ring bg-card p-4 space-y-3'>
          <div className='grid sm:grid-cols-2 gap-3'>
            <div className='space-y-1'>
              <label className='text-xs font-medium text-muted-foreground'>Arma / armadura a comprar</label>
              <Gw2ItemPicker value={sourceItem} onChange={setSourceItem} placeholder='ej. Berserker&apos;s Slaying Longbow of Fire' />
            </div>
            <div className='space-y-1'>
              <label className='text-xs font-medium text-muted-foreground'>Upgrade que contiene</label>
              <Gw2ItemPicker value={upgradeItem} onChange={setUpgradeItem} placeholder='ej. Superior Sigil of Force' />
            </div>
          </div>
          <div className='space-y-1'>
            <label className='text-xs font-medium text-muted-foreground'>Notas (opcional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder='fuente: wiki, validado en vivo, etc.' />
          </div>
          <div className='flex gap-2 justify-end'>
            <Button variant='ghost' size='sm' onClick={resetForm} disabled={saving}>Cancelar</Button>
            <Button size='sm' onClick={handleAdd} disabled={saving || !sourceItem || !upgradeItem}>
              {saving ? <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' /> : null}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className='flex justify-center py-8 text-muted-foreground'><Loader2 className='h-4 w-4 animate-spin' /></div>
      ) : sources.length === 0 && !adding ? (
        <p className='text-sm text-muted-foreground py-4'>Sin fuentes todavía. Agregá la primera arriba.</p>
      ) : (
        <div className='rounded-xl border divide-y'>
          {sources.map((s) => (
            <div key={s.id} className='flex items-center gap-3 px-4 py-2.5 text-sm'>
              <div className='flex-1 min-w-0'>
                <span className='font-medium'>{s.sourceItem?.name ?? `#${s.sourceItemId}`}</span>
                <span className='text-muted-foreground'> → </span>
                <span>{s.upgradeItem?.name ?? `#${s.upgradeItemId}`}</span>
                {s.notes && <div className='text-xs text-muted-foreground truncate'>{s.notes}</div>}
              </div>
              <label className='flex items-center gap-1.5 text-xs text-muted-foreground shrink-0'>
                <input type='checkbox' checked={s.blacklisted} onChange={() => toggleBlacklist(s)} />
                Bloqueada
              </label>
              <button
                onClick={() => handleDelete(s.id)}
                title='Borrar'
                className='h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0'>
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tasas de salvage ─────────────────────────────────────────────────────────

function emptyRateDraft() {
  return { rarity: 'Exotic' as string, levelMin: '0', levelMax: '80', expectedValue: '', notes: '' }
}

function SalvageRatesSection() {
  const [rates, setRates] = useState<SalvageRate[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(emptyRateDraft())

  const fetchRates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gw2/extractor/salvage-rates')
      setRates(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRates() }, [fetchRates])

  const valid = draft.expectedValue.trim() !== '' && !isNaN(Number(draft.expectedValue)) && Number(draft.levelMin) <= Number(draft.levelMax)

  const handleAdd = async () => {
    if (!valid) return
    setSaving(true)
    try {
      const res = await fetch('/api/gw2/extractor/salvage-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rarity: draft.rarity,
          levelMin: Number(draft.levelMin),
          levelMax: Number(draft.levelMax),
          expectedValue: Math.round(Number(draft.expectedValue)),
          notes: draft.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al guardar')
        return
      }
      toast.success('Tasa agregada')
      setDraft(emptyRateDraft())
      setAdding(false)
      await fetchRates()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/gw2/extractor/salvage-rates/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Error al borrar')
    toast.success('Tasa borrada')
    await fetchRates()
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold'>Tasas de salvage esperado</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Por rareza + rango de nivel, no por ítem — el salvage tampoco viene de la API. Valor en cobre (1g = 10,000c, 1s = 100c).
          </p>
        </div>
        <Button size='sm' onClick={() => setAdding(true)} disabled={adding}>
          <Plus className='h-3.5 w-3.5 mr-1.5' />
          Nueva
        </Button>
      </div>

      {adding && (
        <div className='rounded-xl border-2 border-ring bg-card p-4 space-y-3'>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <div className='space-y-1'>
              <label className='text-xs font-medium text-muted-foreground'>Rareza</label>
              <Select value={draft.rarity} onChange={(e) => setDraft((d) => ({ ...d, rarity: e.target.value }))}>
                {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div className='space-y-1'>
              <label className='text-xs font-medium text-muted-foreground'>Nivel mín.</label>
              <Input type='number' min={0} max={80} value={draft.levelMin} onChange={(e) => setDraft((d) => ({ ...d, levelMin: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <label className='text-xs font-medium text-muted-foreground'>Nivel máx.</label>
              <Input type='number' min={0} max={80} value={draft.levelMax} onChange={(e) => setDraft((d) => ({ ...d, levelMax: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <label className='text-xs font-medium text-muted-foreground'>Valor esperado (cobre)</label>
              <Input type='number' min={0} value={draft.expectedValue} onChange={(e) => setDraft((d) => ({ ...d, expectedValue: e.target.value }))} placeholder='4000' />
              {draft.expectedValue && !isNaN(Number(draft.expectedValue)) && (
                <p className='text-[11px] text-muted-foreground'>{formatCopper(Number(draft.expectedValue))}</p>
              )}
            </div>
          </div>
          <Input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder='Notas (opcional)' />
          <div className='flex gap-2 justify-end'>
            <Button variant='ghost' size='sm' onClick={() => { setAdding(false); setDraft(emptyRateDraft()) }} disabled={saving}>Cancelar</Button>
            <Button size='sm' onClick={handleAdd} disabled={saving || !valid}>
              {saving ? <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' /> : null}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className='flex justify-center py-8 text-muted-foreground'><Loader2 className='h-4 w-4 animate-spin' /></div>
      ) : rates.length === 0 && !adding ? (
        <p className='text-sm text-muted-foreground py-4'>Sin tasas todavía. Agregá la primera arriba.</p>
      ) : (
        <div className='rounded-xl border divide-y'>
          {rates.map((r) => (
            <div key={r.id} className='flex items-center gap-3 px-4 py-2.5 text-sm'>
              <div className='flex-1 min-w-0'>
                <span className='font-medium'>{r.rarity}</span>
                <span className='text-muted-foreground'> · lvl {r.levelMin}-{r.levelMax} · </span>
                <span>{formatCopper(r.expectedValue)}</span>
                {r.notes && <div className='text-xs text-muted-foreground truncate'>{r.notes}</div>}
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                title='Borrar'
                className='h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0'>
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Gw2ExtractorConfigClient() {
  return (
    <div className='p-6 space-y-8 max-w-3xl'>
      <div>
        <Link href='/gw2/extractor' className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2'>
          <ArrowLeft className='h-3 w-3' /> Volver al ranking
        </Link>
        <h1 className='text-xl font-semibold'>Configurar Extractor</h1>
        <p className='text-sm text-muted-foreground mt-1'>Estos dos datos no vienen de la API de GW2 — se mantienen a mano acá.</p>
      </div>
      <SourcesSection />
      <SalvageRatesSection />
    </div>
  )
}
