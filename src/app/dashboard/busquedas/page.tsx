import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BusquedasClient from '@/components/dashboard/busquedas/busquedas-client'
import type { QuickSearch } from '@/lib/busquedas'

export default async function BusquedasPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const rows = await prisma.elecSearch.findMany({ orderBy: { createdAt: 'asc' } })
  const custom: QuickSearch[] = rows.map((r) => ({ id: r.id, query: r.query, label: r.label, groupName: r.groupName, minPrice: r.minPrice, custom: true }))
  return <BusquedasClient initialCustom={custom} />
}
