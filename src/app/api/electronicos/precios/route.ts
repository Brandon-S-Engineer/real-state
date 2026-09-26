import { requireAdmin } from '@/lib/require-admin'
import { NextResponse } from 'next/server'
import { buildPriceTable, getElecSettings, loadWindowRows } from '@/lib/electronicos/stats'

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  const c = new URL(req.url).searchParams.get('category')
  const category = c === 'IPHONE' || c === 'MACBOOK' ? c : undefined
  const settings = await getElecSettings()
  const rows = buildPriceTable(await loadWindowRows(settings, category), settings)
  return NextResponse.json({ data: rows, settings })
}
