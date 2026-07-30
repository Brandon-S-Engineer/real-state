import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Check, ExternalLink, Play } from 'lucide-react'
import { site } from '@/content/site'
import { getProject, getRelatedProjects, projects } from '@/content/projects'

const stripe =
  'repeating-linear-gradient(135deg,var(--bg-2),var(--bg-2) 13px,var(--code-bg) 13px,var(--code-bg) 26px)'

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = getProject(slug)
  if (!project) return { title: 'Not found' }
  return { title: `${project.title} — ${site.name}`, description: project.tagline }
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = getProject(slug)
  if (!project) notFound()
  const related = getRelatedProjects(slug, 2)

  return (
    <article className='site-rise mx-auto max-w-[820px] px-6 pt-11'>
      <Link
        href='/work'
        className='inline-flex items-center gap-[7px] text-sm'
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft className='h-4 w-4' />
        All work
      </Link>

      {/* Header */}
      <header className='mt-[26px]'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <span
            className='site-mono rounded-full px-3 py-[5px] text-xs font-semibold'
            style={{ color: 'var(--accent-fg)', background: 'var(--accent)' }}>
            {project.timeToBuild}
          </span>
          <span className='site-mono text-[12.5px]' style={{ color: 'var(--muted)' }}>
            {project.niche}
          </span>
        </div>
        <h1
          className='site-display mt-[22px] font-bold'
          style={{ fontSize: 'clamp(34px,4.6vw,50px)', letterSpacing: '-0.035em', lineHeight: 1.04, textWrap: 'balance' }}>
          {project.title}
        </h1>
        <p className='mt-[18px] text-[19px]' style={{ lineHeight: 1.55, color: 'var(--muted)', textWrap: 'pretty' }}>
          {project.tagline}
        </p>
      </header>

      {/* Demo slot */}
      {project.demoStatus === 'live' && project.demoUrl ? (
        <div
          className='mt-8 overflow-hidden rounded-[20px]'
          style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow)', background: 'var(--card)' }}>
          {/* Browser chrome */}
          <div
            className='flex items-center gap-2 px-4 py-3'
            style={{ borderBottom: '1px solid var(--border)' }}>
            <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.72 0.17 25)' }} />
            <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.83 0.15 85)' }} />
            <span className='h-[11px] w-[11px] rounded-full' style={{ background: 'oklch(0.75 0.15 150)' }} />
            <span
              className='site-mono ml-2 hidden flex-1 truncate rounded-md px-2.5 py-1 text-[11.5px] sm:block'
              style={{ background: 'var(--bg-2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              {project.demoUrl}
            </span>
            <span
              className='site-mono ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px]'
              style={{ color: 'var(--live)' }}>
              <span className='site-pulse h-1.5 w-1.5 rounded-full' style={{ background: 'var(--live)' }} />
              live · interactive
            </span>
            <a
              href={project.demoUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='site-mono site-attn inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-semibold'
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              Full screen
              <ExternalLink className='h-3 w-3' />
            </a>
          </div>
          {/* Live embed — this is the actual product running, not a screenshot */}
          <iframe
            src={`${project.demoUrl}?embed=1`}
            title={`Live demo — ${project.title}`}
            loading='lazy'
            className='block w-full'
            style={{ height: 560, border: 0, background: 'var(--bg-2)' }}
          />
        </div>
      ) : (
        <div
          className='relative mt-8 grid place-items-center overflow-hidden rounded-[20px]'
          style={{ aspectRatio: '16 / 9', border: '1px solid var(--border)', background: stripe, boxShadow: 'var(--shadow)' }}>
          <div className='text-center'>
            <div
              className='mx-auto grid h-14 w-14 place-items-center rounded-2xl'
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <Play className='h-[26px] w-[26px]' style={{ color: 'var(--accent)' }} />
            </div>
            <p className='site-mono mt-4 text-xs' style={{ color: 'var(--muted)' }}>
              demo · loom walkthrough slot
            </p>
          </div>
          <span
            className='site-mono absolute bottom-4 left-4 rounded-full px-[11px] py-[5px] text-[11px]'
            style={{ color: 'var(--muted)', background: 'var(--card)', border: '1px solid var(--border)' }}>
            Interactive demo coming soon
          </span>
        </div>
      )}

      {/* Body */}
      <section className='mt-14 flex flex-col gap-11'>
        <div>
          <h2 className='site-kicker m-0'>The client</h2>
          <p className='mt-3.5 text-[18px]' style={{ lineHeight: 1.6, textWrap: 'pretty' }}>
            {project.clientType}
          </p>
        </div>

        <div>
          <h2 className='site-kicker m-0'>The problem</h2>
          <p className='mt-3.5 text-[18px]' style={{ lineHeight: 1.6, color: 'var(--muted)', textWrap: 'pretty' }}>
            {project.problem}
          </p>
        </div>

        <div>
          <h2 className='site-kicker m-0'>What I built</h2>
          <ul className='mt-4 flex list-none flex-col gap-3 p-0'>
            {project.scope.map((s) => (
              <li key={s} className='flex items-start gap-3 text-[17px]' style={{ lineHeight: 1.5 }}>
                <Check
                  className='mt-[3px] h-[18px] w-[18px] shrink-0'
                  style={{ color: 'var(--live)' }}
                  strokeWidth={2.4}
                />
                <span style={{ textWrap: 'pretty' }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className='rounded-[18px] px-[30px] py-7'
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h2 className='site-kicker m-0' style={{ color: 'var(--live)' }}>
            The outcome
          </h2>
          <p
            className='site-display mt-3.5 text-[22px] font-medium'
            style={{ lineHeight: 1.45, letterSpacing: '-0.02em', textWrap: 'pretty' }}>
            {project.outcome}
          </p>
        </div>

        <div>
          <h2 className='site-kicker m-0'>Stack</h2>
          <div className='mt-4 flex flex-wrap gap-2'>
            {project.stack.map((t) => (
              <span
                key={t}
                className='site-mono rounded-lg px-3 py-1.5 text-[12.5px]'
                style={{ color: 'var(--muted)', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Related builds — clients always want 2-3 examples of the same thing */}
        {related.length > 0 && (
          <div>
            <h2 className='site-kicker m-0'>More builds like this</h2>
            <div className='mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2'>
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/work/${r.slug}`}
                  className='site-lift flex flex-col rounded-[16px] p-5'
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='site-mono text-[11px]' style={{ color: 'var(--accent)' }}>
                      {r.duration}
                      {r.demoStatus === 'live' && (
                        <span className='ml-2' style={{ color: 'var(--live)' }}>· live demo</span>
                      )}
                    </span>
                    <ArrowUpRight className='h-4 w-4 shrink-0' style={{ color: 'var(--muted)' }} />
                  </div>
                  <h3 className='site-display mt-2 text-[16px] font-semibold' style={{ letterSpacing: '-0.02em' }}>
                    {r.title}
                  </h3>
                  <p className='mt-1.5 text-[13px]' style={{ lineHeight: 1.5, color: 'var(--muted)' }}>
                    {r.tagline}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* CTA */}
      <div
        className='relative mt-[60px] mb-24 overflow-hidden rounded-[24px] px-10 py-12 text-center'
        style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
        <div
          className='absolute inset-0'
          style={{ background: 'radial-gradient(70% 130% at 50% -10%, var(--accent-soft), transparent)' }}
        />
        <div className='relative'>
          <h3
            className='site-display font-bold'
            style={{ fontSize: 'clamp(24px,3vw,32px)', letterSpacing: '-0.03em' }}>
            Want something like this?
          </h3>
          <p className='mx-auto mt-3.5 max-w-[44ch] text-base' style={{ lineHeight: 1.55, opacity: 0.72 }}>
            Fixed price, fixed timeline. Tell me the scope and I’ll get you a working demo fast.
          </p>
          <div className='mt-7 flex flex-wrap justify-center gap-3'>
            <a
              href={site.calendlyUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='site-btn site-btn-accent h-12 px-6 text-[15.5px]'>
              Book a call
            </a>
            <a
              href={site.upworkUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='site-btn h-12 px-6 text-[15.5px]'
              style={{
                background: 'transparent',
                color: 'var(--bg)',
                border: '1px solid color-mix(in oklch, var(--bg) 40%, transparent)',
              }}>
              Hire me on Upwork
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
