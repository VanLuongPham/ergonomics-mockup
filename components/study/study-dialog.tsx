'use client'

import { useState } from 'react'
import { Check, Download, Play, Trash2 } from 'lucide-react'
import { useAgent } from '@/components/agent/agent-provider'
import { useStudy } from '@/components/study/study-provider'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import {
  AUTONOMY_LABELS,
  CONSTRUCT_LABELS,
  LIKERT_ANCHORS,
  QUESTIONNAIRE,
  STUDY_TASKS,
  type Autonomy,
  type Construct,
} from '@/lib/study'
import { conditionSummary, download, fmt, sessionSummary, taskDuration, toCSV } from '@/lib/study-metrics'
import { cn } from '@/lib/utils'

export const RESET_BEFORE_TASK = new Set(['t1', 't4'])

type Tab = 'run' | 'results' | 'protocol'

export function StudyDialog() {
  const study = useStudy()
  const [tab, setTab] = useState<Tab>('run')

  return (
    <Modal
      open={study.dialogOpen}
      onClose={study.closeDialog}
      title="Usability study"
      description="Moderated test of the shopping assistant: efficiency, transparency, perceived control, and trust."
      className="max-w-3xl"
    >
      <div role="tablist" aria-label="Study sections" className="sticky top-0 z-10 flex gap-1 border-b bg-card px-5">
        {(
          [
            ['run', 'Run session'],
            ['results', `Results (${study.sessions.length})`],
            ['protocol', 'Protocol'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px border-b-2 px-2 py-2.5 text-sm font-medium',
              tab === id ? 'border-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === 'run' && <RunTab onShowResults={() => setTab('results')} />}
        {tab === 'results' && <ResultsTab />}
        {tab === 'protocol' && <ProtocolTab />}
      </div>
    </Modal>
  )
}

function RunTab({ onShowResults }: { onShowResults: () => void }) {
  const study = useStudy()
  const agent = useAgent()
  const [participant, setParticipant] = useState(`P${String(study.sessions.length + 1).padStart(2, '0')}`)
  const [condition, setCondition] = useState<Autonomy>(study.sessions.length % 2 === 0 ? 'checkpoints' : 'step')

  if (study.stage === 'setup')
    return (
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          study.startSession(participant.trim() || 'P??', condition)
          agent.reset()
          agent.setAutonomy(condition)
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Participant ID
          <input
            value={participant}
            onChange={(e) => setParticipant(e.target.value)}
            className="h-9 max-w-48 rounded-lg border px-3 font-normal"
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Condition (approval mode)</legend>
          {(Object.keys(AUTONOMY_LABELS) as Autonomy[]).map((a) => (
            <label key={a} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3', condition === a && 'border-primary ring-1 ring-primary')}>
              <input type="radio" name="condition" checked={condition === a} onChange={() => setCondition(a)} className="mt-1 accent-primary" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{AUTONOMY_LABELS[a]}</span>
                <span className="text-xs text-muted-foreground">
                  {a === 'checkpoints'
                    ? 'Agent confirms the brief and the cart; runs search → compare → recommend on its own.'
                    : 'Agent pauses for approval after every step (brief, shortlist, comparison, cart).'}
                </span>
              </span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Alternate conditions across participants for a between-subjects comparison.</p>
        </fieldset>
        <Button type="submit" size="lg" className="self-start">
          <Play />
          Start session
        </Button>
      </form>
    )

  if (study.stage === 'tasks') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {study.activeSession?.participant} · {AUTONOMY_LABELS[study.activeSession!.condition]}. Read the scenario aloud, then start the timer.
          Ask the participant to think aloud.
        </p>
        <ol className="flex flex-col gap-2">
          {STUDY_TASKS.map((t, i) => {
            const result = study.activeSession?.tasks[i]
            const current = i === study.taskIndex
            return (
              <li key={t.id} className={cn('flex flex-col gap-2 rounded-lg border p-3', current && 'border-primary ring-1 ring-primary')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    Task {i + 1}: {t.title}
                  </span>
                  {result?.completed !== null && result?.completed !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="size-3" />
                      {result.completed ? 'Completed' : 'Not completed'} · {fmt.secs(taskDuration(result))}
                    </span>
                  )}
                </div>
                {current && (
                  <>
                    <p className="rounded-md bg-muted p-3 text-sm leading-relaxed">{t.scenario}</p>
                    <p className="text-xs text-muted-foreground">Success: {t.success}</p>
                    <Button
                      className="self-start"
                      disabled={study.taskRunning || study.awaitingEase}
                      onClick={() => {
                        if (RESET_BEFORE_TASK.has(t.id)) agent.reset()
                        study.startTask()
                      }}
                    >
                      <Play />
                      {RESET_BEFORE_TASK.has(t.id) ? 'Reset assistant & start task' : 'Start task (keeps current state)'}
                    </Button>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  if (study.stage === 'questionnaire') return <Questionnaire />

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-sm">Session complete for {study.activeSession?.participant}. Thank the participant.</p>
      <div className="flex gap-2">
        <Button onClick={onShowResults}>View results</Button>
        <Button variant="outline" onClick={study.newSession}>
          Next participant
        </Button>
      </div>
    </div>
  )
}

function Questionnaire() {
  const study = useStudy()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')
  const complete = QUESTIONNAIRE.every((q) => answers[q.id])

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (complete) study.submitQuestionnaire(answers, notes)
      }}
    >
      <p className="text-sm text-muted-foreground">
        Post-session questionnaire. 1 = {LIKERT_ANCHORS[0]}, 7 = {LIKERT_ANCHORS[1]}.
      </p>
      {(Object.keys(CONSTRUCT_LABELS) as Construct[]).map((c) => (
        <fieldset key={c} className="flex flex-col gap-3">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CONSTRUCT_LABELS[c]}</legend>
          {QUESTIONNAIRE.filter((q) => q.construct === c).map((q) => (
            <div key={q.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <span id={`${q.id}-label`} className="text-sm">
                {q.text}
              </span>
              <div role="radiogroup" aria-labelledby={`${q.id}-label`} className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={answers[q.id] === v}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                    className={cn(
                      'size-8 rounded-md border text-sm',
                      answers[q.id] === v ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      ))}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Moderator notes / quotes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-lg border p-2 text-sm font-normal"
          placeholder="Notable think-aloud comments, confusion points, critical incidents…"
        />
      </label>
      <Button type="submit" size="lg" disabled={!complete} className="self-start">
        Submit questionnaire
      </Button>
    </form>
  )
}

function ResultsTab() {
  const study = useStudy()
  const { sessions } = study

  if (!sessions.length)
    return <p className="text-sm text-muted-foreground">No sessions yet. Run a session to collect metrics.</p>

  const conditions = Object.keys(AUTONOMY_LABELS) as Autonomy[]
  const summaries = conditions.map((c) => ({ c, s: conditionSummary(sessions, c) }))

  const rows: [string, (s: ReturnType<typeof conditionSummary>) => string, string][] = [
    ['Participants', (s) => String(s.n), ''],
    ['Mean time per task', (s) => fmt.secs(s.meanTime), 'Efficiency'],
    ['Task completion', (s) => fmt.pct(s.completion), 'Efficiency'],
    ['Mean interactions / session', (s) => fmt.num(s.interactions), 'Efficiency'],
    ['Single Ease Question (1–7)', (s) => fmt.num(s.meanEase), 'Efficiency'],
    ['Explanations opened / session', (s) => fmt.num(s.whys), 'Transparency'],
    ['Edits to agent choices / session', (s) => fmt.num(s.edits), 'Control'],
    ['Overrides / session', (s) => fmt.num(s.overrides), 'Control'],
    ['Accepted agent pick at cart', (s) => fmt.pct(s.acceptance), 'Trust (behavioural)'],
    ...(Object.keys(CONSTRUCT_LABELS) as Construct[]).map(
      (k) => [`${CONSTRUCT_LABELS[k]} score (1–7)`, (s: ReturnType<typeof conditionSummary>) => fmt.num(s.constructs[k]), 'Questionnaire'] as [string, (s: ReturnType<typeof conditionSummary>) => string, string],
    ),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Data lives in this browser tab only. Export before closing.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => download('assistant-study.csv', toCSV(sessions), 'text/csv')}>
            <Download />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => download('assistant-study.json', JSON.stringify(sessions, null, 2), 'application/json')}>
            <Download />
            JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={study.clearSessions}>
            <Trash2 />
            Clear
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">By condition</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Metric</th>
                <th scope="col" className="px-3 py-2 font-medium">Measures</th>
                {summaries.map(({ c }) => (
                  <th key={c} scope="col" className="px-3 py-2 font-medium">
                    {AUTONOMY_LABELS[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, get, construct]) => (
                <tr key={label} className="border-t">
                  <th scope="row" className="px-3 py-2 text-left font-normal">{label}</th>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{construct}</td>
                  {summaries.map(({ c, s }) => (
                    <td key={c} className="px-3 py-2 font-mono">{get(s)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Sessions</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                {['ID', 'Condition', 'Avg time', 'Done', 'Ease', 'Overrides', 'Trust', 'Control'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const x = sessionSummary(s)
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{s.participant}</td>
                    <td className="px-3 py-2 text-xs">{AUTONOMY_LABELS[s.condition]}</td>
                    <td className="px-3 py-2 font-mono">{fmt.secs(x.meanTime)}</td>
                    <td className="px-3 py-2 font-mono">{fmt.pct(x.completion)}</td>
                    <td className="px-3 py-2 font-mono">{fmt.num(x.meanEase)}</td>
                    <td className="px-3 py-2 font-mono">{x.overrides}</td>
                    <td className="px-3 py-2 font-mono">{fmt.num(x.constructs.trust)}</td>
                    <td className="px-3 py-2 font-mono">{fmt.num(x.constructs.control)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ProtocolTab() {
  return (
    <div className="flex flex-col gap-5 text-sm leading-relaxed">
      <section className="flex flex-col gap-1.5">
        <h3 className="font-semibold">Research questions</h3>
        <ul className="flex flex-col gap-1 text-muted-foreground">
          <li>1. Can shoppers delegate search and comparison to the agent and reach a decision efficiently?</li>
          <li>2. Do they understand what the agent did and why it recommended a product?</li>
          <li>3. Do they feel in control — able to correct, override, or stop the agent?</li>
          <li>4. How does approval frequency (key decisions vs. every step) trade efficiency against control and trust?</li>
        </ul>
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className="font-semibold">Design</h3>
        <p className="text-muted-foreground">
          Moderated, think-aloud, between-subjects on approval mode. Recommended 5–8 participants per condition (10–16 total), recruited from people who
          bought headphones or earbuds online in the last 12 months. About 25 minutes per session: intro (3), four tasks (15), questionnaire and debrief (7).
        </p>
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className="font-semibold">Tasks</h3>
        <ol className="flex flex-col gap-1 text-muted-foreground">
          {STUDY_TASKS.map((t, i) => (
            <li key={t.id}>
              <span className="font-medium text-foreground">
                {i + 1}. {t.title}.
              </span>{' '}
              {t.scenario}
            </li>
          ))}
        </ol>
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className="font-semibold">Measures</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Construct</th>
                <th scope="col" className="px-3 py-2 font-medium">Behavioural (auto-logged)</th>
                <th scope="col" className="px-3 py-2 font-medium">Self-report</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Efficiency', 'Time on task, completion, interaction count', 'SEQ after each task; 3 Likert items'],
                ['Transparency', '“Why not” questions, scoring breakdown opens, activity-log views', '3 Likert items'],
                ['Perceived control', 'Brief/shortlist edits, follow-up adjustments, overrides, pause/stop', '3 Likert items'],
                ['Trust', 'Acceptance of agent pick vs. alternative at cart; declined confirmations', '3 Likert items'],
              ].map((r) => (
                <tr key={r[0]} className="border-t">
                  {r.map((c, i) => (
                    <td key={i} className={cn('px-3 py-2', i === 0 && 'font-medium')}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className="font-semibold">Interpreting results</h3>
        <ul className="flex flex-col gap-1 text-muted-foreground">
          <li>• Very high acceptance with few explanation views may signal over-reliance rather than earned trust — probe in debrief.</li>
          <li>• Overrides are healthy when participants can say why; overrides after confusion point to an explanation gap.</li>
          <li>• Target benchmarks: completion ≥ 80%, SEQ ≥ 5.5, each construct ≥ 5.0.</li>
        </ul>
      </section>
    </div>
  )
}
