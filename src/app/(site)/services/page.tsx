import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { site } from '@/content/site'
import { getProject } from '@/content/projects'
import { aiServices, getAiServiceDetails, otherServices } from '@/content/services'
import ServicesLadder, { type LadderItem } from '@/components/site/services-ladder'

export const metadata: Metadata = {
  title: 'Services — AI builds at a fixed price',
  description:
    'Four levels of AI, from simple workflow automation to multi-agent systems — fixed price, fixed timeline, each with a live demo.',
}

export default function ServicesPage() {
  const items: LadderItem[] = aiServices.map((s) => {
    const p = getProject(s.work)
    return {
      ...s,
      ...getAiServiceDetails(s),
      tagline: p?.tagline ?? '',
      demoUrl: p?.demoUrl ?? `/demos/${s.work}`,
    }
  })

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

      <ServicesLadder items={items} calendlyUrl={site.calendlyUrl} />

      {/* ── Secondary offers ──────────────────────────────────────────── */}
      <div className='mt-20'>
        <span className='site-kicker'>Also available</span>
        <h2
          className='site-display mt-3 font-bold'
          style={{ fontSize: 'clamp(24px,3vw,30px)', letterSpacing: '-0.03em' }}>
          The product around the AI.
        </h2>
        <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
          {otherServices.map((s) => (
            <Link
              key={s.name}
              href={`/work#${s.workAnchor}`}
              className='site-lift flex flex-col rounded-[18px] p-[22px]'
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className='flex items-baseline justify-between gap-3'>
                <h3 className='site-display text-[18px] font-semibold' style={{ letterSpacing: '-0.02em' }}>
                  {s.name}
                </h3>
                <span className='site-mono text-[13px] font-semibold whitespace-nowrap'>{s.price}</span>
              </div>
              <p className='mt-2 flex-1 text-[14px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
                {s.summary}
              </p>
              <span className='mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold'>
                See examples
                <ArrowUpRight className='h-3.5 w-3.5' style={{ color: 'var(--accent)' }} />
              </span>
            </Link>
          ))}
        </div>
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
