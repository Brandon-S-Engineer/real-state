import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ProductGroup from '@/components/site/product-group'
import { productGroups } from '@/content/product-groups'

export const metadata: Metadata = {
  title: 'MVP & SaaS — the product around the AI',
  description:
    'MVPs, Stripe billing, and dashboards — the product that turns an AI feature into something people can buy and use. Every example runs live.',
}

export default function MvpSaasPage() {
  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-20 pb-24'>
      <div className='site-rise max-w-[62ch]'>
        <span className='site-kicker'>MVP &amp; SaaS</span>
        <h1
          className='site-display mt-3.5 font-bold'
          style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: '-0.035em', lineHeight: 1.03 }}>
          The product around the AI.
        </h1>
        <p className='mt-[18px] text-[18px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          AI is the engine, but people pay for a product: a sign-up, a checkout, a dashboard to run
          it from. I build that part too, so your AI ships as something customers can actually buy
          and use. Every example below is running live.
        </p>
        <nav className='mt-6 flex flex-wrap gap-2'>
          {productGroups.map((g) => (
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

      <div className='mt-16 flex flex-col gap-24'>
        {productGroups.map((g) => (
          <ProductGroup key={g.id} group={g} />
        ))}
      </div>

      <div
        className='mt-24 rounded-[22px] px-10 py-12 text-center'
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <h2
          className='site-display font-bold'
          style={{ fontSize: 'clamp(24px,3vw,32px)', letterSpacing: '-0.03em' }}>
          Need the AI too?
        </h2>
        <p className='mx-auto mt-3.5 max-w-[46ch] text-base' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          Most builds are both: an AI feature plus the product around it. Mention both in your
          message and you’ll get one scope and one timeline.
        </p>
        <Link href='/services' className='site-btn site-btn-inverse mt-6 h-12 gap-1.5 px-6 text-[15.5px]'>
          See the AI levels
          <ArrowRight className='h-4 w-4' />
        </Link>
      </div>
    </section>
  )
}
