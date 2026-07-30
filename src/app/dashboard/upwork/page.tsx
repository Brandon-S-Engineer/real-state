import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import UpworkJobsTable, { type UpworkJob } from '@/components/dashboard/upwork-jobs-table'

export default async function UpworkPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [rows, settings] = await Promise.all([
    prisma.upworkJob.findMany({
      orderBy: [{ postedHours: 'asc' }],
    }),
    prisma.upworkSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    }),
  ])

  const jobs: UpworkJob[] = rows.map((r) => ({
    ...r,
    skills: Array.isArray(r.skills) ? (r.skills as string[]) : [],
    reasons: Array.isArray(r.reasons) ? (r.reasons as { pts: number; why: string }[]) : [],
    ganadoAt: r.ganadoAt ? r.ganadoAt.toISOString() : null,
    firstSeenAt: r.firstSeenAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className='p-6 space-y-6'>
      <div>
        <h1 className='text-xl font-semibold'>Upwork</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} capturado{jobs.length !== 1 ? 's' : ''} por la extensión
        </p>
      </div>
      <UpworkJobsTable jobs={jobs} initialMinScoreAlert={settings.minScoreAlert} />
    </div>
  )
}
