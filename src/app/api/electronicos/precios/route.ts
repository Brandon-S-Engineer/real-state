import { requireAdmin } from '@/lib/require-admin'
import { NextResponse } from 'next/server'
import { buildPriceTable, getElecSettings, loadWindowRows } from '@/lib/electronicos/stats'

export async function GET() {
  const error = await requireAdmin()
  if (error) return error
  const settings = await getElecSettings()
  const rows = buildPriceTable(await loadWindowRows(settings), settings)
  return NextResponse.json({ data: rows, settings })
}
