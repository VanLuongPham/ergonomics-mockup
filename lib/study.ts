export type Autonomy = 'checkpoints' | 'step'

export const AUTONOMY_LABELS: Record<Autonomy, string> = {
  checkpoints: 'Ask at key decisions',
  step: 'Ask before every step',
}

export interface StudyTask {
  id: string
  title: string
  scenario: string
  success: string
}

export const STUDY_TASKS: StudyTask[] = [
  {
    id: 't1',
    title: 'Delegate a purchase decision',
    scenario:
      'You fly often for work. Use the assistant to find over-ear headphones under $300 that are good for long flights, and add the pair you would buy to your cart.',
    success: 'An over-ear model ≤ $300 is added to the cart through the assistant.',
  },
  {
    id: 't2',
    title: 'Change the assistant’s priorities',
    scenario:
      'You realise you also take a lot of video calls. Without starting over, get the assistant to take call quality into account and check whether its recommendation changes.',
    success: 'Call quality is raised (brief edit or follow-up) and a new recommendation is produced.',
  },
  {
    id: 't3',
    title: 'Question and override',
    scenario:
      'Ask the assistant why one product was not recommended. Then choose a different product than the one it suggested and add that to your cart instead.',
    success: 'A “why not” explanation is viewed and a non-recommended product is confirmed into the cart.',
  },
  {
    id: 't4',
    title: 'Judge a recommendation',
    scenario:
      'Find sweat-resistant earbuds under $200 for the gym. Before adding anything, decide whether you trust the assistant’s pick — and explain why out loud.',
    success: 'Earbuds with an IPX rating ≤ $200 are recommended; participant states a trust judgement.',
  },
]

export type Construct = 'transparency' | 'control' | 'trust' | 'efficiency'

export const CONSTRUCT_LABELS: Record<Construct, string> = {
  transparency: 'Transparency',
  control: 'Perceived control',
  trust: 'Trust',
  efficiency: 'Efficiency',
}

export interface QuestionItem {
  id: string
  construct: Construct
  text: string
}

export const QUESTIONNAIRE: QuestionItem[] = [
  { id: 'tr1', construct: 'transparency', text: 'I understood what the assistant was doing at each step.' },
  { id: 'tr2', construct: 'transparency', text: 'The assistant clearly explained why it recommended a product.' },
  { id: 'tr3', construct: 'transparency', text: 'I could tell which changes on the page were made by the assistant.' },
  { id: 'co1', construct: 'control', text: 'I felt in control of the final decision.' },
  { id: 'co2', construct: 'control', text: 'It was easy to change the assistant’s choices.' },
  { id: 'co3', construct: 'control', text: 'The assistant asked for my approval at the right moments.' },
  { id: 'tu1', construct: 'trust', text: 'I trust the assistant’s recommendations.' },
  { id: 'tu2', construct: 'trust', text: 'I would rely on this assistant for a real purchase.' },
  { id: 'tu3', construct: 'trust', text: 'The assistant acted in my interest rather than the store’s.' },
  { id: 'ef1', construct: 'efficiency', text: 'The assistant helped me decide faster than browsing on my own.' },
  { id: 'ef2', construct: 'efficiency', text: 'The number of steps and confirmations felt appropriate.' },
  { id: 'ef3', construct: 'efficiency', text: 'I could reach a decision with little effort.' },
]

export const LIKERT_ANCHORS = ['Strongly disagree', 'Strongly agree']

export type StudyEvent =
  | 'agent_started'
  | 'checkpoint_confirmed'
  | 'brief_edited'
  | 'brief_reopened'
  | 'shortlist_edited'
  | 'recommendation_overridden'
  | 'why_asked'
  | 'reasoning_expanded'
  | 'followup_adjustment'
  | 'cart_confirmed_agent_pick'
  | 'cart_confirmed_alternative'
  | 'cart_declined'
  | 'paused'
  | 'stopped'
  | 'filter_changed_by_user'
  | 'manual_add_to_cart'
  | 'activity_log_viewed'

export const EVENT_LABELS: Record<StudyEvent, string> = {
  agent_started: 'Agent runs started',
  checkpoint_confirmed: 'Checkpoints confirmed',
  brief_edited: 'Brief edited',
  brief_reopened: 'Brief reopened',
  shortlist_edited: 'Shortlist edits',
  recommendation_overridden: 'Recommendation overridden',
  why_asked: '“Why not” questions',
  reasoning_expanded: 'Scoring breakdown opened',
  followup_adjustment: 'Follow-up adjustments',
  cart_confirmed_agent_pick: 'Accepted agent pick',
  cart_confirmed_alternative: 'Chose alternative',
  cart_declined: 'Cart confirmation declined',
  paused: 'Paused agent',
  stopped: 'Stopped agent',
  filter_changed_by_user: 'Manual filter changes',
  manual_add_to_cart: 'Manual add to cart',
  activity_log_viewed: 'Activity log viewed',
}

export interface TaskResult {
  taskId: string
  startedAt: number
  endedAt: number | null
  completed: boolean | null
  ease: number | null
  events: Partial<Record<StudyEvent, number>>
}

export interface Session {
  id: string
  participant: string
  condition: Autonomy
  startedAt: number
  tasks: TaskResult[]
  answers: Record<string, number>
  notes: string
  finished: boolean
}
