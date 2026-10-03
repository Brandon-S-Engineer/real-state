import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import DemoShowcase from '@/components/site/demo-showcase'
import { getPublishedDemos } from '@/lib/demos/server'

export const metadata: Metadata = {
  title: 'Solutions — ready-built AI, recorded running',
  description:
    'Complete AI builds for what businesses ask for most — phone receptionists, support agents, WhatsApp agents and knowledge chatbots — recorded running on real integrations.',
}

export default async function SolutionsPage() {
  const demos = await getPublishedDemos()
  // No published demos = no page. Unfinished demos never appear publicly.
  if (demos.length === 0) notFound()

  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-20 pb-24'>
      <div className='site-rise max-w-[62ch]'>
        <span className='site-kicker'>Solutions</span>
        <h1
          className='site-display mt-3.5 font-bold'
          style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: '-0.035em', lineHeight: 1.03 }}>
          The AI businesses ask for most — already built.
        </h1>
        <p className='mt-[18px] text-[18px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          Each solution is a complete build, recorded end to end on real integrations — a real phone
          number, a real inbox, a real WhatsApp account. Pick the one closest to what you need and
          I adapt it to your business. Each maps to one of the{' '}
          <Link href='/services' className='font-semibold' style={{ color: 'var(--fg)', borderBottom: '1px solid var(--accent)' }}>
            four levels
          </Link>
          .
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
        See the four levels
        <ArrowUpRight className='h-4 w-4' style={{ color: 'var(--accent)' }} />
      </Link>
    </section>
  )
}
