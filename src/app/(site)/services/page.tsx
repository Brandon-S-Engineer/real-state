import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { site } from '@/content/site'
import { services } from '@/content/services'

export const metadata: Metadata = {
  title: 'Services — Fixed-price builds',
  description:
    'Productized, fixed-price offers: MVPs, AI chatbots, SaaS dashboards, and landing pages.',
}

export default function ServicesPage() {
  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-20'>
      <div className='site-rise max-w-[60ch]'>
        <span className='site-kicker'>Services</span>
        <h1
          className='site-display mt-3.5 font-bold'
          style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: '-0.035em', lineHeight: 1.03 }}>
          Fixed price. Fixed timeline. No surprises.
        </h1>
        <p className='mt-[18px] text-[18px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          Pick a starting point below — or send your scope and I’ll quote it. Prices are starting
          points and scale with scope.
        </p>
      </div>

      <div className='mt-12 grid grid-cols-1 gap-5 md:grid-cols-2'>
        {services.map((s) => (
          <div
            key={s.name}
            className='flex flex-col rounded-[20px] p-[30px]'
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <div className='flex items-baseline justify-between gap-3'>
              <h2 className='site-display text-[21px] font-semibold' style={{ letterSpacing: '-0.02em' }}>
                {s.name}
              </h2>
              <span className='site-mono text-xs whitespace-nowrap' style={{ color: 'var(--muted)' }}>
                {s.timeline}
              </span>
            </div>
            <p
              className='site-display mt-3.5 text-[30px] font-bold'
              style={{ letterSpacing: '-0.03em', color: 'var(--accent)' }}>
              {s.price}
            </p>
            <p className='mt-3.5 text-[15px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
              {s.summary}
            </p>
            <ul className='mt-5 flex list-none flex-col gap-2.5 p-0'>
              {s.includes.map((i) => (
                <li key={i} className='flex items-start gap-2.5 text-[14.5px]' style={{ lineHeight: 1.45 }}>
                  <Check
                    className='mt-0.5 h-4 w-4 shrink-0'
                    style={{ color: 'var(--live)' }}
                    strokeWidth={2.6}
                  />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <div
              className='mt-auto flex gap-3 pt-6'
              style={{ borderTop: '1px solid var(--border)', marginTop: 26 }}>
              <a
                href={site.calendlyUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='site-btn site-btn-accent h-11 flex-1 text-[14.5px]'>
                Start this
              </a>
              {s.work && (
                <Link
                  href={`/work/${s.work}`}
                  className='site-btn site-btn-outline h-11 px-[18px] text-[14.5px]'>
                  See example
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className='relative mt-9 mb-24 overflow-hidden rounded-[22px] px-10 py-12 text-center'
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
