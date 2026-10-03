'use client'

import { useState } from 'react'
import type { DemoGroup as Group } from '@/content/demo-groups'
import DemoStage from './demo-stage'

// One self-contained stage per group on /demos.
export default function DemoGroup({ group }: { group: Group }) {
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
