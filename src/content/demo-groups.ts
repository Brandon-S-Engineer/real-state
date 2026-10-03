// The /demos library: every live, interactive build, grouped the way buyers
// think — AI first (the four Services levels), then the product around it.
// Pulls from projects.ts so titles, taglines, and URLs never drift.
//
// Not listed on purpose: the 3 legacy MVP demos (micro-saas, assessment,
// membership) — the payments ladder covers that ground more clearly.

import type { StageItem } from '@/components/site/demo-stage'
import { getProject } from './projects'
import { aiServices } from './services'

export type DemoGroup = {
  id: string
  kicker: string
  heading: string
  blurb: string
  items: StageItem[]
}

function item(slug: string, extra: Partial<StageItem> = {}): StageItem {
  const p = getProject(slug)
  if (!p?.demoUrl) throw new Error(`demo-groups: no live demo for "${slug}"`)
  return { exampleTitle: p.title, tagline: p.tagline, demoUrl: p.demoUrl, tier: p.tierLevel, ...extra }
}

export const demoGroups: DemoGroup[] = [
  {
    id: 'ai',
    kicker: 'AI · four levels',
    heading: 'From a simple automation to a team of agents.',
    blurb: 'One example per level of the Services ladder — the same levels you can order.',
    items: aiServices.map((s) => item(s.work, { tier: s.tier })),
  },
  {
    id: 'payments',
    kicker: 'Around the AI · payments',
    heading: 'The money side of your product.',
    blurb: 'From a single checkout to marketplace payouts — all on Stripe, all running in test mode.',
    items: [
      'one-time-checkout-unlock',
      'subscription-billing-dunning',
      'usage-metered-billing',
      'marketplace-split-payments',
    ].map((slug) => item(slug)),
  },
  {
    id: 'dashboards',
    kicker: 'Around the AI · dashboards',
    heading: 'Where your team works with the AI.',
    blurb: 'Admin panels and internal tools with auth, charts, and tables — with AI built in where it helps.',
    items: [
      item('saas-analytics-dashboard', { label: 'Analytics' }),
      item('ai-real-estate-crm', { label: 'CRM' }),
      item('ai-document-extractor', { label: 'Document AI' }),
    ],
  },
]
