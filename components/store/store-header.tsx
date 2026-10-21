'use client'

import { useState } from 'react'
import { MapPin, Menu, Search, ShoppingCart, Sparkles, User } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-provider'
import { cn } from '@/lib/utils'

const NAV = ['Deals', 'Audio', 'Computers', 'Phones', 'TV & Home', 'Smart Home', 'Gaming', 'Cameras']

export function StoreHeader() {
  const agent = useAgent()
  const { filters, cart, panelOpen, phase } = agent.state
  const [term, setTerm] = useState(filters.query)
  const count = cart.reduce((a, c) => a + c.qty, 0)

  return (
    <header className="border-b bg-background">
      <div className="flex items-center gap-3 px-4 py-3 lg:gap-6 lg:px-6">
        <button type="button" className="rounded-md p-1.5 hover:bg-muted lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <a href="#" className="flex items-baseline gap-0.5 text-xl font-bold tracking-tight text-primary">
          northvale
          <span className="size-1.5 rounded-full bg-agent" aria-hidden="true" />
        </a>

        <form
          role="search"
          className="hidden flex-1 md:flex"
          onSubmit={(e) => {
            e.preventDefault()
            agent.setFilter('query', term.trim())
          }}
        >
          <label htmlFor="store-search" className="sr-only">
            Search products
          </label>
          <div className="flex w-full max-w-2xl items-center rounded-lg border bg-muted focus-within:border-primary focus-within:bg-background">
            <input
              id="store-search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search headphones, earbuds, brands…"
              className="h-10 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="flex h-10 items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Search">
              <Search className="size-4" />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            type="button"
            onClick={() => agent.setPanelOpen(!panelOpen)}
            aria-pressed={panelOpen}
            className={cn(
              'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
              panelOpen ? 'bg-agent text-agent-foreground' : 'bg-agent-soft text-agent-foreground ring-1 ring-agent/60 hover:bg-agent',
            )}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Shopping assistant</span>
            {phase !== 'idle' && !panelOpen && <span className="size-2 rounded-full bg-primary" aria-label="Assistant has updates" />}
          </button>
          <button type="button" className="hidden h-9 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted md:flex">
            <User className="size-4" aria-hidden="true" />
            Sign in
          </button>
          <button
            type="button"
            onClick={() => agent.setCartOpen(true)}
            className="relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
            aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
            <span className="hidden font-medium md:inline">Cart</span>
            {count > 0 && (
              <span className="absolute -top-0.5 left-6 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav aria-label="Departments" className="flex items-center gap-1 overflow-x-auto border-t px-4 text-sm lg:px-6">
        {NAV.map((item) => (
          <a
            key={item}
            href="#"
            aria-current={item === 'Audio' ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2.5',
              item === 'Audio' ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item}
          </a>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground lg:flex">
          <MapPin className="size-3.5" aria-hidden="true" />
          Delivering to 94107 · Free shipping over $35
        </span>
      </nav>
    </header>
  )
}
