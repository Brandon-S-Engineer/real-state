import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { Project } from '@/content/projects'

const stripePattern =
  'repeating-linear-gradient(135deg,var(--bg-2),var(--bg-2) 12px,var(--code-bg) 12px,var(--code-bg) 24px)'

export default function ProjectCard({ project }: { project: Project }) {
  const live = project.demoStatus === 'live'

  return (
    <Link
      href={`/work/${project.slug}`}
      className='site-lift flex flex-col overflow-hidden rounded-[20px]'
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      {/* Preview slot — live demos render the REAL product, scaled down */}
      <div
        className='relative overflow-hidden'
        style={{ aspectRatio: '16 / 9', background: live ? 'var(--bg-2)' : stripePattern, borderBottom: '1px solid var(--border)' }}>
        {live && project.demoUrl && (
          <iframe
            src={`${project.demoUrl}?embed=1`}
            title={`Preview — ${project.title}`}
            loading='lazy'
            tabIndex={-1}
            aria-hidden
            className='site-preview-frame'
            scrolling='no'
          />
        )}
        {/* overlays */}
        <span
          className='site-mono absolute top-4 left-4 rounded-full px-[9px] py-1 text-[10.5px] uppercase'
          style={{
            letterSpacing: '0.06em',
            color: live ? 'var(--live)' : 'var(--muted)',
            background: 'var(--card)',
            border: live ? '1px solid var(--live)' : '1px solid var(--border)',
          }}>
          {live ? '● live demo' : 'demo soon'}
        </span>
        <span
          className='site-mono absolute top-4 right-4 rounded-full px-2.5 py-1 text-[11px] font-semibold'
          style={{ color: 'var(--accent-fg)', background: 'var(--accent)' }}>
          {project.duration}
        </span>
        {project.stripe && (
          <span
            className='site-mono absolute bottom-3 left-4 rounded-md px-2 py-[3px] text-[10.5px] font-semibold'
            style={{ color: 'var(--accent)', background: 'var(--card)', border: '1px solid var(--border)' }}>
            ⚡ Stripe billing
          </span>
        )}
      </div>

      {/* Body */}
      <div className='flex flex-1 flex-col p-6'>
        {project.tierLevel && (
          <span
            className='site-mono mb-2.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase'
            style={{ letterSpacing: '0.06em', color: 'var(--accent-fg)', background: 'var(--accent)' }}>
            Tier {project.tierLevel} · {project.tierLabel}
          </span>
        )}
        <span className='site-mono text-[11px]' style={{ color: 'var(--accent)' }}>
          {project.niche}
        </span>
        <h3
          className='site-display mt-2.5 text-[20px] font-semibold'
          style={{ letterSpacing: '-0.02em' }}>
          {project.title}
        </h3>
        <p className='mt-2.5 flex-1 text-[14px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
          {project.tagline}
        </p>
        <div className='mt-[18px] flex flex-wrap gap-[7px]'>
          {project.stack.slice(0, 4).map((t) => (
            <span
              key={t}
              className='site-mono rounded-md px-[9px] py-[3px] text-[11px]'
              style={{ color: 'var(--muted)', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              {t}
            </span>
          ))}
        </div>
        <span
          className='mt-[20px] inline-flex items-center gap-[7px] text-sm font-semibold'
          style={{ color: 'var(--fg)' }}>
          {live ? 'Try the live demo' : 'Read case study'}
          <ArrowUpRight className='h-4 w-4' style={{ color: 'var(--accent)' }} />
        </span>
      </div>
    </Link>
  )
}
