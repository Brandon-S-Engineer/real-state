import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DemosClient, { type JobLite } from '@/components/dashboard/demos/demos-client'
import { refreshDemand, toDemoDTO } from '@/lib/demos/server'
import { postedAt } from '@/lib/demos/shared'

export default async function DemosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Cada visita toma un snapshot de demanda con los jobs capturados ahora.
  await refreshDemand()

  const [demos, jobs] = await Promise.all([
    prisma.demo.findMany({
      orderBy: [{ buildOrder: 'asc' }, { createdAt: 'asc' }],
      include: { uses: { orderBy: { sentAt: 'desc' } }, demand: { orderBy: { weekStart: 'asc' } } },
    }),
    prisma.upworkJob.findMany({
      select: { id: true, title: true, url: true, firstSeenAt: true, initialPostedHours: true, ganado: true },
      orderBy: { firstSeenAt: 'desc' },
      take: 400,
    }),
  ])

  const jobLite: JobLite[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    url: j.url,
    postedAt: postedAt(j).toISOString(),
    ganado: j.ganado,
  }))

  return <DemosClient demos={demos.map(toDemoDTO)} jobs={jobLite} />
}
