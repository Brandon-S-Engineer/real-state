import type { Metadata } from 'next'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/content/projects'
import DashboardDemo from '@/components/demos/saas-analytics-dashboard'
import LeadToCrmAutomationDemo from '@/components/demos/lead-to-crm-automation'
import SmartInboxRouterDemo from '@/components/demos/smart-inbox-router'
import HybridInventoryAgentDemo from '@/components/demos/hybrid-inventory-agent'
import DeepResearchAgentDemo from '@/components/demos/deep-research-agent'
import OneTimeCheckoutUnlockDemo from '@/components/demos/one-time-checkout-unlock'
import SubscriptionBillingDunningDemo from '@/components/demos/subscription-billing-dunning'
import UsageMeteredBillingDemo from '@/components/demos/usage-metered-billing'
import MarketplaceSplitPaymentsDemo from '@/components/demos/marketplace-split-payments'
import MvpDemo from '@/components/demos/micro-saas-mvp'
import CrmDemo from '@/components/demos/ai-real-estate-crm'
import DocExtractorDemo from '@/components/demos/ai-document-extractor'
import AssessmentDemo from '@/components/demos/assessment-paywall-mvp'
import MembershipDemo from '@/components/demos/membership-portal-mvp'

// Registry: slug → interactive demo component. A demo ships here when its
// project in src/content/projects.ts flips to demoStatus: 'live'.
const DEMOS: Record<string, ComponentType> = {
  // AI chatbots & agents
  'lead-to-crm-automation': LeadToCrmAutomationDemo,
  'smart-inbox-router': SmartInboxRouterDemo,
  'hybrid-inventory-agent': HybridInventoryAgentDemo,
  'deep-research-agent': DeepResearchAgentDemo,
  // SaaS dashboards & internal tools
  'saas-analytics-dashboard': DashboardDemo,
  'ai-real-estate-crm': CrmDemo,
  'ai-document-extractor': DocExtractorDemo,
  // MVPs
  'one-time-checkout-unlock': OneTimeCheckoutUnlockDemo,
  'subscription-billing-dunning': SubscriptionBillingDunningDemo,
  'usage-metered-billing': UsageMeteredBillingDemo,
  'marketplace-split-payments': MarketplaceSplitPaymentsDemo,
  'micro-saas-mvp': MvpDemo,
  'assessment-paywall-mvp': AssessmentDemo,
  'membership-portal-mvp': MembershipDemo,
}

export function generateStaticParams() {
  return Object.keys(DEMOS).map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = getProject(slug)
  if (!project) return { title: 'Demo not found' }
  return {
    title: `Live demo — ${project.title}`,
    description: project.tagline,
  }
}

export default async function DemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ embed?: string }>
}) {
  const [{ slug }, { embed }] = await Promise.all([params, searchParams])
  const project = getProject(slug)
  const Demo = DEMOS[slug]
  if (!project || !Demo) notFound()

  const embedded = embed === '1'

  return (
    <div className='flex min-h-screen flex-col'>
      {/* Slim demo bar — hidden in embed mode (the case study already frames it) */}
      {!embedded && (
        <div
          className='flex h-10 shrink-0 items-center justify-between gap-3 px-4 text-[12px]'
          style={{
            background: 'oklch(0.17 0.006 60)',
            color: 'oklch(0.72 0.006 75)',
            fontFamily: 'var(--font-jetbrains), monospace',
          }}>
          <span className='flex min-w-0 items-center gap-2'>
            <span
              className='h-1.5 w-1.5 shrink-0 rounded-full'
              style={{ background: 'oklch(0.76 0.15 158)' }}
            />
            <span className='truncate'>
              live demo — {project.title} · built in {project.duration} by Brandon Soria
            </span>
          </span>
          <span className='flex shrink-0 items-center gap-4'>
            <Link
              href={`/work/${project.slug}`}
              className='transition-opacity hover:opacity-80'
              style={{ color: 'oklch(0.9 0.004 75)' }}>
              case study →
            </Link>
          </span>
        </div>
      )}
      <div className='min-h-0 flex-1'>
        <Demo />
      </div>
    </div>
  )
}
