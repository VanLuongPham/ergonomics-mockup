'use client'

import { AgentPanel } from '@/components/agent/agent-panel'
import { AgentProvider } from '@/components/agent/agent-provider'
import { ProductListing } from '@/components/store/product-listing'
import { StoreHeader } from '@/components/store/store-header'
import { CartDrawer, QuickView } from '@/components/store/store-overlays'
import { StudyProvider } from '@/components/study/study-provider'

export function ShopApp() {
  return (
    <StudyProvider>
      <AgentProvider>
        <div className="flex h-dvh flex-col">
          <StoreHeader />
          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 overflow-y-auto"><ProductListing /></main>
            <AgentPanel />
          </div>
        </div>
        <CartDrawer />
        <QuickView />
      </AgentProvider>
    </StudyProvider>
  )
}
