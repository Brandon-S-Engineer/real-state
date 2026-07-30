import type { Metadata } from 'next'
import ProjectCard from '@/components/site/project-card'
import { CATEGORIES, getProjectsByCategory } from '@/content/projects'

export const metadata: Metadata = {
  title: 'Work — Live demos by category',
  description:
    'AI chatbots, SaaS dashboards, and Stripe-powered MVPs — 3 interactive demos per category, all running live.',
}

export default function WorkPage() {
  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-20'>
      <div className='site-rise max-w-[62ch]'>
        <span className='site-kicker'>Selected work</span>
        <h1
          className='site-display mt-3.5 font-bold'
          style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: '-0.035em', lineHeight: 1.03 }}>
          Every project is a real, running build.
        </h1>
        <p className='mt-[18px] text-[18px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          Three interactive demos per category — not screenshots, not mockups. The card previews
          below are the actual products running. Click any one and use it.
        </p>
      </div>

      <div className='mt-14 mb-24 flex flex-col gap-[72px]'>
        {CATEGORIES.map((cat, i) => {
          const items = getProjectsByCategory(cat.id)
          return (
            <div key={cat.id}>
              <div className='flex flex-wrap items-end justify-between gap-3'>
                <div>
                  <span className='site-mono text-[11px]' style={{ color: 'var(--muted)' }}>
                    {String(i + 1).padStart(2, '0')} · {items.length} demos
                  </span>
                  <h2
                    className='site-display mt-1.5 font-bold'
                    style={{ fontSize: 'clamp(24px,3vw,32px)', letterSpacing: '-0.03em' }}>
                    {cat.title}
                  </h2>
                  <p className='mt-2 max-w-[56ch] text-[15px]' style={{ color: 'var(--muted)' }}>
                    {cat.blurb}
                  </p>
                </div>
              </div>
              <div className='mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
                {items.map((p) => (
                  <ProjectCard
                    key={p.slug}
                    project={p}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
