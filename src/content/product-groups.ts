// The /mvp-saas page: "the product around the AI". AI is the lead offer
// (Services); this is what turns it into something people can buy and use.
// Grouped by job, not by tier, and pulled from projects.ts so titles,
// taglines, and URLs never drift.

import type { StageItem } from '@/components/site/demo-stage'
import { getProject } from './projects'

export type ProductGroup = {
  id: string
  kicker: string
  heading: string
  blurb: string
  items: StageItem[]
}

function item(slug: string, label: string): StageItem {
  const p = getProject(slug)
  if (!p?.demoUrl) throw new Error(`product-groups: no live demo for "${slug}"`)
  return { label, exampleTitle: p.title, tagline: p.tagline, demoUrl: p.demoUrl }
}

export const productGroups: ProductGroup[] = [
  {
    id: 'mvp',
    kicker: 'Launch it · MVPs',
    heading: 'From idea to paying users.',
    blurb: 'Complete products — sign-up, the core feature, and checkout — shipped in about a week.',
    items: [
      item('micro-saas-mvp', 'AI SaaS'),
      item('assessment-paywall-mvp', 'Paywall funnel'),
      item('membership-portal-mvp', 'Membership'),
    ],
  },
  {
    id: 'payments',
    kicker: 'Get paid · billing',
    heading: 'The money side of your product.',
    blurb: 'Whatever your pricing model, on Stripe — all four running in test mode.',
    items: [
      item('one-time-checkout-unlock', 'One-time'),
      item('subscription-billing-dunning', 'Subscription'),
      item('usage-metered-billing', 'Usage-based'),
      item('marketplace-split-payments', 'Marketplace'),
    ],
  },
  {
    id: 'dashboards',
    kicker: 'Run it · dashboards',
    heading: 'Where your team works with the AI.',
    blurb: 'Admin panels and internal tools with auth, charts, and tables — AI built in where it helps.',
    items: [
      item('saas-analytics-dashboard', 'Analytics'),
      item('ai-real-estate-crm', 'CRM'),
      item('ai-document-extractor', 'Document AI'),
    ],
  },
]
