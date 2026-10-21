'use client'

import Image from 'next/image'
import { Ban, Check, Eye, Loader2, Sparkles } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-provider'
import { Stars } from '@/components/agent/agent-tag'
import { Button } from '@/components/ui/button'
import { fitScore } from '@/lib/agent-logic'
import { formFactorLabel, type Product } from '@/lib/catalog'
import { cn } from '@/lib/utils'

type Status = { tone: 'agent' | 'muted' | 'primary'; icon: React.ReactNode; label: string } | null

export function ProductCard({ product }: { product: Product }) {
  const agent = useAgent()
  const { scanningId, reviewedIds, excluded, shortlist, recommendation, selectedId, brief } = agent.state

  const scanning = scanningId === product.id
  const isPick = recommendation?.primaryId === product.id
  const isChoice = !!recommendation && selectedId === product.id && !isPick
  const shortIdx = shortlist.indexOf(product.id)
  const exclusion = excluded[product.id]
  const fit = brief && !exclusion ? fitScore(product, brief) : null

  let status: Status = null
  if (scanning) status = { tone: 'agent', icon: <Loader2 className="size-3 animate-spin" />, label: 'Assistant reviewing…' }
  else if (isPick) status = { tone: 'agent', icon: <Sparkles className="size-3" />, label: `Assistant’s pick · fit ${recommendation!.scores[product.id]}` }
  else if (isChoice) status = { tone: 'primary', icon: <Check className="size-3" />, label: 'Your choice' }
  else if (shortIdx >= 0) status = { tone: 'agent', icon: <Check className="size-3" />, label: `Shortlisted${fit !== null ? ` · fit ${fit}` : ''}` }
  else if (exclusion) status = { tone: 'muted', icon: <Ban className="size-3" />, label: `Excluded · ${exclusion}` }
  else if (reviewedIds.includes(product.id)) status = { tone: 'muted', icon: <Eye className="size-3" />, label: `Reviewed${fit !== null ? ` · fit ${fit}` : ''}` }

  const highlighted = scanning || isPick || shortIdx >= 0

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow',
        highlighted && 'border-agent ring-1 ring-agent',
        isChoice && 'border-primary ring-1 ring-primary',
        scanning && 'agent-scanning',
      )}
    >
      <button
        type="button"
        onClick={() => agent.setQuickView(product.id)}
        className="relative aspect-square overflow-hidden bg-muted"
        aria-label={`Quick view ${product.name}`}
      >
        <Image
          src={product.image || '/placeholder.svg'}
          alt={product.name}
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 640px) 33vw, 50vw"
          className={cn('object-cover transition-transform group-hover:scale-[1.03]', exclusion && 'opacity-50 grayscale')}
        />
        {product.badge && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {product.badge}
          </span>
        )}
      </button>

      {status && (
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium',
            status.tone === 'agent' && 'bg-agent-soft text-agent-foreground',
            status.tone === 'primary' && 'bg-primary text-primary-foreground',
            status.tone === 'muted' && 'bg-muted text-muted-foreground',
          )}
          role="status"
        >
          {status.icon}
          <span className="truncate">{status.label}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{product.brand}</span>
          <h3 className="text-sm font-medium leading-snug text-pretty">
            <button type="button" onClick={() => agent.setQuickView(product.id)} className="text-left hover:underline">
              {product.name}
            </button>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Stars rating={product.rating} />
          <span className="text-xs text-muted-foreground">({product.reviews.toLocaleString()})</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formFactorLabel(product.formFactor)} · {product.specs.battery}h battery · ANC {product.specs.anc}
        </p>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-semibold">${product.price}</span>
          {product.listPrice && <span className="text-xs text-muted-foreground line-through">${product.listPrice}</span>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => agent.addToCart(product.id)}>
            Add to cart
          </Button>
          {brief && (
            <Button
              size="sm"
              variant="ghost"
              className="text-agent-foreground hover:bg-agent-soft"
              onClick={() => agent.askAbout(product.id)}
              aria-label={`Ask the assistant about ${product.name}`}
            >
              <Sparkles />
              Ask
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
