'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CATALOG, LINE_LABEL, LINES, formatSsd, type Line } from '@/lib/electronicos/catalog'
import type { ElecListingDTO } from '@/lib/electronicos/serialize'

export { LINE_LABEL, LINES, formatSsd, CATALOG }

export const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${Math.round(n).toLocaleString('es-MX')}`

export const moneyK = (n: number | null | undefined) =>
  n == null ? '—' : n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`

export function lineLabel(line: string | null) {
  return line ? LINE_LABEL[line as Line] ?? line : '?'
}

export function configShort(l: { line: string | null; chip: string | null; ramGb: number | null; ssdGb: number | null }) {
  return `${lineLabel(l.line)} · ${l.chip ?? '?'} · ${l.ramGb ? `${l.ramGb}GB` : '?'} · ${formatSsd(l.ssdGb)}`
}

export function daysAgo(iso: string | null) {
  if (!iso) return null
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

export function formatDays(d: number | null) {
  if (d == null) return '—'
  if (d < 1) return `${Math.max(1, Math.round(d * 24))}h`
  return `${Math.round(d)}d`
}

// ── Score ────────────────────────────────────────────────────────────────────

export function scoreTier(s: number) { return s >= 9 ? 'elite' : s >= 7 ? 'high' : s >= 4 ? 'mid' : 'low' }

export const SCORE_CLASS: Record<string, string> = {
  elite: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  mid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-muted text-muted-foreground',
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className='text-muted-foreground text-xs' title='Poca data para comparar'>—</span>
  return (
    <span className={cn('inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-xs font-medium', SCORE_CLASS[scoreTier(score)])}>
      {score}/10
    </span>
  )
}

export const ZONE_CLASS: Record<string, string> = {
  COMPRA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  VENTA: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  OTRA: 'bg-muted text-muted-foreground',
}

export function ZoneBadge({ kind, name }: { kind: string; name: string | null }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', ZONE_CLASS[kind] ?? ZONE_CLASS.OTRA)}>
      {name ?? (kind === 'OTRA' ? 'Otra' : kind)}
    </span>
  )
}

export function ConfidenceDot({ level }: { level: 'baja' | 'media' | 'alta' }) {
  const cls = level === 'alta' ? 'bg-green-500' : level === 'media' ? 'bg-yellow-500' : 'bg-muted-foreground/40'
  return <span className={cn('inline-block h-2 w-2 rounded-full', cls)} title={`Confianza ${level}`} />
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Editor manual de specs ───────────────────────────────────────────────────

const RAM_OPTIONS = [8, 16, 18, 24, 32, 36, 48, 64, 96, 128]
const SSD_OPTIONS = [128, 256, 512, 1024, 2048, 4096, 8192]

export function SpecsEditorDialog({
  listing, open, onOpenChange, onSaved,
}: {
  listing: ElecListingDTO | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: (l: ElecListingDTO) => void
}) {
  const [line, setLine] = useState<string>('')
  const [chip, setChip] = useState<string>('')
  const [ram, setRam] = useState<string>('')
  const [ssd, setSsd] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!listing) return
    setLine(listing.line ?? '')
    setChip(listing.chip ?? '')
    setRam(listing.ramGb ? String(listing.ramGb) : '')
    setSsd(listing.ssdGb ? String(listing.ssdGb) : '')
    setPrice(listing.price ? String(listing.price) : '')
  }, [listing])

  if (!listing) return null

  const chipsForLine = Array.from(new Set(CATALOG.filter((e) => !line || e.line === line).flatMap((e) => e.chips)))
  const entry = CATALOG.find((e) => e.line === line && e.chips.includes(chip))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/electronicos/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specs: {
            line: line || null,
            chip: chip || null,
            ramGb: ram ? Number(ram) : null,
            ssdGb: ssd ? Number(ssd) : null,
            price: price ? Number(price) : null,
          },
        }),
      })
      if (!res.ok) throw new Error()
      onSaved(await res.json())
      toast.success('Specs corregidos — ya no se re-parsean')
      onOpenChange(false)
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const sel = 'w-full border rounded-md px-3 py-2 text-sm bg-background'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Corregir specs</DialogTitle>
        </DialogHeader>
        <p className='text-xs text-muted-foreground line-clamp-2'>{listing.title}</p>
        {listing.parseNotes && <p className='text-xs text-amber-600 dark:text-amber-400'>Parser: {listing.parseNotes}</p>}
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <Label>Línea</Label>
            <select value={line} onChange={(e) => setLine(e.target.value)} className={sel}>
              <option value=''>?</option>
              {LINES.map((l) => <option key={l} value={l}>{LINE_LABEL[l]}</option>)}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label>Chip</Label>
            <select value={chip} onChange={(e) => setChip(e.target.value)} className={sel}>
              <option value=''>?</option>
              {chipsForLine.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label>RAM</Label>
            <select value={ram} onChange={(e) => setRam(e.target.value)} className={sel}>
              <option value=''>?</option>
              {(entry?.ram ?? RAM_OPTIONS).map((r) => <option key={r} value={r}>{r}GB</option>)}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label>SSD</Label>
            <select value={ssd} onChange={(e) => setSsd(e.target.value)} className={sel}>
              <option value=''>?</option>
              {(entry?.ssd ?? SSD_OPTIONS).map((s) => <option key={s} value={s}>{formatSsd(s)}</option>)}
            </select>
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Precio (MXN)</Label>
            <Input type='number' value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <Button onClick={save} disabled={saving} className='w-full'>Guardar</Button>
      </DialogContent>
    </Dialog>
  )
}
