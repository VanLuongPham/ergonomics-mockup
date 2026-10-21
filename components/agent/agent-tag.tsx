import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AgentTag({ children = 'Assistant', className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-agent-soft px-2 py-0.5 text-xs font-medium text-agent-foreground ring-1 ring-agent/60',
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      {children}
    </span>
  )
}

export function AgentAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-7 shrink-0 items-center justify-center rounded-full bg-agent text-agent-foreground', className)}
    >
      <Sparkles className="size-3.5" />
    </span>
  )
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      <span aria-hidden="true" className="tracking-tight text-agent">
        {'★★★★★'.slice(0, Math.round(rating))}
        <span className="text-border">{'★★★★★'.slice(Math.round(rating))}</span>
      </span>
      <span className="sr-only">{`${rating} out of 5 stars`}</span>
    </span>
  )
}
