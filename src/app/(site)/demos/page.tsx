import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import DemoShowcase from '@/components/site/demo-showcase'
import DemoGroup from '@/components/site/demo-group'
import { demoGroups } from '@/content/demo-groups'
import { getPublishedDemos } from '@/lib/demos/server'

export const metadata: Metadata = {
  title: 'Demos — try every build live',
  description:
    'Live, interactive AI builds — from simple automations to multi-agent systems — plus the payments and dashboards around them.',
}

export default async function DemosPage() {
  // Recorded builds only appear once published with a real video — planned
  // ones never show up here.
  const recorded = await getPublishedDemos()

  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-20 pb-24'>
      <div className='site-rise max-w-[62ch]'>
        <span className='site-kicker'>Demos</span>
        <h1
          className='site-display mt-3.5 font-bold'
          style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: '-0.035em', lineHeight: 1.03 }}>
          Don’t take my word for it. Try it.
        </h1>
        <p className='mt-[18px] text-[18px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          Every demo below is a real build running live — click around, try to break it, open it
          full screen. Each AI one is an example of one of the{' '}
          <Link href='/services' className='font-semibold' style={{ color: 'var(--fg)', borderBottom: '1px solid var(--accent)' }}>
            four levels
          </Link>{' '}
          I build.
        </p>
        <nav className='mt-6 flex flex-wrap gap-2'>
          {[...(recorded.length ? [{ id: 'recorded', kicker: 'Recorded builds' }] : []), ...demoGroups].map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className='site-mono rounded-full px-3 py-1.5 text-[11.5px]'
              style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)' }}>
              {g.kicker}
            </a>
          ))}
        </nav>
      </div>

      {recorded.length > 0 && (
        <div id='recorded' className='mt-16 scroll-mt-20'>
          <span className='site-kicker'>Recorded builds</span>
          <h2
            className='site-display mt-3 font-bold'
            style={{ fontSize: 'clamp(24px,3vw,30px)', letterSpacing: '-0.03em' }}>
            Running on real integrations.
          </h2>
          <div className='mt-6 flex flex-col gap-8'>
            {recorded.map((d) => (
              <DemoShowcase key={d.slug} demo={d} />
            ))}
          </div>
        </div>
      )}

      <div className='mt-16 flex flex-col gap-24'>
        {demoGroups.map((g) => (
          <DemoGroup key={g.id} group={g} />
        ))}
      </div>

      <Link
        href='/services'
        className='mt-16 inline-flex items-center gap-1.5 text-[14px] font-semibold'>
        Compare the four levels
        <ArrowUpRight className='h-4 w-4' style={{ color: 'var(--accent)' }} />
      </Link>
    </section>
  )
}
