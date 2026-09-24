'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ElecSettings } from '@prisma/client'
import type { ElecZoneDTO } from '@/lib/electronicos/serialize'
import { ZoneBadge } from './shared'

type ZoneDraft = Omit<ElecZoneDTO, 'id' | 'keywords'> & { id?: string; keywordsText: string }

const toDraft = (z: ElecZoneDTO): ZoneDraft => ({ ...z, keywordsText: z.keywords.join(', ') })

function ZoneRow({ zone, onSaved, onDeleted }: { zone: ZoneDraft; onSaved: (z: ElecZoneDTO) => void; onDeleted: (id?: string) => void }) {
  const [d, setD] = useState(zone)
  const [saving, setSaving] = useState(false)
  const set = (p: Partial<ZoneDraft>) => setD((x) => ({ ...x, ...p }))
  const num = (v: string) => (v === '' ? null : Number(v))

  const save = async () => {
    if (!d.name.trim()) { toast.error('Nombre requerido'); return }
    setSaving(true)
    try {
      const body = {
        name: d.name.trim(), kind: d.kind, active: d.active,
        keywords: d.keywordsText.split(',').map((s) => s.trim()).filter(Boolean),
        lat: d.lat, lng: d.lng, radiusKm: d.radiusKm,
      }
      const res = await fetch(d.id ? `/api/electronicos/zonas/${d.id}` : '/api/electronicos/zonas', {
        method: d.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      setD(toDraft(saved))
      onSaved(saved)
      toast.success('Zona guardada — usa "Recalcular scores" para reasignar listings')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (d.id && !confirm(`¿Borrar la zona "${d.name}"?`)) return
    if (d.id) await fetch(`/api/electronicos/zonas/${d.id}`, { method: 'DELETE' })
    onDeleted(d.id)
  }

  return (
    <tr className='border-b align-top'>
      <td className='px-3 py-2'>
        <Input value={d.name} onChange={(e) => set({ name: e.target.value })} className='w-36' />
      </td>
      <td className='px-3 py-2'>
        <select value={d.kind} onChange={(e) => set({ kind: e.target.value as ZoneDraft['kind'] })} className='border rounded-md px-2 py-2 text-sm bg-background h-9'>
          <option value='COMPRA'>Compra</option>
          <option value='VENTA'>Venta</option>
          <option value='OTRA'>Otra</option>
        </select>
        <div className='mt-1'><ZoneBadge kind={d.kind} name={null} /></div>
      </td>
      <td className='px-3 py-2'>
        <Input value={d.keywordsText} onChange={(e) => set({ keywordsText: e.target.value })} placeholder='municipios o colonias, separados por coma' className='min-w-64' />
      </td>
      <td className='px-3 py-2'>
        <div className='flex gap-1'>
          <Input type='number' step='0.0001' value={d.lat ?? ''} onChange={(e) => set({ lat: num(e.target.value) })} placeholder='lat' className='w-24' />
          <Input type='number' step='0.0001' value={d.lng ?? ''} onChange={(e) => set({ lng: num(e.target.value) })} placeholder='lng' className='w-24' />
          <Input type='number' step='0.5' value={d.radiusKm ?? ''} onChange={(e) => set({ radiusKm: num(e.target.value) })} placeholder='km' className='w-16' />
        </div>
      </td>
      <td className='px-3 py-2 pt-4'><Switch checked={d.active} onChange={(v) => set({ active: v })} /></td>
      <td className='px-3 py-2'>
        <div className='flex gap-1'>
          <Button size='sm' variant='outline' onClick={save} disabled={saving}>
            {saving ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Save className='h-3.5 w-3.5' />}
          </Button>
          <Button size='sm' variant='ghost' onClick={remove} className='text-destructive hover:text-destructive'><Trash2 className='h-3.5 w-3.5' /></Button>
        </div>
      </td>
    </tr>
  )
}

const SETTING_FIELDS: { key: keyof ElecSettings; label: string; hint: string }[] = [
  { key: 'disappearSessions', label: 'Sesiones sin verlo', hint: 'Capturas posteriores de la misma búsqueda (en días distintos) sin que aparezca → desaparecido' },
  { key: 'disappearMinHours', label: 'Horas mínimas', hint: 'Además, que lleve al menos estas horas sin verse' },
  { key: 'fastSaleDays', label: 'Venta rápida (días)', hint: 'Desaparecidos antes de esto cuentan para "precio de salida probable"' },
  { key: 'windowDays', label: 'Ventana de precios (días)', hint: 'Solo listings vistos en este periodo entran a la tabla de precios y al score' },
  { key: 'minSample', label: 'Muestra mínima', hint: 'Listings comparables necesarios para calcular score / confianza' },
]

export default function ElecConfig({
  zones, setZones, settings, setSettings,
}: {
  zones: ElecZoneDTO[]
  setZones: (fn: (prev: ElecZoneDTO[]) => ElecZoneDTO[]) => void
  settings: ElecSettings
  setSettings: (s: ElecSettings) => void
}) {
  const [s, setS] = useState(settings)
  const [adding, setAdding] = useState<ZoneDraft | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const body = Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, Number(s[f.key])]))
      const res = await fetch('/api/electronicos/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setSettings(await res.json())
      toast.success('Ajustes guardados')
    } catch {
      toast.error('Valores inválidos')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className='space-y-8'>
      <section className='space-y-3'>
        <div className='flex items-end justify-between'>
          <div>
            <h2 className='text-base font-semibold'>Zonas</h2>
            <p className='text-sm text-muted-foreground'>
              Se asigna por coordenadas del mapa de Marketplace (lat/lng + radio) y, si no hay, por keywords en la ubicación.
            </p>
          </div>
          <Button size='sm' variant='outline' onClick={() => setAdding({ name: '', kind: 'VENTA', keywordsText: '', lat: null, lng: null, radiusKm: 3, active: true })}>
            <Plus className='h-3.5 w-3.5 mr-1.5' /> Zona
          </Button>
        </div>
        <div className='rounded-md border overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50 text-left'>
                {['Nombre', 'Tipo', 'Keywords', 'Centro / radio', 'Activa', ''].map((h) => (
                  <th key={h} className='px-3 py-2 font-medium text-muted-foreground whitespace-nowrap'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <ZoneRow
                  key={z.id}
                  zone={toDraft(z)}
                  onSaved={(saved) => setZones((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))}
                  onDeleted={(id) => setZones((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
              {adding && (
                <ZoneRow
                  key='new'
                  zone={adding}
                  onSaved={(saved) => { setZones((prev) => [...prev, saved]); setAdding(null) }}
                  onDeleted={() => setAdding(null)}
                />
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className='space-y-3 max-w-2xl'>
        <div>
          <h2 className='text-base font-semibold'>Detección y estadística</h2>
          <p className='text-sm text-muted-foreground'>
            &quot;Desaparecido&quot; es un proxy de &quot;vendido&quot;: la captura es pasiva, así que solo cuenta cuando vuelves a ver la misma búsqueda.
          </p>
        </div>
        <div className='grid gap-3 sm:grid-cols-2'>
          {SETTING_FIELDS.map((f) => (
            <label key={f.key} className='space-y-1'>
              <span className='text-sm font-medium'>{f.label}</span>
              <Input type='number' value={String(s[f.key])} onChange={(e) => setS((x) => ({ ...x, [f.key]: e.target.value }))} />
              <span className='block text-xs text-muted-foreground'>{f.hint}</span>
            </label>
          ))}
        </div>
        <Button size='sm' onClick={saveSettings} disabled={savingSettings}>
          {savingSettings ? <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> : <Save className='h-3.5 w-3.5 mr-1.5' />}
          Guardar ajustes
        </Button>
      </section>
    </div>
  )
}
