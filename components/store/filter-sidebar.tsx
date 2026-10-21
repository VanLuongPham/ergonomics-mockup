'use client'

import { useAgent, type FilterKey } from '@/components/agent/agent-provider'
import { AgentTag } from '@/components/agent/agent-tag'
import { BRANDS } from '@/lib/catalog'
import { cn } from '@/lib/utils'

const PRICE_OPTIONS: (number | null)[] = [null, 100, 150, 200, 300]

function Section({ title, source, children }: { title: string; source?: 'agent' | 'user'; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 border-b pb-4">
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
        {title}
        {source === 'agent' && <AgentTag>Set by assistant</AgentTag>}
      </legend>
      {children}
    </fieldset>
  )
}

function Option({ active, agentSet, onClick, children }: { active: boolean; agentSet?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
        active ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        active && agentSet && 'bg-agent-soft text-agent-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-3.5 items-center justify-center rounded-full border',
          active && (agentSet ? 'border-agent bg-agent' : 'border-primary bg-primary'),
        )}
      >
        {active && <span className="size-1.5 rounded-full bg-background" />}
      </span>
      {children}
    </button>
  )
}

export function FilterSidebar() {
  const agent = useAgent()
  const { filters, filterSource } = agent.state
  const src = (k: FilterKey) => filterSource[k]
  const priceOptions = filters.maxPrice && !PRICE_OPTIONS.includes(filters.maxPrice)
    ? [...PRICE_OPTIONS, filters.maxPrice].sort((a, b) => (a ?? 0) - (b ?? 0))
    : PRICE_OPTIONS

  return (
    <aside aria-label="Filters" className="hidden w-56 shrink-0 flex-col gap-4 lg:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        <button type="button" onClick={agent.clearFilters} className="text-xs text-primary hover:underline">
          Clear all
        </button>
      </div>

      <Section title="Price" source={src('maxPrice')}>
        {priceOptions.map((p) => (
          <Option
            key={p ?? 'any'}
            active={filters.maxPrice === p}
            agentSet={src('maxPrice') === 'agent'}
            onClick={() => agent.setFilter('maxPrice', p)}
          >
            {p ? `Under $${p}` : 'Any price'}
          </Option>
        ))}
      </Section>

      <Section title="Type" source={src('formFactor')}>
        {(['any', 'over-ear', 'in-ear'] as const).map((f) => (
          <Option
            key={f}
            active={filters.formFactor === f}
            agentSet={src('formFactor') === 'agent'}
            onClick={() => agent.setFilter('formFactor', f)}
          >
            {f === 'any' ? 'All types' : f === 'over-ear' ? 'Over-ear headphones' : 'Earbuds'}
          </Option>
        ))}
      </Section>

      <Section title="Brand" source={src('brands')}>
        {BRANDS.map((b) => {
          const checked = filters.brands.includes(b)
          return (
            <label key={b} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  agent.setFilter('brands', checked ? filters.brands.filter((x) => x !== b) : [...filters.brands, b])
                }
                className="size-3.5 accent-primary"
              />
              {b}
            </label>
          )
        })}
      </Section>
    </aside>
  )
}
