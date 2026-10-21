'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Hand, Lightbulb, Pause, Play, RotateCcw, Settings2, Square, User, Wrench, X } from 'lucide-react'
import { STEPS, useAgent, type LogType, type Message } from '@/components/agent/agent-provider'
import { AgentAvatar } from '@/components/agent/agent-tag'
import {
  BriefCard,
  CartConfirmCard,
  CompareCard,
  PlanCard,
  RecommendationCard,
  ShortlistCard,
  StepIcon,
} from '@/components/agent/agent-cards'
import { AUTONOMY_LABELS, type Autonomy } from '@/lib/study'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Over-ear headphones under $300 for long flights',
  'Sweat-resistant earbuds under $200 for the gym',
  'Comfortable headphones for all-day work calls',
]

function StatusPill() {
  const { state, isWorking, isWaiting } = useAgent()
  const label = state.paused ? 'Paused' : isWorking ? 'Working' : isWaiting ? 'Needs your input' : state.phase === 'complete' ? 'Done' : 'Ready'
  return (
    <span
      role="status"
      className={cn(
        'flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        isWorking && 'bg-agent-soft text-agent-foreground',
        isWaiting && !isWorking && 'bg-agent text-agent-foreground',
        (state.paused || (!isWorking && !isWaiting)) && 'bg-muted text-muted-foreground',
      )}
    >
      <span className={cn('size-1.5 rounded-full bg-current', isWorking && 'animate-pulse')} aria-hidden="true" />
      {label}
    </span>
  )
}

function Stepper() {
  const { state } = useAgent()
  if (state.phase === 'idle') return null
  return (
    <ol className="flex items-center gap-1 overflow-x-auto border-b px-3 py-2" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex items-center gap-1">
          <span
            className={cn(
              'flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs',
              state.steps[s.id] === 'waiting' && 'bg-agent-soft font-medium text-agent-foreground',
              state.steps[s.id] === 'running' && 'font-medium',
              state.steps[s.id] === 'pending' && 'text-muted-foreground',
            )}
          >
            <StepIcon status={state.steps[s.id]} />
            {s.label}
          </span>
          {i < STEPS.length - 1 && <span className="h-px w-2 bg-border" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  )
}

function MessageItem({ message, live }: { message: Message; live: boolean }) {
  if (message.kind === 'divider')
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground" role="separator">
        <span className="h-px flex-1 bg-border" />
        {message.text}
        <span className="h-px flex-1 bg-border" />
      </div>
    )

  if (message.role === 'user')
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
          {message.text}
        </p>
      </div>
    )

  let body: React.ReactNode
  switch (message.kind) {
    case 'plan':
      body = <PlanCard live={live} />
      break
    case 'brief':
      body = <BriefCard message={message} live={live} />
      break
    case 'shortlist':
      body = <ShortlistCard message={message} live={live} />
      break
    case 'compare':
      body = <CompareCard message={message} live={live} />
      break
    case 'recommendation':
      body = <RecommendationCard message={message} live={live} />
      break
    case 'cart-confirm':
      body = <CartConfirmCard message={message} live={live} />
      break
    default:
      body = <p className="text-sm leading-relaxed text-pretty">{message.text}</p>
  }

  return (
    <div className="flex gap-2">
      <AgentAvatar className="mt-0.5" />
      <div className="min-w-0 flex-1">{body}</div>
    </div>
  )
}

const LOG_META: Record<LogType, { icon: React.ReactNode; label: string; className: string }> = {
  action: { icon: <Wrench className="size-3" />, label: 'Action', className: 'text-foreground' },
  reasoning: { icon: <Lightbulb className="size-3" />, label: 'Reasoning', className: 'text-agent-foreground' },
  checkpoint: { icon: <Hand className="size-3" />, label: 'Checkpoint', className: 'text-agent-foreground' },
  user: { icon: <User className="size-3" />, label: 'You', className: 'text-primary' },
  system: { icon: <Settings2 className="size-3" />, label: 'Setting', className: 'text-muted-foreground' },
}

function ActivityLog() {
  const { state } = useAgent()
  const t0 = state.log[0]?.ts ?? 0
  if (!state.log.length) return <p className="p-4 text-sm text-muted-foreground">Everything I do and why will be logged here.</p>
  return (
    <ol className="flex flex-col gap-2 p-3" aria-label="Assistant activity log">
      {state.log.map((e) => {
        const m = LOG_META[e.type]
        const secs = Math.round((e.ts - t0) / 1000)
        return (
          <li key={e.id} className="flex gap-2 text-xs leading-relaxed">
            <span className="w-10 shrink-0 font-mono text-muted-foreground">
              {`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}
            </span>
            <span className={cn('flex w-20 shrink-0 items-center gap-1 font-medium', m.className)}>
              {m.icon}
              {m.label}
            </span>
            <span className="text-pretty">{e.text}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Composer() {
  const agent = useAgent()
  const [text, setText] = useState('')
  const submit = () => {
    const v = text.trim()
    if (!v) return
    setText('')
    if (agent.state.phase === 'idle') agent.start(v)
    else agent.followUp(v)
  }
  return (
    <form
      className="flex flex-col gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {agent.state.phase === 'idle' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Try one of these</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => agent.start(s)}
              className="rounded-lg border px-3 py-2 text-left text-sm hover:border-agent hover:bg-agent-soft"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5 focus-within:border-primary">
        <label htmlFor="agent-input" className="sr-only">
          Message the shopping assistant
        </label>
        <textarea
          id="agent-input"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              e.preventDefault()
              submit()
            }
          }}
          placeholder={agent.state.phase === 'idle' ? 'What are you shopping for?' : 'Adjust, ask why, or say “start over”…'}
          className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </form>
  )
}

export function AgentPanel() {
  const agent = useAgent()
  const { state, isWorking } = agent
  const scrollRef = useRef<HTMLDivElement>(null)

  const latestByKind = new Map<string, string>()
  for (const m of state.messages) latestByKind.set(m.kind, m.id)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const id = setTimeout(() => el.scrollTo({ top: el.scrollHeight }), 50)
    return () => clearTimeout(id)
  }, [state.messages.length, state.activeTab, state.panelOpen])

  if (!state.panelOpen) return null

  return (
    <aside
      aria-label="Shopping assistant"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[85dvh] flex-col rounded-t-2xl border-t bg-background shadow-2xl lg:static lg:z-auto lg:h-auto lg:w-[420px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <AgentAvatar />
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold leading-tight">Shopping assistant</h2>
            <span className="whitespace-nowrap text-xs text-muted-foreground">Never buys for you</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StatusPill />
          {(isWorking || state.paused) && (
            <>
              <button
                type="button"
                onClick={state.paused ? agent.resume : agent.pause}
                className="rounded-md p-1.5 hover:bg-muted"
                aria-label={state.paused ? 'Resume assistant' : 'Pause assistant'}
              >
                {state.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button type="button" onClick={agent.stop} className="rounded-md p-1.5 hover:bg-muted" aria-label="Stop assistant">
                <Square className="size-4" />
              </button>
            </>
          )}
          {state.phase !== 'idle' && !isWorking && (
            <button type="button" onClick={agent.reset} className="rounded-md p-1.5 hover:bg-muted" aria-label="New conversation">
              <RotateCcw className="size-4" />
            </button>
          )}
          <button type="button" onClick={() => agent.setPanelOpen(false)} className="rounded-md p-1.5 hover:bg-muted" aria-label="Close assistant">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-xs text-muted-foreground">Approval</span>
        <div role="radiogroup" aria-label="When the assistant asks for approval" className="flex rounded-lg bg-muted p-0.5">
          {(Object.keys(AUTONOMY_LABELS) as Autonomy[]).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={state.autonomy === a}
              onClick={() => agent.setAutonomy(a)}
              className={cn(
                'rounded-md px-2 py-1 text-xs',
                state.autonomy === a ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {AUTONOMY_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      <Stepper />

      <div role="tablist" aria-label="Assistant views" className="flex border-b px-3">
        {(['chat', 'activity'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={state.activeTab === t}
            onClick={() => agent.setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-2 py-2 text-xs font-medium',
              state.activeTab === t ? 'border-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'chat' ? 'Conversation' : `Activity log (${state.log.length})`}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {state.activeTab === 'activity' ? (
          <ActivityLog />
        ) : state.messages.length === 0 ? (
          <div className="flex flex-col gap-3 p-4">
            <h3 className="text-lg font-semibold text-balance">Tell me what you need. I’ll do the legwork and show my work.</h3>
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
              <li>• I search, filter, and compare right here on the page — anything I touch is marked in amber.</li>
              <li>• I explain every recommendation, including trade-offs and how confident I am.</li>
              <li>• You can edit my choices at any point, and nothing goes in your cart without your OK.</li>
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-3">
            {state.messages.map((m) => (
              <MessageItem key={m.id} message={m} live={latestByKind.get(m.kind) === m.id} />
            ))}
            {isWorking && (
              <div className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="size-1.5 animate-bounce rounded-full bg-agent" />
                  <span className="size-1.5 animate-bounce rounded-full bg-agent [animation-delay:120ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-agent [animation-delay:240ms]" />
                </span>
                {state.log.at(-1)?.text}
              </div>
            )}
          </div>
        )}
      </div>

      <Composer />
    </aside>
  )
}
