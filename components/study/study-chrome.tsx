'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Flag, Timer, X } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-provider'
import { RESET_BEFORE_TASK } from '@/components/study/study-dialog'
import { useStudy } from '@/components/study/study-provider'
import { Button } from '@/components/ui/button'
import { AUTONOMY_LABELS, STUDY_TASKS } from '@/lib/study'
import { cn } from '@/lib/utils'

export function StudyBar() {
  const study = useStudy()
  const session = study.activeSession
  return (
    <div className="flex items-center justify-between gap-3 bg-foreground px-4 py-1.5 text-xs text-background lg:px-6">
      <span className="truncate">
        <span className="font-semibold">Prototype</span>
        <span className="opacity-70"> · AI shopping assistant · no real purchases</span>
      </span>
      <div className="flex items-center gap-3">
        {session && study.stage === 'tasks' && (
          <span className="hidden opacity-80 sm:inline">
            {session.participant} · {AUTONOMY_LABELS[session.condition]} · Task {study.taskIndex + 1}/{STUDY_TASKS.length}
          </span>
        )}
        <button type="button" onClick={study.openDialog} className="flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 font-medium hover:bg-background/15">
          <ClipboardList className="size-3.5" aria-hidden="true" />
          Usability study
        </button>
      </div>
    </div>
  )
}

function useElapsed(startedAt: number, running: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])
  return running ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
}

export function TaskTracker() {
  const study = useStudy()
  const agent = useAgent()
  const [collapsed, setCollapsed] = useState(false)
  const session = study.activeSession
  const task = STUDY_TASKS[study.taskIndex]
  const result = session?.tasks[study.taskIndex]
  const elapsed = useElapsed(result?.startedAt ?? 0, study.taskRunning)

  if (!session || study.stage !== 'tasks' || !task) return null

  return (
    <div
      className={cn(
        'fixed left-4 top-24 z-[45] lg:bottom-4 lg:top-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-card shadow-xl',
        collapsed && 'w-auto',
      )}
      role="region"
      aria-label="Study task"
    >
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Flag className="size-3.5" aria-hidden="true" />
          Task {study.taskIndex + 1} of {STUDY_TASKS.length}
        </span>
        <div className="flex items-center gap-2">
          {study.taskRunning && (
            <span className="flex items-center gap-1 font-mono text-xs" aria-live="off">
              <Timer className="size-3.5" aria-hidden="true" />
              {`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`}
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            aria-label={collapsed ? 'Expand task' : 'Collapse task'}
          >
            <X className={cn('size-3.5 transition-transform', collapsed && 'rotate-45')} />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{task.title}</span>
            <p className="text-xs leading-relaxed text-muted-foreground">{task.scenario}</p>
          </div>

          {study.awaitingEase ? (
            <div className="flex flex-col gap-2">
              <span id="seq-label" className="text-xs font-medium">
                Overall, how easy or difficult was this task?
              </span>
              <div role="radiogroup" aria-labelledby="seq-label" className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    onClick={() => study.rateEase(v)}
                    className="size-8 flex-1 rounded-md border text-sm hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Very difficult</span>
                <span>Very easy</span>
              </div>
            </div>
          ) : study.taskRunning ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => study.endTask(true)}>
                Task completed
              </Button>
              <Button size="sm" variant="outline" onClick={() => study.endTask(false)}>
                Gave up
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="self-start"
              onClick={() => {
                if (RESET_BEFORE_TASK.has(task.id)) agent.reset()
                study.startTask()
              }}
            >
              Start task {study.taskIndex + 1}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
