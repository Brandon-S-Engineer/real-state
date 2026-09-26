import { requireAdmin } from '@/lib/require-admin'
import { NextResponse } from 'next/server'
import { buildPriceTable, getElecSettings, loadWindowRows } from '@/lib/electronicos/stats'
import { parseCategory } from '@/lib/electronicos/categories'

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  const category = parseCategory(new URL(req.url).searchParams.get('category'))
  const settings = await getElecSettings()
  const rows = buildPriceTable(await loadWindowRows(settings, category), settings)
  return NextResponse.json({ data: rows, settings })
}
