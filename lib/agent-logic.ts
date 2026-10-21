import {
  CATALOG,
  DIMENSIONS,
  DIMENSION_ORDER,
  PRODUCT_BY_ID,
  formFactorLabel,
  type Dimension,
  type FormFactor,
  type Product,
} from './catalog'

export type Weight = 0 | 1 | 2 | 3
export const WEIGHT_LABELS = ['Ignore', 'Low', 'Medium', 'High'] as const

export interface Brief {
  query: string
  budget: number | null
  formFactor: FormFactor | 'any'
  requireWater: boolean
  requireMultipoint: boolean
  weights: Record<Dimension, Weight>
  assumptions: string[]
}

export interface Exclusion {
  id: string
  reason: string
}

export interface Recommendation {
  primaryId: string
  runnerUpId: string | null
  budgetPickId: string | null
  confidence: 'High' | 'Medium' | 'Low'
  confidenceNote: string
  reasons: string[]
  tradeoffs: string[]
  runnerUpNote: string | null
  scores: Record<string, number>
}

const BUDGET_RE = /(?:under|below|less than|max(?:imum)?|up to|budget(?: of| is)?|around|<)\s*\$?\s*(\d{2,4})/
const DOLLAR_RE = /\$\s?(\d{2,4})/

function extractBudget(text: string): number | null {
  const m = text.match(BUDGET_RE) ?? text.match(DOLLAR_RE)
  return m ? Number(m[1]) : null
}

export function defaultWeights(): Record<Dimension, Weight> {
  return { sound: 2, anc: 2, battery: 2, comfort: 2, calls: 2, value: 2 }
}

export function parseQuery(query: string): Brief {
  const t = query.toLowerCase()
  const weights = defaultWeights()
  const assumptions: string[] = []
  let formFactor: Brief['formFactor'] = 'any'
  let requireWater = false
  let requireMultipoint = false
  let matchedUseCase = false

  const budget = extractBudget(t)
  if (budget) assumptions.push(`Budget capped at $${budget} — anything above is excluded.`)
  else assumptions.push('No budget mentioned, so I won’t exclude anything on price.')

  if (/earbud|in-ear|in ear|\bbuds\b|true wireless/.test(t)) formFactor = 'in-ear'
  else if (/over-ear|over ear|full-size|full size|\bcans\b/.test(t)) formFactor = 'over-ear'

  if (/travel|flight|fly|plane|commut|train|trip|airport/.test(t)) {
    weights.anc = 3
    weights.battery = 3
    matchedUseCase = true
    assumptions.push('You mentioned travel, so Noise cancelling and Battery life are weighted High.')
  }
  if (/gym|run|workout|sport|exercise|training/.test(t)) {
    requireWater = true
    weights.comfort = 3
    weights.anc = 1
    matchedUseCase = true
    if (formFactor === 'any') {
      formFactor = 'in-ear'
      assumptions.push('Workouts usually mean earbuds, so I’m only looking at in-ear models. Switch to “Any type” if you prefer over-ear.')
    }
    assumptions.push('For workouts I require a sweat/water rating and weighted Comfort (secure fit) High.')
  }
  if (/call|meeting|zoom|teams|work from home|wfh|office|\bmic\b/.test(t)) {
    weights.calls = 3
    matchedUseCase = true
    assumptions.push('Calls matter to you, so Call quality is weighted High.')
  }
  if (/music|audiophile|sound quality|bass|hi-fi|hifi|detail|vinyl/.test(t)) {
    weights.sound = 3
    matchedUseCase = true
    assumptions.push('You care about listening, so Sound quality is weighted High.')
  }
  if (/cheap|affordable|value|inexpensive|bargain|budget(?! of| is)/.test(t) && !budget) {
    weights.value = 3
    matchedUseCase = true
    assumptions.push('You want good value, so Price is weighted High.')
  }
  if (/comfort|lightweight|long hours|all day|all-day/.test(t)) {
    weights.comfort = 3
    matchedUseCase = true
    assumptions.push('Comfort is weighted High for long wear.')
  }
  if (/sweat|waterproof|water resistant|water-resistant|rain/.test(t)) requireWater = true
  if (/multipoint|two devices|laptop and phone|phone and laptop/.test(t)) {
    requireMultipoint = true
    assumptions.push('You need multipoint, so models that pair with only one device are excluded.')
  }

  if (!matchedUseCase) assumptions.push('I didn’t spot a specific use case, so every priority starts at Medium.')

  return { query, budget, formFactor, requireWater, requireMultipoint, weights, assumptions }
}

const RANGES = Object.fromEntries(
  DIMENSION_ORDER.map((d) => {
    const values = CATALOG.map((p) => DIMENSIONS[d].get(p))
    return [d, { min: Math.min(...values), max: Math.max(...values) }]
  }),
) as Record<Dimension, { min: number; max: number }>

export function normalized(p: Product, d: Dimension) {
  const { min, max } = RANGES[d]
  const n = (DIMENSIONS[d].get(p) - min) / (max - min || 1)
  return DIMENSIONS[d].higherIsBetter ? n : 1 - n
}

export function scoreProduct(p: Product, brief: Brief) {
  const contributions = DIMENSION_ORDER.map((d) => ({
    dim: d,
    weight: brief.weights[d],
    n: normalized(p, d),
  }))
  const total = contributions.reduce((a, c) => a + c.weight, 0) || 1
  const score = contributions.reduce((a, c) => a + c.weight * c.n, 0) / total
  return { score, contributions }
}

export function fitScore(p: Product, brief: Brief) {
  return Math.round(scoreProduct(p, brief).score * 100)
}

export function exclusionReason(p: Product, brief: Brief): string | null {
  if (brief.budget && p.price > brief.budget) return `Over your $${brief.budget} budget ($${p.price})`
  if (brief.formFactor !== 'any' && p.formFactor !== brief.formFactor)
    return `${formFactorLabel(p.formFactor)} — you asked for ${formFactorLabel(brief.formFactor).toLowerCase()}`
  if (brief.requireWater && p.specs.water === 'None') return 'No sweat/water resistance rating'
  if (brief.requireMultipoint && !p.specs.multipoint) return 'No multipoint (pairs with one device at a time)'
  return null
}

export function screenCatalog(brief: Brief) {
  const eligible: Product[] = []
  const excluded: Exclusion[] = []
  for (const p of CATALOG) {
    const reason = exclusionReason(p, brief)
    if (reason) excluded.push({ id: p.id, reason })
    else eligible.push(p)
  }
  return { eligible, excluded }
}

export function rankProducts(products: Product[], brief: Brief) {
  return products
    .map((p) => ({ product: p, score: scoreProduct(p, brief).score }))
    .sort((a, b) => b.score - a.score)
}

function bestOn(products: Product[], d: Dimension) {
  return [...products].sort((a, b) => normalized(b, d) - normalized(a, d))[0]
}

export function dimensionLeaders(ids: string[]) {
  const products = ids.map((id) => PRODUCT_BY_ID[id])
  return Object.fromEntries(DIMENSION_ORDER.map((d) => [d, bestOn(products, d)?.id])) as Record<Dimension, string>
}

export function buildRecommendation(shortlistIds: string[], brief: Brief): Recommendation {
  const products = shortlistIds.map((id) => PRODUCT_BY_ID[id])
  const ranked = rankProducts(products, brief)
  const primary = ranked[0].product
  const runnerUp = ranked[1]?.product ?? null
  const scores = Object.fromEntries(ranked.map((r) => [r.product.id, Math.round(r.score * 100)]))

  const gap = ranked[1] ? ranked[0].score - ranked[1].score : 1
  const confidence: Recommendation['confidence'] = gap > 0.08 ? 'High' : gap > 0.03 ? 'Medium' : 'Low'
  const confidenceNote =
    confidence === 'High'
      ? `Clear lead of ${Math.round(gap * 100)} points over the next option.`
      : confidence === 'Medium'
        ? `Ahead by ${Math.round(gap * 100)} points — a reasonable but not decisive lead.`
        : `Close call: only ${Math.max(1, Math.round(gap * 100))} point${Math.round(gap * 100) === 1 ? '' : 's'} ahead of ${runnerUp?.name}. Your call matters here.`

  const importantDims = DIMENSION_ORDER.filter((d) => brief.weights[d] >= 2)
  const rankOn = (p: Product, d: Dimension) =>
    [...products].sort((a, b) => normalized(b, d) - normalized(a, d)).findIndex((x) => x.id === p.id)

  const reasons = [...importantDims]
    .sort((a, b) => brief.weights[b] * normalized(primary, b) - brief.weights[a] * normalized(primary, a))
    .slice(0, 3)
    .map((d) => {
      const r = rankOn(primary, d)
      const pos = r === 0 ? 'best' : `#${r + 1}`
      return `${DIMENSIONS[d].label} ${DIMENSIONS[d].format(primary)} — ${pos} of ${products.length} shortlisted (you set ${WEIGHT_LABELS[brief.weights[d]]})`
    })

  const tradeoffs = importantDims
    .map((d) => {
      const leader = bestOn(products, d)
      const diff = normalized(leader, d) - normalized(primary, d)
      return { d, leader, diff }
    })
    .filter((x) => x.leader.id !== primary.id && x.diff > 0.15)
    .sort((a, b) => brief.weights[b.d] * b.diff - brief.weights[a.d] * a.diff)
    .slice(0, 2)
    .map(
      ({ d, leader }) =>
        `${DIMENSIONS[d].label}: ${DIMENSIONS[d].format(primary)} vs ${DIMENSIONS[d].format(leader)} on ${leader.name}`,
    )

  let runnerUpNote: string | null = null
  if (runnerUp) {
    const edge = importantDims
      .map((d) => ({ d, diff: normalized(runnerUp, d) - normalized(primary, d) }))
      .sort((a, b) => b.diff - a.diff)[0]
    runnerUpNote =
      edge && edge.diff > 0
        ? `Pick this if ${DIMENSIONS[edge.d].label.toLowerCase()} matters more to you (${DIMENSIONS[edge.d].format(runnerUp)} vs ${DIMENSIONS[edge.d].format(primary)}).`
        : 'Close second overall with a similar profile.'
  }

  const cheapest = [...products].sort((a, b) => a.price - b.price)[0]
  const budgetPickId =
    cheapest.id !== primary.id && cheapest.id !== runnerUp?.id && primary.price - cheapest.price >= 40 ? cheapest.id : null

  return {
    primaryId: primary.id,
    runnerUpId: runnerUp?.id ?? null,
    budgetPickId,
    confidence,
    confidenceNote,
    reasons,
    tradeoffs: tradeoffs.length ? tradeoffs : ['No meaningful trade-offs against the rest of your shortlist.'],
    runnerUpNote,
    scores,
  }
}

export function explainProduct(
  id: string,
  brief: Brief | null,
  shortlist: string[],
  recommendation: Recommendation | null,
): string {
  const p = PRODUCT_BY_ID[id]
  if (!brief) return `${p.name}: ${p.blurb} Tell me what you need and I’ll check whether it fits.`

  const reason = exclusionReason(p, brief)
  if (reason)
    return `I excluded ${p.name} during screening: ${reason}. If that constraint doesn’t matter to you, adjust it in the brief and I’ll re-run the search.`

  const score = fitScore(p, brief)
  const primary = recommendation ? PRODUCT_BY_ID[recommendation.primaryId] : null

  if (primary && primary.id === id)
    return `${p.name} is my pick (fit ${score}). ${recommendation!.reasons[0]}. ${recommendation!.confidenceNote}`

  const compareTo = primary ?? rankProducts(shortlist.map((s) => PRODUCT_BY_ID[s]), brief)[0]?.product
  if (!compareTo) return `${p.name} has a fit score of ${score} for your brief.`

  const diffs = DIMENSION_ORDER.filter((d) => brief.weights[d] > 0).map((d) => ({
    d,
    diff: normalized(p, d) - normalized(compareTo, d),
  }))
  const strongest = [...diffs].sort((a, b) => b.diff - a.diff)[0]
  const weakest = [...diffs].sort((a, b) => brief.weights[b.d] * -b.diff - brief.weights[a.d] * -a.diff)[0]
  const otherScore = fitScore(compareTo, brief)
  const status = shortlist.includes(id)
    ? 'It made the shortlist but ranked lower'
    : 'It passed screening but didn’t make my top shortlist'

  const strengths =
    strongest && strongest.diff > 0.05
      ? ` It’s stronger on ${DIMENSIONS[strongest.d].label.toLowerCase()} (${DIMENSIONS[strongest.d].format(p)} vs ${DIMENSIONS[strongest.d].format(compareTo)}),`
      : ''
  const weakness = weakest
    ? ` but weaker on ${DIMENSIONS[weakest.d].label.toLowerCase()} (${DIMENSIONS[weakest.d].format(p)} vs ${DIMENSIONS[weakest.d].format(compareTo)}), which you weighted ${WEIGHT_LABELS[brief.weights[weakest.d]]}.`
    : '.'

  return `${status}: fit ${score} vs ${otherScore} for ${compareTo.name}.${strengths}${weakness} Raise a priority and I’ll re-rank.`
}

const DIM_KEYWORDS: [Dimension, RegExp][] = [
  ['anc', /noise|\banc\b|quiet/],
  ['battery', /battery/],
  ['comfort', /comfort|lighter|lightweight|weight/],
  ['calls', /call|\bmic\b|meeting/],
  ['sound', /sound|bass|audio|music/],
  ['value', /cheap|price|value|afford|cost/],
]

export function parseAdjustments(text: string, brief: Brief) {
  const t = text.toLowerCase()
  const next: Brief = { ...brief, weights: { ...brief.weights }, assumptions: [...brief.assumptions] }
  const changes: string[] = []
  const negative = /less|don'?t care|doesn'?t matter|ignore|not important|lower priority|deprioriti/.test(t)

  const budget = extractBudget(t)
  if (budget && budget !== brief.budget) {
    next.budget = budget
    changes.push(`budget → $${budget}`)
  } else if (/no budget|any price|price doesn'?t matter/.test(t)) {
    next.budget = null
    changes.push('budget removed')
  }

  for (const [d, re] of DIM_KEYWORDS) {
    if (d === 'value' && budget) continue
    if (re.test(t)) {
      const w: Weight = negative ? 1 : 3
      if (next.weights[d] !== w) {
        next.weights[d] = w
        changes.push(`${DIMENSIONS[d].label} → ${WEIGHT_LABELS[w]}`)
      }
    }
  }

  if (/earbud|in-ear|\bbuds\b/.test(t) && brief.formFactor !== 'in-ear') {
    next.formFactor = 'in-ear'
    changes.push('type → earbuds')
  } else if (/over-ear|over ear|full-size/.test(t) && brief.formFactor !== 'over-ear') {
    next.formFactor = 'over-ear'
    changes.push('type → over-ear')
  } else if (/either|any type|both types/.test(t) && brief.formFactor !== 'any') {
    next.formFactor = 'any'
    changes.push('type → any')
  }

  if (/sweat|water/.test(t) && !brief.requireWater) {
    next.requireWater = true
    changes.push('require sweat resistance')
  }
  if (/multipoint|two devices/.test(t) && !brief.requireMultipoint) {
    next.requireMultipoint = true
    changes.push('require multipoint')
  }

  return { brief: next, changes }
}

export function findProductMention(text: string) {
  const t = text.toLowerCase()
  return CATALOG.find((p) => {
    const words = p.name.toLowerCase().split(' ')
    return words.slice(1).some((w) => w.length > 2 && /[a-z]/.test(w) && t.includes(w)) || t.includes(p.name.toLowerCase())
  })
}
