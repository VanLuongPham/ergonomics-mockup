import {
  AUTONOMY_LABELS,
  CONSTRUCT_LABELS,
  EVENT_LABELS,
  QUESTIONNAIRE,
  STUDY_TASKS,
  type Autonomy,
  type Construct,
  type Session,
  type StudyEvent,
  type TaskResult,
} from './study'

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function taskDuration(t: TaskResult) {
  return t.endedAt && t.startedAt ? (t.endedAt - t.startedAt) / 1000 : null
}

export function interactionCount(t: TaskResult) {
  return Object.values(t.events).reduce((a, b) => a + (b ?? 0), 0)
}

export function eventTotal(s: Session, e: StudyEvent) {
  return s.tasks.reduce((a, t) => a + (t.events[e] ?? 0), 0)
}

export function constructScores(s: Session) {
  return Object.fromEntries(
    (Object.keys(CONSTRUCT_LABELS) as Construct[]).map((c) => [
      c,
      mean(QUESTIONNAIRE.filter((q) => q.construct === c && s.answers[q.id]).map((q) => s.answers[q.id])),
    ]),
  ) as Record<Construct, number | null>
}

export function sessionSummary(s: Session) {
  const durations = s.tasks.map(taskDuration).filter((x): x is number => x !== null)
  const finished = s.tasks.filter((t) => t.completed !== null)
  const accepted = eventTotal(s, 'cart_confirmed_agent_pick')
  const alternative = eventTotal(s, 'cart_confirmed_alternative')
  return {
    meanTime: mean(durations),
    completion: finished.length ? finished.filter((t) => t.completed).length / finished.length : null,
    meanEase: mean(s.tasks.map((t) => t.ease).filter((x): x is number => x !== null)),
    interactions: s.tasks.reduce((a, t) => a + interactionCount(t), 0),
    overrides: eventTotal(s, 'recommendation_overridden'),
    edits: eventTotal(s, 'brief_edited') + eventTotal(s, 'shortlist_edited') + eventTotal(s, 'followup_adjustment'),
    whys: eventTotal(s, 'why_asked') + eventTotal(s, 'reasoning_expanded') + eventTotal(s, 'activity_log_viewed'),
    acceptance: accepted + alternative ? accepted / (accepted + alternative) : null,
    constructs: constructScores(s),
  }
}

export function conditionSummary(sessions: Session[], condition: Autonomy) {
  const list = sessions.filter((s) => s.condition === condition)
  const sums = list.map(sessionSummary)
  type NumericKey = Exclude<keyof ReturnType<typeof sessionSummary>, 'constructs'>
  const pick = (k: NumericKey) =>
    mean(sums.map((x) => x[k] as number | null).filter((v): v is number => typeof v === 'number'))
  return {
    n: list.length,
    meanTime: pick('meanTime'),
    completion: pick('completion'),
    meanEase: pick('meanEase'),
    interactions: pick('interactions'),
    overrides: pick('overrides'),
    edits: pick('edits'),
    whys: pick('whys'),
    acceptance: pick('acceptance'),
    constructs: Object.fromEntries(
      (Object.keys(CONSTRUCT_LABELS) as Construct[]).map((c) => [
        c,
        mean(sums.map((x) => x.constructs[c]).filter((v): v is number => v !== null)),
      ]),
    ) as Record<Construct, number | null>,
  }
}

export function toCSV(sessions: Session[]) {
  const events = Object.keys(EVENT_LABELS) as StudyEvent[]
  const header = [
    'participant',
    'condition',
    'task',
    'duration_s',
    'completed',
    'ease_1_7',
    ...events,
    ...QUESTIONNAIRE.map((q) => q.id),
    'notes',
  ]
  const rows = sessions.flatMap((s) =>
    s.tasks.map((t) => [
      s.participant,
      AUTONOMY_LABELS[s.condition],
      STUDY_TASKS.find((x) => x.id === t.taskId)?.title ?? t.taskId,
      taskDuration(t)?.toFixed(1) ?? '',
      t.completed === null ? '' : t.completed ? '1' : '0',
      t.ease ?? '',
      ...events.map((e) => t.events[e] ?? 0),
      ...QUESTIONNAIRE.map((q) => s.answers[q.id] ?? ''),
      s.notes,
    ]),
  )
  return [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const fmt = {
  secs: (v: number | null) => (v === null ? '—' : `${Math.round(v)}s`),
  pct: (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`),
  num: (v: number | null, d = 1) => (v === null ? '—' : v.toFixed(d)),
}
