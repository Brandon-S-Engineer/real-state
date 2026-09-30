import type { Metadata } from 'next'
import { site } from '@/content/site'
import { getLadderItems } from '@/content/services'
import ServicesLadder, { type RecordedDemos } from '@/components/site/services-ladder'
import { getPublishedDemos } from '@/lib/demos/server'
import OtherServices from '@/components/site/other-services'

export const metadata: Metadata = {
  title: 'Services — AI builds at a fixed price',
  description:
    'Four levels of AI, from simple workflow automation to multi-agent systems — fixed price, fixed timeline, each with a live demo.',
}

export default async function ServicesPage() {
  const items = getLadderItems()
  // Cross-link each level to the recorded demos that prove it (published only).
  const recorded: RecordedDemos = {}
  for (const d of await getPublishedDemos()) {
    for (const t of d.tiers) {
      recorded[t] ??= { count: 0, href: `/demos#${d.slug}` }
      recorded[t].count++
    }
  }

  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-20'>
      <div className='site-rise max-w-[62ch]'>
        <span className='site-kicker'>Services</span>
        <h1
          className='site-display mt-3.5 font-bold'
          style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: '-0.035em', lineHeight: 1.03 }}>
          AI that does real work. Fixed price.
        </h1>
        <p className='mt-[18px] text-[18px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          Four levels, from a simple automation to a team of AI agents. Find the one that
          matches your problem, try its live demo, and get a fixed quote.
        </p>
      </div>

      <ServicesLadder items={items} calendlyUrl={site.calendlyUrl} recorded={recorded} />

      <div className='mt-20'>
        <OtherServices />
      </div>

      <div
        className='relative mt-16 mb-24 overflow-hidden rounded-[22px] px-10 py-12 text-center'
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <h3
          className='site-display font-bold'
          style={{ fontSize: 'clamp(24px,3vw,32px)', letterSpacing: '-0.03em' }}>
          Something else in mind?
        </h3>
        <p className='mx-auto mt-3.5 max-w-[46ch] text-base' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          If your project doesn’t fit a box, send the details. Most builds get a fixed quote within
          a day.
        </p>
        <a
          href={`mailto:${site.email}`}
          className='site-btn site-btn-inverse mt-6 h-12 px-6 text-[15.5px]'>
          Email me the scope
        </a>
      </div>
    </section>
  )
}
