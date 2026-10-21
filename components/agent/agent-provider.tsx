'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CATALOG, DIMENSIONS, PRODUCT_BY_ID, formFactorLabel, type FormFactor } from '@/lib/catalog'
import {
  buildRecommendation,
  dimensionLeaders,
  explainProduct,
  findProductMention,
  parseAdjustments,
  parseQuery,
  rankProducts,
  screenCatalog,
  type Brief,
  type Recommendation,
} from '@/lib/agent-logic'
import type { Autonomy } from '@/lib/study'
import { useStudy } from '@/components/study/study-provider'

export type Phase =
  | 'idle'
  | 'understanding'
  | 'brief'
  | 'searching'
  | 'shortlist'
  | 'comparing'
  | 'recommending'
  | 'recommendation'
  | 'confirm-cart'
  | 'complete'
  | 'stopped'

export type StepId = 'understand' | 'search' | 'shortlist' | 'compare' | 'recommend' | 'cart'
export type StepStatus = 'pending' | 'running' | 'waiting' | 'done'

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'understand', label: 'Understand' },
  { id: 'search', label: 'Search' },
  { id: 'shortlist', label: 'Shortlist' },
  { id: 'compare', label: 'Compare' },
  { id: 'recommend', label: 'Recommend' },
  { id: 'cart', label: 'Cart' },
]

export type MessageKind = 'text' | 'plan' | 'brief' | 'shortlist' | 'compare' | 'recommendation' | 'cart-confirm' | 'divider'

export interface Message {
  id: string
  role: 'user' | 'agent' | 'system'
  kind: MessageKind
  text?: string
  brief?: Brief
  ids?: string[]
  recommendation?: Recommendation
  productId?: string
  ts: number
}

export type LogType = 'action' | 'reasoning' | 'checkpoint' | 'user' | 'system'
export interface LogEntry {
  id: string
  ts: number
  type: LogType
  text: string
}

export interface CartItem {
  key: string
  productId: string
  color: string
  qty: number
  addedBy: 'agent' | 'user'
}

export interface Filters {
  query: string
  maxPrice: number | null
  formFactor: 'any' | FormFactor
  brands: string[]
  sort: 'relevance' | 'price-asc' | 'price-desc' | 'rating'
}
export type FilterKey = keyof Filters

export interface PendingCart {
  productId: string
  color: string
  qty: number
}

interface AgentState {
  panelOpen: boolean
  activeTab: 'chat' | 'activity'
  phase: Phase
  paused: boolean
  autonomy: Autonomy
  messages: Message[]
  log: LogEntry[]
  steps: Record<StepId, StepStatus>
  brief: Brief | null
  scanningId: string | null
  reviewedIds: string[]
  excluded: Record<string, string>
  shortlist: string[]
  recommendation: Recommendation | null
  selectedId: string | null
  pendingCart: PendingCart | null
  cart: CartItem[]
  compareOpen: boolean
  filters: Filters
  filterSource: Partial<Record<FilterKey, 'agent' | 'user'>>
  cartOpen: boolean
  quickViewId: string | null
}

const freshSteps = (): Record<StepId, StepStatus> => ({
  understand: 'pending',
  search: 'pending',
  shortlist: 'pending',
  compare: 'pending',
  recommend: 'pending',
  cart: 'pending',
})

const defaultFilters: Filters = { query: '', maxPrice: null, formFactor: 'any', brands: [], sort: 'relevance' }

const initialState: AgentState = {
  panelOpen: true,
  activeTab: 'chat',
  phase: 'idle',
  paused: false,
  autonomy: 'checkpoints',
  messages: [],
  log: [],
  steps: freshSteps(),
  brief: null,
  scanningId: null,
  reviewedIds: [],
  excluded: {},
  shortlist: [],
  recommendation: null,
  selectedId: null,
  pendingCart: null,
  cart: [],
  compareOpen: false,
  filters: defaultFilters,
  filterSource: {},
  cartOpen: false,
  quickViewId: null,
}

class Cancelled extends Error {}

const uid = () => Math.random().toString(36).slice(2, 10)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function applyFilters(filters: Filters) {
  let list = CATALOG.filter((p) => {
    if (filters.query && !`${p.name} ${p.brand} ${p.blurb}`.toLowerCase().includes(filters.query.toLowerCase()))
      return false
    if (filters.maxPrice && p.price > filters.maxPrice) return false
    if (filters.formFactor !== 'any' && p.formFactor !== filters.formFactor) return false
    if (filters.brands.length && !filters.brands.includes(p.brand)) return false
    return true
  })
  if (filters.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
  if (filters.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
  if (filters.sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating)
  return list
}

function useAgentController() {
  const study = useStudy()
  const track = study.track
  const [state, setState] = useState<AgentState>(initialState)
  const ref = useRef<AgentState>(initialState)
  const runRef = useRef(0)
  const pausedRef = useRef(false)

  const update = useCallback((fn: (s: AgentState) => AgentState) => {
    ref.current = fn(ref.current)
    setState(ref.current)
  }, [])

  const addMessage = useCallback(
    (m: Omit<Message, 'id' | 'ts'>) => update((s) => ({ ...s, messages: [...s.messages, { ...m, id: uid(), ts: Date.now() }] })),
    [update],
  )
  const log = useCallback(
    (type: LogType, text: string) =>
      update((s) => ({ ...s, log: [...s.log, { id: uid(), ts: Date.now(), type, text }] })),
    [update],
  )
  const setSteps = useCallback(
    (patch: Partial<Record<StepId, StepStatus>>) => update((s) => ({ ...s, steps: { ...s.steps, ...patch } })),
    [update],
  )

  const wait = useCallback(async (ms: number, runId: number) => {
    let elapsed = 0
    while (elapsed < ms) {
      await sleep(100)
      if (runRef.current !== runId) throw new Cancelled()
      if (!pausedRef.current) elapsed += 100
    }
  }, [])

  const guard = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e
    }
  }, [])

  const runRecommend = useCallback(
    async (runId: number) => {
      update((s) => ({ ...s, phase: 'recommending' }))
      setSteps({ recommend: 'running' })
      log('action', 'Weighing the shortlist against your priorities…')
      await wait(900, runId)
      const { shortlist, brief } = ref.current
      if (!brief) return
      const rec = buildRecommendation(shortlist, brief)
      const primary = PRODUCT_BY_ID[rec.primaryId]
      update((s) => ({
        ...s,
        recommendation: rec,
        selectedId: rec.primaryId,
        phase: 'recommendation',
        steps: { ...s.steps, recommend: 'done', cart: 'pending' },
      }))
      addMessage({ role: 'agent', kind: 'recommendation', recommendation: rec })
      log('reasoning', `Recommending ${primary.name} (fit ${rec.scores[primary.id]}, ${rec.confidence.toLowerCase()} confidence). ${rec.confidenceNote}`)
      log('checkpoint', 'Nothing goes in your cart without your explicit OK.')
    },
    [update, setSteps, log, wait, addMessage],
  )

  const runCompare = useCallback(
    async (runId: number) => {
      update((s) => ({ ...s, phase: 'comparing', compareOpen: true }))
      setSteps({ compare: 'running' })
      addMessage({
        role: 'agent',
        kind: 'compare',
        text: 'I’ve put the shortlist side by side above the results. The leader in each row is marked so you can check my reading.',
      })
      log('action', 'Opened side-by-side comparison of the shortlist.')
      const { shortlist, brief } = ref.current
      if (!brief) return
      const leaders = dimensionLeaders(shortlist)
      for (const [dim, id] of Object.entries(leaders)) {
        const d = dim as keyof typeof DIMENSIONS
        if (brief.weights[d] < 2) continue
        await wait(350, runId)
        log('reasoning', `${DIMENSIONS[d].label}: ${PRODUCT_BY_ID[id].name} leads (${DIMENSIONS[d].format(PRODUCT_BY_ID[id])}).`)
      }
      if (ref.current.autonomy === 'step') {
        setSteps({ compare: 'waiting' })
        log('checkpoint', 'Waiting for you to review the comparison.')
        return
      }
      setSteps({ compare: 'done' })
      await wait(400, runId)
      await runRecommend(runId)
    },
    [update, setSteps, addMessage, log, wait, runRecommend],
  )

  const runFromSearch = useCallback(
    async (runId: number) => {
      const brief = ref.current.brief
      if (!brief) return
      update((s) => ({
        ...s,
        phase: 'searching',
        steps: { ...s.steps, understand: 'done', search: 'running', shortlist: 'pending', compare: 'pending', recommend: 'pending', cart: 'pending' },
        excluded: {},
        reviewedIds: [],
        shortlist: [],
        recommendation: null,
        selectedId: null,
        pendingCart: null,
        compareOpen: false,
      }))
      addMessage({ role: 'agent', kind: 'text', text: 'Searching the Headphones catalog and screening against your must-haves…' })
      await wait(600, runId)

      const agentFilters: Partial<Filters> = { query: '', maxPrice: brief.budget, formFactor: brief.formFactor, sort: 'relevance' }
      update((s) => ({
        ...s,
        filters: { ...s.filters, ...agentFilters, brands: [] },
        filterSource: { ...s.filterSource, maxPrice: 'agent', formFactor: 'agent', query: undefined, brands: undefined },
      }))
      const applied = [
        brief.budget ? `max price $${brief.budget}` : null,
        brief.formFactor !== 'any' ? `type: ${formFactorLabel(brief.formFactor).toLowerCase()}` : null,
      ].filter(Boolean)
      log('action', applied.length ? `Applied store filters: ${applied.join(', ')}.` : 'No store filters needed — browsing all headphones.')

      const visible = applyFilters(ref.current.filters)
      log('action', `Found ${visible.length} matching product${visible.length === 1 ? '' : 's'}. Reviewing each listing…`)
      for (const p of visible) {
        update((s) => ({ ...s, scanningId: p.id }))
        await wait(240, runId)
        update((s) => ({ ...s, reviewedIds: [...s.reviewedIds, p.id] }))
      }
      update((s) => ({ ...s, scanningId: null }))

      const { eligible, excluded } = screenCatalog(brief)
      update((s) => ({ ...s, excluded: Object.fromEntries(excluded.map((e) => [e.id, e.reason])) }))
      for (const e of excluded) log('reasoning', `Excluded ${PRODUCT_BY_ID[e.id].name}: ${e.reason}.`)
      setSteps({ search: 'done' })

      if (eligible.length === 0) {
        update((s) => ({ ...s, phase: 'brief', steps: { ...s.steps, understand: 'waiting', search: 'pending' } }))
        addMessage({
          role: 'agent',
          kind: 'text',
          text: 'Nothing in the catalog meets every must-have. Could you loosen one? I’ve reopened the brief below.',
        })
        addMessage({ role: 'agent', kind: 'brief', brief })
        log('checkpoint', 'No eligible products — asked you to relax a constraint.')
        return
      }

      setSteps({ shortlist: 'running' })
      await wait(600, runId)
      const ranked = rankProducts(eligible, brief)
      const shortlist = ranked.slice(0, Math.min(4, ranked.length)).map((r) => r.product.id)
      update((s) => ({ ...s, shortlist }))
      log(
        'reasoning',
        `Ranked ${eligible.length} eligible product${eligible.length === 1 ? '' : 's'} by your weighted priorities and kept the top ${shortlist.length}.`,
      )
      addMessage({ role: 'agent', kind: 'shortlist', ids: shortlist })

      if (ref.current.autonomy === 'step' || shortlist.length < 2) {
        update((s) => ({ ...s, phase: 'shortlist' }))
        setSteps({ shortlist: 'waiting' })
        log('checkpoint', 'Waiting for you to approve the shortlist.')
        return
      }
      setSteps({ shortlist: 'done' })
      log('action', 'Shortlist auto-approved under “Ask at key decisions”. You can still edit it.')
      await wait(500, runId)
      await runCompare(runId)
    },
    [update, addMessage, wait, log, setSteps, runCompare],
  )

  const start = useCallback(
    (query: string) => {
      const runId = ++runRef.current
      pausedRef.current = false
      track('agent_started')
      const hadConversation = ref.current.messages.length > 0
      update((s) => ({
        ...s,
        panelOpen: true,
        activeTab: 'chat',
        phase: 'understanding',
        paused: false,
        steps: { ...freshSteps(), understand: 'running' },
        brief: null,
        scanningId: null,
        reviewedIds: [],
        excluded: {},
        shortlist: [],
        recommendation: null,
        selectedId: null,
        pendingCart: null,
        compareOpen: false,
        messages: [
          ...s.messages,
          ...(hadConversation ? [{ id: uid(), ts: Date.now(), role: 'system' as const, kind: 'divider' as const, text: 'New request' }] : []),
          { id: uid(), ts: Date.now(), role: 'user', kind: 'text', text: query },
          { id: uid(), ts: Date.now(), role: 'agent', kind: 'plan' },
        ],
      }))
      log('user', `Request: “${query}”`)
      log('action', 'Reading your request and drafting a shopping brief…')
      guard(async () => {
        await wait(900, runId)
        const brief = parseQuery(query)
        for (const a of brief.assumptions) log('reasoning', a)
        update((s) => ({ ...s, brief, phase: 'brief', steps: { ...s.steps, understand: 'done' } }))
        addMessage({ role: 'agent', kind: 'brief', brief })
        log('action', 'Brief understood. Starting a catalog search with these assumptions — you can adjust them anytime.')
        await wait(500, runId)
        await runFromSearch(runId)
      })
    },
    [track, update, log, guard, wait, addMessage],
  )

  const confirmBrief = useCallback(
    (brief: Brief, edited: boolean) => {
      const runId = ++runRef.current
      pausedRef.current = false
      track('checkpoint_confirmed')
      if (edited) track('brief_edited')
      update((s) => ({ ...s, brief, paused: false }))
      addMessage({ role: 'user', kind: 'text', text: edited ? 'Updated the brief — go ahead.' : 'Looks right — go ahead.' })
      log('user', edited ? 'You edited and confirmed the brief.' : 'You confirmed the brief.')
      guard(() => runFromSearch(runId))
    },
    [track, update, addMessage, log, guard, runFromSearch],
  )

  const editBrief = useCallback(() => {
    const brief = ref.current.brief
    if (!brief) return
    runRef.current++
    pausedRef.current = false
    track('brief_reopened')
    update((s) => ({
      ...s,
      phase: 'brief',
      paused: false,
      scanningId: null,
      pendingCart: null,
      steps: { ...freshSteps(), understand: 'waiting' },
    }))
    addMessage({ role: 'agent', kind: 'brief', brief })
    log('user', 'You reopened the brief to change it.')
  }, [track, update, addMessage, log])

  const confirmShortlist = useCallback(() => {
    const runId = ++runRef.current
    pausedRef.current = false
    track('checkpoint_confirmed')
    setSteps({ shortlist: 'done' })
    update((s) => ({ ...s, paused: false }))
    addMessage({ role: 'user', kind: 'text', text: 'Compare these.' })
    log('user', `You approved the shortlist (${ref.current.shortlist.length} products).`)
    guard(() => runCompare(runId))
  }, [track, setSteps, update, addMessage, log, guard, runCompare])

  const reopenShortlist = useCallback(() => {
    runRef.current++
    pausedRef.current = false
    update((s) => ({
      ...s,
      phase: 'shortlist',
      paused: false,
      pendingCart: null,
      recommendation: null,
      selectedId: null,
      steps: { ...s.steps, shortlist: 'waiting', compare: 'pending', recommend: 'pending', cart: 'pending' },
    }))
    addMessage({ role: 'agent', kind: 'shortlist', ids: ref.current.shortlist })
    log('user', 'You reopened the shortlist to edit it.')
  }, [update, addMessage, log])

  const toggleShortlist = useCallback(
    (id: string) => {
      if (ref.current.phase !== 'shortlist') reopenShortlist()
      track('shortlist_edited')
      const inList = ref.current.shortlist.includes(id)
      update((s) => ({
        ...s,
        shortlist: inList ? s.shortlist.filter((x) => x !== id) : [...s.shortlist, id].slice(0, 5),
      }))
      log('user', `${inList ? 'Removed' : 'Added'} ${PRODUCT_BY_ID[id].name} ${inList ? 'from' : 'to'} the shortlist.`)
    },
    [reopenShortlist, track, update, log],
  )

  const continueFromCompare = useCallback(() => {
    const runId = ++runRef.current
    track('checkpoint_confirmed')
    setSteps({ compare: 'done' })
    addMessage({ role: 'user', kind: 'text', text: 'Comparison looks fine — recommend one.' })
    log('user', 'You approved the comparison.')
    guard(() => runRecommend(runId))
  }, [track, setSteps, addMessage, log, guard, runRecommend])

  const selectProduct = useCallback(
    (id: string) => {
      const rec = ref.current.recommendation
      if (!rec) return
      if (id !== rec.primaryId) track('recommendation_overridden')
      update((s) => ({ ...s, selectedId: id }))
      log(
        'user',
        id === rec.primaryId
          ? `You went back to my pick, ${PRODUCT_BY_ID[id].name}.`
          : `You chose ${PRODUCT_BY_ID[id].name} instead of my pick.`,
      )
    },
    [track, update, log],
  )

  const requestCart = useCallback(() => {
    const id = ref.current.selectedId
    if (!id) return
    const p = PRODUCT_BY_ID[id]
    update((s) => ({
      ...s,
      phase: 'confirm-cart',
      pendingCart: { productId: id, color: p.colors[0], qty: 1 },
      steps: { ...s.steps, cart: 'waiting' },
    }))
    addMessage({ role: 'agent', kind: 'cart-confirm', productId: id })
    log('checkpoint', `Asking for confirmation before adding ${p.name} to your cart.`)
  }, [update, addMessage, log])

  const updatePendingCart = useCallback(
    (patch: Partial<PendingCart>) =>
      update((s) => (s.pendingCart ? { ...s, pendingCart: { ...s.pendingCart, ...patch } } : s)),
    [update],
  )

  const confirmCart = useCallback(() => {
    const { pendingCart, recommendation } = ref.current
    if (!pendingCart) return
    const p = PRODUCT_BY_ID[pendingCart.productId]
    track(recommendation?.primaryId === p.id ? 'cart_confirmed_agent_pick' : 'cart_confirmed_alternative')
    update((s) => ({
      ...s,
      cart: [...s.cart, { key: uid(), ...pendingCart, addedBy: 'agent' }],
      pendingCart: null,
      phase: 'complete',
      steps: { ...s.steps, cart: 'done' },
    }))
    addMessage({
      role: 'agent',
      kind: 'text',
      text: `Added ${pendingCart.qty} × ${p.name} (${pendingCart.color}) to your cart. Nothing has been ordered or charged — checkout stays in your hands.`,
    })
    log('action', `Added ${p.name} (${pendingCart.color}, qty ${pendingCart.qty}) to cart after your confirmation.`)
  }, [track, update, addMessage, log])

  const cancelCart = useCallback(() => {
    track('cart_declined')
    update((s) => ({ ...s, pendingCart: null, phase: 'recommendation', steps: { ...s.steps, cart: 'pending' } }))
    addMessage({ role: 'agent', kind: 'text', text: 'No problem — nothing was added. You can pick another option or adjust priorities.' })
    log('user', 'You declined adding to cart.')
  }, [track, update, addMessage, log])

  const askAbout = useCallback(
    (id: string) => {
      track('why_asked')
      const s = ref.current
      const p = PRODUCT_BY_ID[id]
      const isPick = s.recommendation?.primaryId === id
      update((st) => ({ ...st, panelOpen: true, activeTab: 'chat', quickViewId: null }))
      addMessage({ role: 'user', kind: 'text', text: isPick ? `Why ${p.name}?` : `Why not ${p.name}?` })
      addMessage({ role: 'agent', kind: 'text', text: explainProduct(id, s.brief, s.shortlist, s.recommendation) })
      log('user', `You asked about ${p.name}.`)
    },
    [track, update, addMessage, log],
  )

  const followUp = useCallback(
    (text: string) => {
      const s = ref.current
      if (!s.brief || /^(start over|new search|reset)/i.test(text.trim())) {
        start(text)
        return
      }
      const mention = findProductMention(text)
      if (mention && /why|what about|how about|tell me|explain/i.test(text)) {
        askAbout(mention.id)
        return
      }
      const { brief, changes } = parseAdjustments(text, s.brief)
      if (changes.length) {
        const runId = ++runRef.current
        pausedRef.current = false
        track('followup_adjustment')
        addMessage({ role: 'user', kind: 'text', text })
        addMessage({ role: 'agent', kind: 'text', text: `Got it — ${changes.join(', ')}. Re-running search and ranking with the updated brief.` })
        log('user', `Adjusted via chat: ${changes.join(', ')}.`)
        update((st) => ({ ...st, brief, paused: false }))
        guard(() => runFromSearch(runId))
        return
      }
      addMessage({ role: 'user', kind: 'text', text })
      addMessage({
        role: 'agent',
        kind: 'text',
        text: 'I can adjust priorities (“prioritise battery”, “calls matter less”), budget (“under $200”), type (“earbuds”), or explain a product (“why not the Halo 700?”). Say “start over” for a new search.',
      })
    },
    [start, askAbout, track, addMessage, log, update, guard, runFromSearch],
  )

  const pause = useCallback(() => {
    pausedRef.current = true
    track('paused')
    update((s) => ({ ...s, paused: true }))
    log('user', 'You paused the assistant.')
  }, [track, update, log])

  const resume = useCallback(() => {
    pausedRef.current = false
    update((s) => ({ ...s, paused: false }))
    log('user', 'You resumed the assistant.')
  }, [update, log])

  const stop = useCallback(() => {
    runRef.current++
    pausedRef.current = false
    track('stopped')
    update((s) => ({
      ...s,
      phase: 'stopped',
      paused: false,
      scanningId: null,
      steps: Object.fromEntries(
        Object.entries(s.steps).map(([k, v]) => [k, v === 'running' || v === 'waiting' ? 'pending' : v]),
      ) as Record<StepId, StepStatus>,
    }))
    addMessage({ role: 'agent', kind: 'text', text: 'Stopped. Your filters and shortlist are kept — tell me how you’d like to continue, or edit the brief.' })
    log('user', 'You stopped the assistant.')
  }, [track, update, addMessage, log])

  const setAutonomy = useCallback(
    (autonomy: Autonomy) => {
      update((s) => ({ ...s, autonomy }))
      log('system', `Approval mode set to “${autonomy === 'step' ? 'Ask before every step' : 'Ask at key decisions'}”.`)
    },
    [update, log],
  )

  const reset = useCallback(() => {
    runRef.current++
    pausedRef.current = false
    update((s) => ({
      ...initialState,
      autonomy: s.autonomy,
      cart: [],
      panelOpen: true,
    }))
  }, [update])

  const setFilter = useCallback(
    <K extends FilterKey>(key: K, value: Filters[K]) => {
      track('filter_changed_by_user')
      update((s) => ({ ...s, filters: { ...s.filters, [key]: value }, filterSource: { ...s.filterSource, [key]: 'user' } }))
      log('user', `You changed the “${key}” filter.`)
    },
    [track, update, log],
  )

  const clearFilters = useCallback(() => {
    track('filter_changed_by_user')
    update((s) => ({ ...s, filters: defaultFilters, filterSource: {} }))
    log('user', 'You cleared all filters.')
  }, [track, update, log])

  const addToCart = useCallback(
    (productId: string) => {
      track('manual_add_to_cart')
      const p = PRODUCT_BY_ID[productId]
      update((s) => ({
        ...s,
        cart: [...s.cart, { key: uid(), productId, color: p.colors[0], qty: 1, addedBy: 'user' }],
        cartOpen: true,
        quickViewId: null,
      }))
      log('user', `You added ${p.name} to the cart yourself.`)
    },
    [track, update, log],
  )

  const ui = useMemo(
    () => ({
      setPanelOpen: (panelOpen: boolean) => update((s) => ({ ...s, panelOpen })),
      setTab: (activeTab: 'chat' | 'activity') => {
        if (activeTab === 'activity') track('activity_log_viewed')
        update((s) => ({ ...s, activeTab }))
      },
      setCompareOpen: (compareOpen: boolean) => update((s) => ({ ...s, compareOpen })),
      setCartOpen: (cartOpen: boolean) => update((s) => ({ ...s, cartOpen })),
      setQuickView: (quickViewId: string | null) => update((s) => ({ ...s, quickViewId })),
      removeFromCart: (key: string) => update((s) => ({ ...s, cart: s.cart.filter((c) => c.key !== key) })),
      trackReasoning: () => track('reasoning_expanded'),
    }),
    [update, track],
  )

  const isWorking =
    !state.paused &&
    (state.phase === 'understanding' ||
      state.phase === 'searching' ||
      state.phase === 'recommending' ||
      (state.phase === 'comparing' && state.steps.compare === 'running'))
  const isWaiting = Object.values(state.steps).includes('waiting')

  return {
    state,
    isWorking,
    isWaiting,
    start,
    confirmBrief,
    editBrief,
    confirmShortlist,
    reopenShortlist,
    toggleShortlist,
    continueFromCompare,
    selectProduct,
    requestCart,
    updatePendingCart,
    confirmCart,
    cancelCart,
    askAbout,
    followUp,
    pause,
    resume,
    stop,
    setAutonomy,
    reset,
    setFilter,
    clearFilters,
    addToCart,
    ...ui,
  }
}

type AgentContextValue = ReturnType<typeof useAgentController>
const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const value = useAgentController()
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be used within AgentProvider')
  return ctx
}
