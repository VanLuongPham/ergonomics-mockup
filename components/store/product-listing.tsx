'use client'

import { ChevronRight, X } from 'lucide-react'
import { applyFilters, useAgent, type Filters } from '@/components/agent/agent-provider'
import { AgentTag } from '@/components/agent/agent-tag'
import { CompareTable } from '@/components/store/compare-table'
import { FilterSidebar } from '@/components/store/filter-sidebar'
import { ProductCard } from '@/components/store/product-card'
import { formFactorLabel } from '@/lib/catalog'

export function ProductListing() {
  const agent = useAgent()
  const { filters, filterSource, compareOpen, shortlist } = agent.state
  const products = applyFilters(filters)

  const chips: { key: keyof Filters; label: string; reset: Filters[keyof Filters] }[] = []
  if (filters.query) chips.push({ key: 'query', label: `“${filters.query}”`, reset: '' })
  if (filters.maxPrice) chips.push({ key: 'maxPrice', label: `Under $${filters.maxPrice}`, reset: null })
  if (filters.formFactor !== 'any') chips.push({ key: 'formFactor', label: formFactorLabel(filters.formFactor), reset: 'any' })
  if (filters.brands.length) chips.push({ key: 'brands', label: filters.brands.join(', '), reset: [] })

  return (
    <div className="flex flex-col gap-4 px-4 py-5 lg:px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
        <a href="#" className="hover:text-foreground">Home</a>
        <ChevronRight className="size-3" aria-hidden="true" />
        <a href="#" className="hover:text-foreground">Audio</a>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span aria-current="page" className="text-foreground">Headphones</span>
      </nav>

      <div className="flex gap-6">
        <FilterSidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">Headphones & Earbuds</h1>
              <p className="text-sm text-muted-foreground">{products.length} results</p>
            </div>
            <div className="flex items-center gap-3">
              {!compareOpen && shortlist.length >= 2 && (
                <button
                  type="button"
                  onClick={() => agent.setCompareOpen(true)}
                  className="text-sm font-medium text-agent-foreground underline decoration-agent underline-offset-4"
                >
                  Show comparison
                </button>
              )}
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Sort</span>
                <select
                  value={filters.sort}
                  onChange={(e) => agent.setFilter('sort', e.target.value as Filters['sort'])}
                  className="h-9 rounded-lg border bg-background px-2 text-sm"
                >
                  <option value="relevance">Best match</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="rating">Top rated</option>
                </select>
              </label>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => agent.setFilter(c.key, c.reset as never)}
                    className="flex items-center gap-1.5 rounded-full border bg-background py-1 pl-3 pr-2 text-xs hover:bg-muted"
                    aria-label={`Remove filter ${c.label}`}
                  >
                    {c.label}
                    {filterSource[c.key] === 'agent' && <AgentTag className="py-0">set by assistant</AgentTag>}
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {compareOpen && <CompareTable />}

          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No products match these filters.{' '}
              <button type="button" onClick={agent.clearFilters} className="font-medium text-primary hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <li key={p.id} className="flex">
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
