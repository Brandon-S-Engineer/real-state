'use client'

import { useState } from 'react'
import type { ProductGroup as Group } from '@/content/product-groups'
import DemoStage from './demo-stage'

// One self-contained live stage per group on /mvp-saas.
export default function ProductGroup({ group }: { group: Group }) {
  const [active, setActive] = useState(0)
  return (
    <DemoStage
      id={group.id}
      kicker={group.kicker}
      heading={group.heading}
      blurb={group.blurb}
      items={group.items}
      active={active}
      onSelect={setActive}
    />
  )
}
