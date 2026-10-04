import { requireAdmin } from '@/lib/require-admin'
import { NextResponse } from 'next/server'
import { buildPriceTable, buildRotationTable, getElecSettings, loadWindowRows } from '@/lib/electronicos/stats'
import { parseCategory } from '@/lib/electronicos/categories'

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error
  const category = parseCategory(new URL(req.url).searchParams.get('category'))
  const settings = await getElecSettings()
  const windowRows = await loadWindowRows(settings, category)
  return NextResponse.json({ data: buildPriceTable(windowRows, settings), rotation: buildRotationTable(windowRows, settings), settings })
}
