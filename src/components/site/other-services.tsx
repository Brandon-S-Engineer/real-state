import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { otherServices } from '@/content/services'

// Secondary offers — the product around the AI. Shown on Home and Services.
export default function OtherServices() {
  return (
    <div>
      <span className='site-kicker'>Also available</span>
      <h2
        className='site-display mt-3 font-bold'
        style={{ fontSize: 'clamp(24px,3vw,30px)', letterSpacing: '-0.03em' }}>
        The product around the AI.
      </h2>
      <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
        {otherServices.map((s) => (
          <Link
            key={s.name}
            href={`/mvp-saas#${s.anchor}`}
            className='site-lift flex flex-col rounded-[18px] p-[22px]'
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className='site-display text-[18px] font-semibold' style={{ letterSpacing: '-0.02em' }}>
              {s.name}
            </h3>
            <p className='mt-2 flex-1 text-[14px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
              {s.summary}
            </p>
            <span className='mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold'>
              Try the demos
              <ArrowUpRight className='h-3.5 w-3.5' style={{ color: 'var(--accent)' }} />
            </span>
          </Link>
        ))}
      </div>
      <Link href='/mvp-saas' className='mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold'>
        See all MVP &amp; SaaS work
        <ArrowRight className='h-4 w-4' style={{ color: 'var(--accent)' }} />
      </Link>
    </div>
  )
}
