// Central config for the public portfolio.
//
// Marketplace-safe by design: the site is linked from freelance platform
// profiles, so it carries no contact details, booking links, prices, or
// platform names. Every CTA points back into the site (demos, work); the
// conversation and the contract happen on whichever platform sent the visitor.

export const site = {
  name: 'Brandon Soria',
  role: 'Full-Stack & AI Engineer',
  // The 5-second hook. Speed + outcome, mirrors what high-budget clients
  // actually search for.
  tagline: 'Production-ready AI web apps in days, not months.',
  subhead:
    'From simple automations to multi-agent systems — fixed scope, fixed timeline, and a live demo of every level you can try right here.',
  location: 'Remote · Available worldwide',
  // Home orientado a contratación: quien evalúa debe poder contactarte en un
  // clic. Los vacíos no se muestran.
  hiring: {
    headline: 'I build AI agents and LLM features that run in production.',
    subhead:
      'Applied AI engineer — RAG, tool-calling agents, MCP and voice, on a full-stack base of Next.js, Python and Postgres. Every project below is live: try it, then read how it was built.',
    availability: 'Open to full-time remote or on-site in CDMX',
    meta: ['Mexico City · GMT-6', 'English C1'],
    links: {
      github: '',
      linkedin: '',
      email: '',
      cv: '',
    },
  },
  // Core stack shown as a trust strip on the home page — AI first.
  stack: [
    'Python',
    'FastAPI',
    'Pydantic AI',
    'OpenAI',
    'Claude',
    'pgvector',
    'n8n',
    'Next.js',
    'TypeScript',
    'Postgres',
    'Stripe',
  ],
} as const

export type Site = typeof site
