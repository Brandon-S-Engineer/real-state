'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ElecSettings } from '@prisma/client'
import { cn } from '@/lib/utils'
import type { ElecListingDTO, ElecTradeDTO, ElecZoneDTO } from '@/lib/electronicos/serialize'
import type { PriceTableRow } from '@/lib/electronicos/stats'
import ElecListingsTable from './listings-table'
import ElecPreciosTable from './precios-table'
import ElecTrades, { draftFromListing, type TradeDraft } from './trades'
import ElecConfig from './config'

const TABS = [
  { id: 'precios', label: 'Precios' },
  { id: 'listings', label: 'Listings' },
  { id: 'trades', label: 'Mis trades' },
  { id: 'config', label: 'Zonas y ajustes' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function ElecClient(props: {
  listings: ElecListingDTO[]
  prices: PriceTableRow[]
  trades: ElecTradeDTO[]
  zones: ElecZoneDTO[]
  settings: ElecSettings
}) {
  const router = useRouter()
  const params = useSearchParams()
  const initialTab = (params.get('tab') as Tab) ?? 'precios'
  const [tab, setTabState] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? initialTab : 'precios')
  const [listings, setListings] = useState(props.listings)
  const [prices, setPrices] = useState(props.prices)
  const [trades, setTrades] = useState(props.trades)
  const [zones, setZones] = useState(props.zones)
  const [settings, setSettings] = useState(props.settings)
  const [minScoreAlert, setMinScoreAlert] = useState(props.settings.minScoreAlert)
  const [configFilter, setConfigFilter] = useState<string | null>(null)
  const [tradeDraft, setTradeDraft] = useState<TradeDraft | null>(null)

  const setTab = useCallback((t: Tab) => {
    setTabState(t)
    router.replace(`/dashboard/electronicos?tab=${t}`, { scroll: false })
  }, [router])

  // Precios frescos al entrar a la pestaña (los listings cambian por el polling)
  useEffect(() => {
    if (tab !== 'precios') return
    fetch('/api/electronicos/precios').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setPrices(d.data) }).catch(() => {})
  }, [tab])

  useEffect(() => {
    if (minScoreAlert === settings.minScoreAlert) return
    const t = setTimeout(() => {
      fetch('/api/electronicos/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minScoreAlert }),
      }).then((r) => r.ok && r.json()).then((s) => s && setSettings(s)).catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [minScoreAlert, settings.minScoreAlert])

  const active = listings.filter((l) => l.status === 'ACTIVO').length
  const review = listings.filter((l) => l.needsReview && l.status === 'ACTIVO').length

  return (
    <div className='p-6 space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='text-xl font-semibold'>Precios Electrónicos</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            MacBooks M1–M5 y Neo · {listings.length} capturados · {active} activos · {prices.filter((p) => !p.configKey.includes('?')).length} configuraciones
            {review > 0 && <> · <button className='underline underline-offset-2' onClick={() => setTab('listings')}>{review} por revisar</button></>}
          </p>
        </div>
        <div className='inline-flex rounded-md border p-0.5 bg-muted/40'>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn('px-3 py-1.5 text-sm rounded transition-colors', tab === t.id ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'precios' && (
        <ElecPreciosTable
          rows={prices}
          windowDays={settings.windowDays}
          fastSaleDays={settings.fastSaleDays}
          onOpenConfig={(key) => { setConfigFilter(key); setTab('listings') }}
        />
      )}
      {/* Listings se monta siempre (oculto) para que el polling de alertas siga vivo en cualquier pestaña */}
      <div className={tab === 'listings' ? '' : 'hidden'}>
        <ElecListingsTable
          listings={listings}
          setListings={setListings}
          minScoreAlert={minScoreAlert}
          onMinScoreAlertChange={setMinScoreAlert}
          minSample={settings.minSample}
          configFilter={configFilter}
          onClearConfigFilter={() => setConfigFilter(null)}
          onRegisterTrade={(l) => { setTradeDraft(draftFromListing(l)); setTab('trades') }}
        />
      </div>
      {tab === 'trades' && (
        <ElecTrades trades={trades} setTrades={setTrades} zones={zones} listings={listings} draft={tradeDraft} setDraft={setTradeDraft} />
      )}
      {tab === 'config' && (
        <ElecConfig zones={zones} setZones={setZones} settings={settings} setSettings={setSettings} />
      )}
    </div>
  )
}
