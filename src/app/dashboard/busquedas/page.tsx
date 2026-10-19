import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BusquedasClient from '@/components/dashboard/busquedas/busquedas-client'
import type { QuickSearch } from '@/lib/busquedas'

export default async function BusquedasPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const [rows, sections] = await Promise.all([
    prisma.elecSearch.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.elecSearchSection.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }], select: { id: true, name: true } }),
  ])
  const custom: QuickSearch[] = rows.map((r) => ({ id: r.id, query: r.query, label: r.label, groupName: r.groupName, minPrice: r.minPrice, custom: true }))
  return <BusquedasClient initialCustom={custom} initialSections={sections} />
}
