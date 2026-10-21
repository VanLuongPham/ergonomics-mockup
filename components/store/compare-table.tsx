'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-provider'
import { AgentTag } from '@/components/agent/agent-tag'
import { WEIGHT_LABELS, dimensionLeaders, fitScore } from '@/lib/agent-logic'
import { DIMENSIONS, DIMENSION_ORDER, PRODUCT_BY_ID } from '@/lib/catalog'
import { cn } from '@/lib/utils'

export function CompareTable() {
  const agent = useAgent()
  const { shortlist, brief, recommendation, selectedId } = agent.state
  if (!brief || shortlist.length < 2) return null

  const products = shortlist.map((id) => PRODUCT_BY_ID[id])
  const leaders = dimensionLeaders(shortlist)

  return (
    <section aria-labelledby="compare-heading" className="rounded-xl border border-agent bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="compare-heading" className="text-sm font-semibold">
            Shortlist comparison
          </h2>
          <AgentTag>Prepared by assistant</AgentTag>
          <span className="text-xs text-muted-foreground">● marks the leader in each row</span>
        </div>
        <button
          type="button"
          onClick={() => agent.setCompareOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Hide comparison"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b">
              <th scope="col" className="w-40 px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Your priority
              </th>
              {products.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className={cn(
                    'px-3 py-3 text-left align-top font-medium',
                    recommendation?.primaryId === p.id && 'bg-agent-soft',
                    selectedId === p.id && recommendation?.primaryId !== p.id && 'bg-muted',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Image src={p.image || '/placeholder.svg'} alt="" width={36} height={36} className="rounded-md bg-muted" />
                    <div className="flex flex-col">
                      <span className="leading-tight">{p.name}</span>
                      {recommendation?.primaryId === p.id && (
                        <span className="text-xs font-normal text-agent-foreground">Assistant’s pick</span>
                      )}
                      {selectedId === p.id && recommendation?.primaryId !== p.id && (
                        <span className="text-xs font-normal text-primary">Your choice</span>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <th scope="row" className="px-4 py-2 text-left font-normal text-muted-foreground">
                Fit score
              </th>
              {products.map((p) => (
                <td key={p.id} className={cn('px-3 py-2 font-mono font-semibold', recommendation?.primaryId === p.id && 'bg-agent-soft')}>
                  {fitScore(p, brief)}
                </td>
              ))}
            </tr>
            {DIMENSION_ORDER.map((d) => (
              <tr key={d} className="border-b">
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  <span className="flex flex-col">
                    {DIMENSIONS[d].label}
                    <span className={cn('text-xs', brief.weights[d] === 3 ? 'font-medium text-agent-foreground' : 'text-muted-foreground')}>
                      {WEIGHT_LABELS[brief.weights[d]]}
                    </span>
                  </span>
                </th>
                {products.map((p) => {
                  const lead = leaders[d] === p.id
                  return (
                    <td
                      key={p.id}
                      className={cn('px-3 py-2', lead && 'font-semibold', recommendation?.primaryId === p.id && 'bg-agent-soft')}
                    >
                      {lead && <span className="mr-1 text-agent" aria-label="Leader">●</span>}
                      {DIMENSIONS[d].format(p)}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="border-b">
              <th scope="row" className="px-4 py-2 text-left font-normal text-muted-foreground">
                Water / Multipoint
              </th>
              {products.map((p) => (
                <td key={p.id} className={cn('px-3 py-2 text-muted-foreground', recommendation?.primaryId === p.id && 'bg-agent-soft')}>
                  {p.specs.water} · {p.specs.multipoint ? 'Yes' : 'No'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="px-4 py-2 text-left font-normal text-muted-foreground">
                Rating
              </th>
              {products.map((p) => (
                <td key={p.id} className={cn('px-3 py-2 text-muted-foreground', recommendation?.primaryId === p.id && 'bg-agent-soft')}>
                  {p.rating} ({p.reviews.toLocaleString()})
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
