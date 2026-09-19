// Productized, fixed-price offers. Mirrors the highest-weighted Upwork niches so
// each service maps to a matching demo/case study in the proposal.

export type Service = {
  name: string
  price: string
  timeline: string
  summary: string
  includes: string[]
  // slug of the related case study, if any
  work?: string
}

export const services: Service[] = [
  {
    name: 'MVP in a Week',
    price: 'from $2,500',
    timeline: '5–7 days',
    summary:
      'A real, payable product: landing, auth, billing, and your core feature — live and deployed.',
    includes: [
      'Marketing landing page',
      'Auth & user accounts',
      'Stripe subscriptions',
      'Your one core feature',
      'Deployed on Vercel',
    ],
    work: 'micro-saas-mvp',
  },
  {
    name: 'AI Chatbot / Agent Integration',
    price: 'from $1,200',
    timeline: '3–5 days',
    summary:
      'An embeddable assistant that answers from your data, with citations and human handoff.',
    includes: [
      'RAG over your knowledge base',
      'Embeddable widget (one snippet)',
      'Streaming responses + citations',
      'Lead capture & handoff',
      'Conversation review panel',
    ],
    work: 'hybrid-inventory-agent',
  },
  {
    name: 'SaaS Dashboard',
    price: 'from $1,800',
    timeline: '4–6 days',
    summary:
      'A production admin panel with auth, charts, and CRUD your team will actually use.',
    includes: [
      'Role-based authentication',
      'KPI cards & charts',
      'Filterable data tables + CRUD',
      'Responsive, dark/light',
      'One-click deploy',
    ],
    work: 'saas-analytics-dashboard',
  },
  {
    name: 'Landing Page + Integration',
    price: 'from $800',
    timeline: '2–4 days',
    summary:
      'A pixel-perfect, fast marketing site — Figma-to-code — wired to the tools you use.',
    includes: [
      'Figma-to-code, pixel-perfect',
      'Fully responsive & accessible',
      'Forms, analytics, CRM/email wiring',
      'SEO & OG metadata',
      'Deployed & handed off',
    ],
  },
]
