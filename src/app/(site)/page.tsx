import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Check, Code2, FileText, Mail, MessageCircle, UserRound } from 'lucide-react'
import CompanyAgentDemo from '@/components/site/company-agent-demo'
import LeadAgentDemo from '@/components/site/lead-agent-demo'
import OtherServices from '@/components/site/other-services'
import { site } from '@/content/site'

// Home de una sola vista, pensado para quien contrata: hero → proyectos en vivo
// → cómo construyo → más trabajo → contacto. Los proyectos se prueban aquí
// mismo, sin salir de la página.

const stack = ['Python', 'FastAPI', 'Next.js', 'TypeScript', 'Postgres', 'pgvector', 'OpenAI', 'Claude', 'LangGraph', 'MCP']

const principles = [
  {
    title: 'Grounded or silent',
    body: 'Answers come from retrieved sources or tool results, cited inline. When nothing relevant comes back, the agent says so instead of guessing.',
  },
  {
    title: 'The model never writes SQL',
    body: 'Agents call typed, parameterized, read-only tools with validated arguments. Data access is scoped by design, not by prompt.',
  },
  {
    title: 'Humans approve side effects',
    body: 'Anything that changes the outside world — refunds, CRM updates, emails — goes through an explicit approval step.',
  },
  {
    title: 'Observable by default',
    body: 'Every step is traced: tool calls, queries, sources, tokens, cost and latency. You can see why an answer happened.',
  },
]

const upcoming = [
  {
    num: '03',
    title: 'AI voice receptionist',
    body: 'A real phone number you can call: answers FAQs, books into a calendar, confirms by text and logs a summary of the call.',
  },
]

export default function HomePage() {
  const { hiring } = site
  const links = [
    { href: hiring.links.github, label: 'GitHub', icon: Code2 },
    { href: hiring.links.linkedin, label: 'LinkedIn', icon: UserRound },
    { href: hiring.links.cv, label: 'CV (PDF)', icon: FileText },
    { href: hiring.links.email ? `mailto:${hiring.links.email}` : '', label: 'Email', icon: Mail },
    { href: hiring.links.whatsapp ? `https://wa.me/${hiring.links.whatsapp}` : '', label: 'WhatsApp', icon: MessageCircle },
  ].filter((l) => l.href)

  return (
    <>
      {/* HERO */}
      <section className='mx-auto max-w-[1120px] px-6 pt-16 pb-12 sm:pt-24'>
        <div className='site-rise max-w-[760px]'>
          <span
            className='inline-flex items-center gap-2.5 rounded-full py-1.5 pr-3 pl-2.5 text-[12.5px]'
            style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)' }}>
            <span className='site-pulse h-[7px] w-[7px] rounded-full' style={{ background: 'var(--live)' }} />
            {hiring.availability}
          </span>
          <p className='site-mono mt-6 text-[13px]' style={{ color: 'var(--muted)' }}>
            {site.name} · Applied AI Engineer
          </p>
          <h1
            className='site-display mt-3 font-bold'
            style={{ fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.04, letterSpacing: '-0.035em', textWrap: 'balance' }}>
            {hiring.headline}
          </h1>
          <p
            className='mt-5 max-w-[58ch] text-[17.5px]'
            style={{ lineHeight: 1.55, color: 'var(--muted)', textWrap: 'pretty' }}>
            {hiring.subhead}
          </p>
          <div className='mt-7 flex flex-wrap gap-3'>
            <a href='#projects' className='site-btn site-btn-accent h-12 px-[22px] text-[15.5px]'>
              Try the live projects
              <ArrowDown className='h-[17px] w-[17px]' />
            </a>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                rel='noreferrer'
                className='site-btn site-btn-outline h-12 px-[18px] text-[15px]'>
                <l.icon className='h-4 w-4' />
                {l.label}
              </a>
            ))}
          </div>
          <div className='mt-6 flex flex-wrap gap-x-5 gap-y-2'>
            {hiring.meta.map((m) => (
              <span key={m} className='inline-flex items-center gap-1.5 text-[13.5px]' style={{ color: 'var(--muted)' }}>
                <Check className='h-3.5 w-3.5' style={{ color: 'var(--live)' }} strokeWidth={2.8} />
                {m}
              </span>
            ))}
          </div>
          <div className='mt-8 flex flex-wrap gap-2'>
            {stack.map((s) => (
              <span
                key={s}
                className='site-mono rounded-full px-3 py-1 text-[12.5px]'
                style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECT 01 */}
      <section id='projects' className='mx-auto max-w-[1120px] scroll-mt-20 px-6 pt-10'>
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='max-w-[62ch]'>
            <span className='site-kicker'>Project 01 · live</span>
            <h2
              className='site-display mt-2 font-bold'
              style={{ fontSize: 'clamp(24px,3vw,32px)', letterSpacing: '-0.03em' }}>
              Company data agent — RAG + SQL with a visible trace
            </h2>
            <p className='mt-2 text-[15.5px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
              One tool-calling agent over two kinds of company data: policy documents embedded in pgvector, and
              inventory and orders in Postgres. Order lookups require the matching email, every policy fact is cited,
              and the right-hand panel shows exactly how each answer was produced.
            </p>
          </div>
          <div className='site-mono flex flex-wrap gap-2 text-[12px]' style={{ color: 'var(--muted)' }}>
            {['OpenAI tool calling', 'pgvector', 'Postgres', 'Next.js route handler', 'zod'].map((t) => (
              <span key={t} className='rounded-full px-2.5 py-0.5' style={{ border: '1px solid var(--border)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className='mt-6'>
          <CompanyAgentDemo />
        </div>
      </section>

      {/* PROJECT 02 */}
      <section className='mx-auto max-w-[1120px] px-6 pt-20'>
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='max-w-[62ch]'>
            <span className='site-kicker'>Project 02 · live</span>
            <h2
              className='site-display mt-2 font-bold'
              style={{ fontSize: 'clamp(24px,3vw,32px)', letterSpacing: '-0.03em' }}>
              Lead agent on a CRM — LangGraph, MCP and human approval
            </h2>
            <p className='mt-2 text-[15.5px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
              A Python service: a LangGraph state machine qualifies an inbound lead, reads the CRM and inventory through
              its own MCP server, drafts the reply and proposes CRM writes. The graph then pauses — state checkpointed
              in Postgres — until a human approves, edits or rejects. Only approved actions run.
            </p>
          </div>
          <div className='site-mono flex flex-wrap gap-2 text-[12px]' style={{ color: 'var(--muted)' }}>
            {['Python', 'FastAPI', 'LangGraph', 'MCP server', 'Postgres checkpointer', 'Render'].map((t) => (
              <span key={t} className='rounded-full px-2.5 py-0.5' style={{ border: '1px solid var(--border)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className='mt-6'>
          <LeadAgentDemo />
        </div>
      </section>

      {/* NEXT PROJECTS */}
      <section className='mx-auto max-w-[1120px] px-6 pt-14'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {upcoming.map((p) => (
            <div
              key={p.num}
              className='rounded-[18px] p-[22px]'
              style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
              <span className='site-kicker'>Project {p.num} · in progress</span>
              <h3 className='site-display mt-2 text-[19px] font-semibold' style={{ letterSpacing: '-0.02em' }}>
                {p.title}
              </h3>
              <p className='mt-2 text-[14.5px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW I BUILD */}
      <section id='how' className='mx-auto max-w-[1120px] scroll-mt-20 px-6 pt-20'>
        <span className='site-kicker'>How I build</span>
        <h2
          className='site-display mt-2 font-bold'
          style={{ fontSize: 'clamp(24px,3vw,30px)', letterSpacing: '-0.03em' }}>
          Production habits, visible in every project.
        </h2>
        <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {principles.map((p) => (
            <div
              key={p.title}
              className='rounded-[18px] p-[20px]'
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h3 className='site-display text-[16.5px] font-semibold' style={{ letterSpacing: '-0.02em' }}>
                {p.title}
              </h3>
              <p className='mt-2 text-[14px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* MORE WORK */}
      <section className='mx-auto max-w-[1120px] px-6 pt-20'>
        <OtherServices />
      </section>

      {/* CONTACT */}
      <section id='contact' className='mx-auto max-w-[1120px] scroll-mt-20 px-6 pt-20 pb-24'>
        <div
          className='relative overflow-hidden rounded-[26px] px-8 py-14 text-center sm:px-12'
          style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
          <div
            className='absolute inset-0'
            style={{ background: 'radial-gradient(60% 120% at 50% -10%, var(--accent-soft), transparent)', opacity: 0.9 }}
          />
          <div className='relative'>
            <h2
              className='site-display font-bold'
              style={{ fontSize: 'clamp(28px,4vw,42px)', letterSpacing: '-0.03em', textWrap: 'balance' }}>
              Building something with LLMs? Let&apos;s talk.
            </h2>
            <p className='mx-auto mt-4 max-w-[52ch] text-[16.5px]' style={{ lineHeight: 1.55, opacity: 0.72 }}>
              {hiring.availability}. Also available for fixed-scope builds.
            </p>
            <div className='mt-8 flex flex-wrap justify-center gap-3'>
              {links.length ? (
                links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel='noreferrer'
                    className='site-btn h-[50px] px-[22px] text-[15px]'
                    style={{ background: 'transparent', color: 'var(--bg)', border: '1px solid color-mix(in oklch, var(--bg) 40%, transparent)' }}>
                    <l.icon className='h-4 w-4' />
                    {l.label}
                  </a>
                ))
              ) : (
                <Link href='/services' className='site-btn site-btn-accent h-[50px] px-[26px] text-[15.5px]'>
                  See services
                  <ArrowUpRight className='h-[17px] w-[17px]' />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
