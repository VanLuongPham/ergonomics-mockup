'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDashed,
  Hand,
  Info,
  Loader2,
  Minus,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { STEPS, useAgent, type Message, type StepStatus } from '@/components/agent/agent-provider'
import { Button } from '@/components/ui/button'
import { WEIGHT_LABELS, fitScore, scoreProduct, type Brief, type Weight } from '@/lib/agent-logic'
import { CATALOG, DIMENSIONS, DIMENSION_ORDER, PRODUCT_BY_ID, formFactorLabel } from '@/lib/catalog'
import { cn } from '@/lib/utils'

function CardShell({
  title,
  icon,
  tone = 'default',
  children,
}: {
  title: string
  icon?: React.ReactNode
  tone?: 'default' | 'checkpoint'
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border bg-card', tone === 'checkpoint' && 'border-agent ring-1 ring-agent/50')}>
      <div className={cn('flex items-center gap-2 border-b px-3 py-2 text-xs font-semibold', tone === 'checkpoint' ? 'bg-agent-soft text-agent-foreground' : 'bg-muted text-muted-foreground')}>
        {icon}
        {title}
      </div>
      <div className="flex flex-col gap-3 p-3">{children}</div>
    </div>
  )
}

export function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') return <Check className="size-3.5 text-primary" aria-label="Done" />
  if (status === 'running') return <Loader2 className="size-3.5 animate-spin text-agent-foreground" aria-label="In progress" />
  if (status === 'waiting') return <Hand className="size-3.5 text-agent-foreground" aria-label="Waiting for you" />
  return <CircleDashed className="size-3.5 text-muted-foreground" aria-label="Not started" />
}

const PLAN_DETAIL: Record<string, string> = {
  understand: 'Turn your request into a brief you can edit',
  search: 'Filter the catalog and screen out non-fits',
  shortlist: 'Rank what’s left and keep the best few',
  compare: 'Lay specs side by side',
  recommend: 'Pick one, explain why, show trade-offs',
  cart: 'Add to cart — only after you confirm',
}

export function PlanCard({ live }: { live: boolean }) {
  const { state } = useAgent()
  return (
    <CardShell title="My plan" icon={<Sparkles className="size-3.5" />}>
      <ol className="flex flex-col gap-2">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5">{live ? <StepIcon status={state.steps[s.id]} /> : <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>}</span>
            <span className="flex flex-col">
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">{PLAN_DETAIL[s.id]}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="flex items-start gap-2 rounded-lg bg-muted p-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {state.autonomy === 'step'
          ? 'You chose “Ask before every step”, so I’ll pause for your OK after each step.'
          : 'I’ll check with you on the brief and before anything goes in your cart. You can pause or stop me anytime.'}
      </p>
    </CardShell>
  )
}

function WeightControl({ label, value, onChange, disabled }: { label: string; value: Weight; onChange: (w: Weight) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div role="radiogroup" aria-label={`${label} priority`} className="flex rounded-md border p-0.5">
        {([0, 1, 2, 3] as Weight[]).map((w) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={value === w}
            disabled={disabled}
            onClick={() => onChange(w)}
            className={cn(
              'rounded px-1.5 py-0.5 text-xs',
              value === w ? (w === 3 ? 'bg-agent text-agent-foreground' : 'bg-foreground text-background') : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {w === 0 ? 'Off' : WEIGHT_LABELS[w].slice(0, w === 2 ? 3 : 4)}
          </button>
        ))}
      </div>
    </div>
  )
}

function sameBrief(a: Brief, b: Brief) {
  return (
    a.budget === b.budget &&
    a.formFactor === b.formFactor &&
    a.requireWater === b.requireWater &&
    a.requireMultipoint === b.requireMultipoint &&
    DIMENSION_ORDER.every((d) => a.weights[d] === b.weights[d])
  )
}

export function BriefCard({ message, live }: { message: Message; live: boolean }) {
  const agent = useAgent()
  const original = message.brief!
  const [draft, setDraft] = useState<Brief>(original)
  const editable = live && agent.state.phase === 'brief'

  if (!editable) {
    const b = live && agent.state.brief ? agent.state.brief : original
    return (
      <CardShell title="Shopping brief" icon={<Check className="size-3.5" />}>
        <ul className="flex flex-wrap gap-1.5 text-xs">
          <li className="rounded-full bg-muted px-2 py-0.5">{b.budget ? `≤ $${b.budget}` : 'No budget'}</li>
          <li className="rounded-full bg-muted px-2 py-0.5">{formFactorLabel(b.formFactor)}</li>
          {b.requireWater && <li className="rounded-full bg-muted px-2 py-0.5">Sweat resistant</li>}
          {b.requireMultipoint && <li className="rounded-full bg-muted px-2 py-0.5">Multipoint</li>}
          {DIMENSION_ORDER.filter((d) => b.weights[d] === 3).map((d) => (
            <li key={d} className="rounded-full bg-agent-soft px-2 py-0.5 text-agent-foreground">
              {DIMENSIONS[d].label}: High
            </li>
          ))}
        </ul>
        {live && !agent.isWorking && (
          <Button size="sm" variant="outline" className="self-start" onClick={agent.editBrief}>
            <Pencil />
            Edit brief & re-run
          </Button>
        )}
      </CardShell>
    )
  }

  const edited = !sameBrief(draft, original)
  const set = (patch: Partial<Brief>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <CardShell title="Checkpoint · Confirm what I understood" icon={<Hand className="size-3.5" />} tone="checkpoint">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">What I inferred</span>
        <ul className="flex flex-col gap-1">
          {original.assumptions.map((a) => (
            <li key={a} className="flex gap-1.5 text-xs leading-relaxed">
              <Info className="mt-0.5 size-3 shrink-0 text-agent-foreground" aria-hidden="true" />
              {a}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Budget
          <div className="flex items-center rounded-md border bg-background px-2">
            <span className="text-sm text-muted-foreground">$</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.budget ?? ''}
              placeholder="No limit"
              onChange={(e) => set({ budget: e.target.value ? Number(e.target.value) : null })}
              className="h-8 w-full bg-transparent px-1 text-sm text-foreground outline-none"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Type
          <select
            value={draft.formFactor}
            onChange={(e) => set({ formFactor: e.target.value as Brief['formFactor'] })}
            className="h-8 rounded-md border bg-background px-1.5 text-sm text-foreground"
          >
            <option value="any">Any type</option>
            <option value="over-ear">Over-ear</option>
            <option value="in-ear">Earbuds</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={draft.requireWater} onChange={(e) => set({ requireWater: e.target.checked })} className="accent-primary" />
          Must be sweat resistant
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={draft.requireMultipoint} onChange={(e) => set({ requireMultipoint: e.target.checked })} className="accent-primary" />
          Must have multipoint
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Priorities — how much each matters</span>
        {DIMENSION_ORDER.map((d) => (
          <WeightControl
            key={d}
            label={DIMENSIONS[d].label}
            value={draft.weights[d]}
            onChange={(w) => set({ weights: { ...draft.weights, [d]: w } })}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => agent.confirmBrief(draft, edited)}>
          {edited ? 'Save & search' : 'Looks right — search'}
          <ArrowRight />
        </Button>
        {edited && (
          <Button variant="ghost" onClick={() => setDraft(original)}>
            Undo changes
          </Button>
        )}
      </div>
    </CardShell>
  )
}

export function ShortlistCard({ message, live }: { message: Message; live: boolean }) {
  const agent = useAgent()
  const { phase, shortlist, excluded, brief } = agent.state
  const editable = live && phase === 'shortlist'
  const ids = live ? shortlist : message.ids ?? []
  const eligibleOthers = CATALOG.filter((p) => !excluded[p.id] && !ids.includes(p.id))
  const excludedList = Object.entries(excluded)

  return (
    <CardShell
      title={editable ? 'Checkpoint · Review the shortlist' : `Shortlist · ${ids.length} products`}
      icon={editable ? <Hand className="size-3.5" /> : <Check className="size-3.5" />}
      tone={editable ? 'checkpoint' : 'default'}
    >
      <ul className="flex flex-col gap-1.5">
        {ids.map((id, i) => {
          const p = PRODUCT_BY_ID[id]
          return (
            <li key={id} className="flex items-center gap-2 rounded-lg border p-1.5">
              <Image src={p.image || '/placeholder.svg'} alt="" width={36} height={36} className="rounded-md bg-muted" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  ${p.price} · fit {brief ? fitScore(p, brief) : '—'} · #{i + 1}
                </span>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => agent.toggleShortlist(id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${p.name} from shortlist`}
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {editable && eligibleOthers.length > 0 && ids.length < 5 && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Plus className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Add a product to the shortlist</span>
          <select
            value=""
            onChange={(e) => e.target.value && agent.toggleShortlist(e.target.value)}
            className="h-8 flex-1 rounded-md border bg-background px-1.5 text-sm text-foreground"
          >
            <option value="">Add another eligible product…</option>
            {eligibleOthers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ${p.price}
              </option>
            ))}
          </select>
        </label>
      )}

      {excludedList.length > 0 && (
        <details className="group rounded-lg bg-muted px-2 py-1.5 text-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
            {excludedList.length} excluded — see why
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {excludedList.map(([id, reason]) => (
              <li key={id} className="flex justify-between gap-2">
                <span className="font-medium">{PRODUCT_BY_ID[id].name}</span>
                <span className="text-right text-muted-foreground">{reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {editable ? (
        <Button onClick={agent.confirmShortlist} disabled={ids.length < 2} className="self-start">
          Compare {ids.length} products
          <ArrowRight />
        </Button>
      ) : (
        live &&
        !agent.isWorking &&
        phase !== 'confirm-cart' && (
          <Button size="sm" variant="outline" className="self-start" onClick={agent.reopenShortlist}>
            <Pencil />
            Edit shortlist
          </Button>
        )
      )}
      {editable && ids.length < 2 && <p className="text-xs text-muted-foreground">Keep at least 2 products to compare.</p>}
    </CardShell>
  )
}

export function CompareCard({ message, live }: { message: Message; live: boolean }) {
  const agent = useAgent()
  const { compareOpen, steps } = agent.state
  const waiting = live && steps.compare === 'waiting'
  return (
    <CardShell
      title={waiting ? 'Checkpoint · Review the comparison' : 'Comparison'}
      icon={waiting ? <Hand className="size-3.5" /> : <Check className="size-3.5" />}
      tone={waiting ? 'checkpoint' : 'default'}
    >
      <p className="text-sm leading-relaxed">{message.text}</p>
      <div className="flex flex-wrap gap-2">
        {waiting && (
          <Button onClick={agent.continueFromCompare}>
            Recommend one
            <ArrowRight />
          </Button>
        )}
        <Button variant="outline" size={waiting ? 'default' : 'sm'} onClick={() => agent.setCompareOpen(!compareOpen)}>
          {compareOpen ? 'Hide table' : 'Show table'}
        </Button>
      </div>
    </CardShell>
  )
}

export function RecommendationCard({ message, live }: { message: Message; live: boolean }) {
  const agent = useAgent()
  const { phase, selectedId, brief, shortlist, excluded } = agent.state
  const rec = message.recommendation!
  const interactive = live && (phase === 'recommendation' || phase === 'complete')
  const primary = PRODUCT_BY_ID[rec.primaryId]
  const chosenId = live ? selectedId ?? rec.primaryId : rec.primaryId
  const chosen = PRODUCT_BY_ID[chosenId]
  const overridden = chosenId !== rec.primaryId

  const alternatives = [
    rec.runnerUpId && { id: rec.runnerUpId, label: 'Runner-up', note: rec.runnerUpNote },
    rec.budgetPickId && {
      id: rec.budgetPickId,
      label: 'Budget pick',
      note: `Saves $${primary.price - PRODUCT_BY_ID[rec.budgetPickId].price} with a lower fit score.`,
    },
  ].filter(Boolean) as { id: string; label: string; note: string | null }[]

  const whyNot = [
    ...shortlist.filter((id) => id !== rec.primaryId),
    ...Object.keys(excluded).slice(0, 2),
  ].slice(0, 4)

  const breakdown = brief ? scoreProduct(primary, brief).contributions : []

  return (
    <CardShell title="Recommendation" icon={<Sparkles className="size-3.5" />}>
      <div className="flex gap-3">
        <Image src={primary.image || '/placeholder.svg'} alt={primary.name} width={72} height={72} className="rounded-lg bg-muted" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted-foreground">My pick for you</span>
          <span className="font-semibold leading-tight">{primary.name}</span>
          <span className="text-sm">
            ${primary.price} · <span className="font-mono">fit {rec.scores[primary.id]}</span>
          </span>
        </div>
      </div>

      <div
        className={cn(
          'rounded-lg px-2.5 py-2 text-xs leading-relaxed',
          rec.confidence === 'Low' ? 'bg-agent-soft text-agent-foreground ring-1 ring-agent/60' : 'bg-muted',
        )}
      >
        <span className="font-semibold">{rec.confidence} confidence.</span> {rec.confidenceNote}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Why I picked it</span>
        <ul className="flex flex-col gap-1">
          {rec.reasons.map((r) => (
            <li key={r} className="flex gap-1.5 text-xs leading-relaxed">
              <Check className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Trade-offs</span>
        <ul className="flex flex-col gap-1">
          {rec.tradeoffs.map((t) => (
            <li key={t} className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Minus className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {brief && (
        <details
          className="group rounded-lg border px-2 py-1.5 text-xs"
          onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && agent.trackReasoning()}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
            How the fit score is calculated
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-2 text-muted-foreground">
            Each spec is ranked against the whole catalog (0–1), multiplied by your priority, then averaged.
          </p>
          <table className="mt-2 w-full">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="font-normal">Spec</th>
                <th scope="col" className="font-normal">Priority</th>
                <th scope="col" className="text-right font-normal">Rank</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {breakdown.map((c) => (
                <tr key={c.dim}>
                  <td className="font-sans">{DIMENSIONS[c.dim].label}</td>
                  <td className="font-sans">{WEIGHT_LABELS[c.weight]}</td>
                  <td className="text-right">{c.n.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {alternatives.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Other options</span>
          {alternatives.map((alt) => {
            const p = PRODUCT_BY_ID[alt.id]
            const isChosen = chosenId === alt.id
            return (
              <div key={alt.id} className={cn('flex items-center gap-2 rounded-lg border p-2', isChosen && 'border-primary ring-1 ring-primary')}>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs text-muted-foreground">{alt.label}</span>
                  <span className="truncate text-sm font-medium">
                    {p.name} · ${p.price}
                  </span>
                  {alt.note && <span className="text-xs leading-relaxed text-muted-foreground">{alt.note}</span>}
                </div>
                {interactive && (
                  <Button size="sm" variant={isChosen ? 'default' : 'outline'} onClick={() => agent.selectProduct(alt.id)} aria-pressed={isChosen}>
                    {isChosen ? 'Chosen' : 'Choose'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {interactive && whyNot.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Ask me about</span>
          <div className="flex flex-wrap gap-1.5">
            {whyNot.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => agent.askAbout(id)}
                className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
              >
                Why not {PRODUCT_BY_ID[id].name}?
              </button>
            ))}
          </div>
        </div>
      )}

      {interactive && (
        <div className="flex flex-col gap-2 border-t pt-3">
          {overridden && (
            <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              You’ve chosen {chosen.name} over my pick.
              <button type="button" onClick={() => agent.selectProduct(rec.primaryId)} className="font-medium text-primary hover:underline">
                Use my pick
              </button>
            </p>
          )}
          <Button size="lg" onClick={agent.requestCart}>
            Add {chosen.name} to cart…
          </Button>
          <Button size="sm" variant="ghost" onClick={agent.editBrief}>
            <Pencil />
            Adjust priorities
          </Button>
        </div>
      )}
    </CardShell>
  )
}

export function CartConfirmCard({ message, live }: { message: Message; live: boolean }) {
  const agent = useAgent()
  const { phase, pendingCart } = agent.state
  const p = PRODUCT_BY_ID[message.productId!]
  const active = live && phase === 'confirm-cart' && pendingCart

  if (!active) {
    return (
      <CardShell title="Cart confirmation" icon={<ShieldCheck className="size-3.5" />}>
        <p className="text-xs text-muted-foreground">Confirmation for {p.name} closed.</p>
      </CardShell>
    )
  }

  return (
    <CardShell title="Checkpoint · Confirm before I add to cart" icon={<ShieldCheck className="size-3.5" />} tone="checkpoint">
      <div className="flex gap-3">
        <Image src={p.image || '/placeholder.svg'} alt={p.name} width={56} height={56} className="rounded-lg bg-muted" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{p.name}</span>
          <span className="text-sm">${p.price * pendingCart.qty}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Color</span>
        <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-1.5">
          {p.colors.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={pendingCart.color === c}
              onClick={() => agent.updatePendingCart({ color: c })}
              className={cn('rounded-md border px-2.5 py-1 text-xs', pendingCart.color === c && 'border-foreground bg-foreground text-background')}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Quantity</span>
        <div className="flex items-center rounded-md border">
          <button
            type="button"
            className="p-1.5 disabled:opacity-40"
            disabled={pendingCart.qty <= 1}
            onClick={() => agent.updatePendingCart({ qty: pendingCart.qty - 1 })}
            aria-label="Decrease quantity"
          >
            <Minus className="size-3" />
          </button>
          <span className="w-6 text-center text-sm" aria-live="polite">
            {pendingCart.qty}
          </span>
          <button
            type="button"
            className="p-1.5 disabled:opacity-40"
            disabled={pendingCart.qty >= 3}
            onClick={() => agent.updatePendingCart({ qty: pendingCart.qty + 1 })}
            aria-label="Increase quantity"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>
      <p className="rounded-lg bg-muted p-2 text-xs leading-relaxed text-muted-foreground">
        This only adds the item to your cart. No order is placed and no payment is taken.
      </p>
      <div className="flex gap-2">
        <Button onClick={agent.confirmCart}>
          <Check />
          Yes, add to cart
        </Button>
        <Button variant="outline" onClick={agent.cancelCart}>
          Not now
        </Button>
      </div>
    </CardShell>
  )
}
