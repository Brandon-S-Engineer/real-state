import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import DemoShowcase from '@/components/site/demo-showcase'
import { getPublishedDemos } from '@/lib/demos/server'

export const metadata: Metadata = {
  title: 'Demos — Recorded AI builds',
  description:
    'Recorded walkthroughs of real AI builds running on real integrations — email, WhatsApp, phone, and web chat.',
}

export default async function DemosPage() {
  const demos = await getPublishedDemos()
  // No published demos = no page. Unfinished demos never appear publicly.
  if (demos.length === 0) notFound()

  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-20 pb-24'>
      <div className='site-rise max-w-[62ch]'>
        <span className='site-kicker'>Demos</span>
        <h1
          className='site-display mt-3.5 font-bold'
          style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: '-0.035em', lineHeight: 1.03 }}>
          Real builds, recorded running.
        </h1>
        <p className='mt-[18px] text-[18px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          Each one runs on real integrations — a real inbox, a real phone number, a real WhatsApp
          account. Every demo proves one of the{' '}
          <Link href='/services' className='font-semibold' style={{ color: 'var(--fg)', borderBottom: '1px solid var(--accent)' }}>
            four levels
          </Link>{' '}
          I build.
        </p>
      </div>

      <div className='mt-12 flex flex-col gap-8'>
        {demos.map((d) => (
          <DemoShowcase key={d.slug} demo={d} />
        ))}
      </div>

      <Link
        href='/services'
        className='mt-10 inline-flex items-center gap-1.5 text-[14px] font-semibold'>
        See the four levels and pricing
        <ArrowUpRight className='h-4 w-4' style={{ color: 'var(--accent)' }} />
      </Link>
    </section>
  )
}
