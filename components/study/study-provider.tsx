'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { STUDY_TASKS, type Autonomy, type Session, type StudyEvent } from '@/lib/study'

type Stage = 'setup' | 'tasks' | 'questionnaire' | 'done'

interface StudyState {
  sessions: Session[]
  activeId: string | null
  stage: Stage
  taskIndex: number
  taskRunning: boolean
  awaitingEase: boolean
  dialogOpen: boolean
}

interface StudyContextValue extends StudyState {
  activeSession: Session | null
  openDialog: () => void
  closeDialog: () => void
  startSession: (participant: string, condition: Autonomy) => void
  startTask: () => void
  endTask: (completed: boolean) => void
  rateEase: (value: number) => void
  submitQuestionnaire: (answers: Record<string, number>, notes: string) => void
  newSession: () => void
  clearSessions: () => void
  track: (event: StudyEvent) => void
}

const StudyContext = createContext<StudyContextValue | null>(null)

const initial: StudyState = {
  sessions: [],
  activeId: null,
  stage: 'setup',
  taskIndex: 0,
  taskRunning: false,
  awaitingEase: false,
  dialogOpen: false,
}

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudyState>(initial)
  const ref = useRef(initial)

  const update = useCallback((fn: (s: StudyState) => StudyState) => {
    ref.current = fn(ref.current)
    setState(ref.current)
  }, [])

  const patchActive = useCallback(
    (fn: (s: Session) => Session) =>
      update((s) => ({
        ...s,
        sessions: s.sessions.map((x) => (x.id === s.activeId ? fn(x) : x)),
      })),
    [update],
  )

  const track = useCallback(
    (event: StudyEvent) => {
      const s = ref.current
      if (!s.taskRunning || !s.activeId) return
      patchActive((session) => ({
        ...session,
        tasks: session.tasks.map((t, i) =>
          i === s.taskIndex ? { ...t, events: { ...t.events, [event]: (t.events[event] ?? 0) + 1 } } : t,
        ),
      }))
    },
    [patchActive],
  )

  const value = useMemo<StudyContextValue>(() => {
    const activeSession = state.sessions.find((s) => s.id === state.activeId) ?? null
    return {
      ...state,
      activeSession,
      openDialog: () => update((s) => ({ ...s, dialogOpen: true })),
      closeDialog: () => update((s) => ({ ...s, dialogOpen: false })),
      startSession: (participant, condition) => {
        const session: Session = {
          id: crypto.randomUUID(),
          participant,
          condition,
          startedAt: Date.now(),
          tasks: STUDY_TASKS.map((t) => ({
            taskId: t.id,
            startedAt: 0,
            endedAt: null,
            completed: null,
            ease: null,
            events: {},
          })),
          answers: {},
          notes: '',
          finished: false,
        }
        update((s) => ({
          ...s,
          sessions: [...s.sessions, session],
          activeId: session.id,
          stage: 'tasks',
          taskIndex: 0,
          taskRunning: false,
          awaitingEase: false,
        }))
      },
      startTask: () => {
        const idx = ref.current.taskIndex
        patchActive((session) => ({
          ...session,
          tasks: session.tasks.map((t, i) => (i === idx ? { ...t, startedAt: Date.now(), events: {} } : t)),
        }))
        update((s) => ({ ...s, taskRunning: true, dialogOpen: false }))
      },
      endTask: (completed) => {
        const idx = ref.current.taskIndex
        patchActive((session) => ({
          ...session,
          tasks: session.tasks.map((t, i) => (i === idx ? { ...t, endedAt: Date.now(), completed } : t)),
        }))
        update((s) => ({ ...s, taskRunning: false, awaitingEase: true }))
      },
      rateEase: (v) => {
        const idx = ref.current.taskIndex
        patchActive((session) => ({
          ...session,
          tasks: session.tasks.map((t, i) => (i === idx ? { ...t, ease: v } : t)),
        }))
        const isLast = idx >= STUDY_TASKS.length - 1
        update((s) => ({
          ...s,
          awaitingEase: false,
          taskIndex: isLast ? idx : idx + 1,
          stage: isLast ? 'questionnaire' : 'tasks',
          dialogOpen: isLast ? true : s.dialogOpen,
        }))
      },
      submitQuestionnaire: (answers, notes) => {
        patchActive((session) => ({ ...session, answers, notes, finished: true }))
        update((s) => ({ ...s, stage: 'done' }))
      },
      newSession: () =>
        update((s) => ({ ...s, activeId: null, stage: 'setup', taskIndex: 0, taskRunning: false, awaitingEase: false })),
      clearSessions: () => update(() => ({ ...initial, dialogOpen: true })),
      track,
    }
  }, [state, update, patchActive, track])

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
}

export function useStudy() {
  const ctx = useContext(StudyContext)
  if (!ctx) throw new Error('useStudy must be used within StudyProvider')
  return ctx
}
