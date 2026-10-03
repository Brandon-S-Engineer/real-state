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
