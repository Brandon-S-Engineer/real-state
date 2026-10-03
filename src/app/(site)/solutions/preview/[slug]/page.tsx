import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import DemoShowcase from '@/components/site/demo-showcase'
import { toDemoDTO } from '@/lib/demos/server'
import { STATUS_LABEL, publishBlockers } from '@/lib/demos/shared'

export const metadata: Metadata = { title: 'Demo preview', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Admin-only: how a demo will look on /solutions, whatever its status.
// Anyone else gets a 404 — the route doesn't admit it exists.
export default async function DemoPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (session?.user.role !== 'ADMIN') notFound()
  const { slug } = await params
  const row = await prisma.demo.findUnique({ where: { slug } })
  if (!row) notFound()
  const demo = toDemoDTO(row)
  const blockers = publishBlockers(demo)

  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-10 pb-24'>
      <div
        className='site-mono mb-6 rounded-xl px-4 py-3 text-[12px]'
        style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)', color: 'var(--muted)' }}>
        Private preview · status: {STATUS_LABEL[demo.status]}
        {blockers.length > 0 ? ` · to publish, missing: ${blockers.join(' · ')}` : ' · ready to publish'}
      </div>
      <DemoShowcase demo={demo} />
    </section>
  )
}
