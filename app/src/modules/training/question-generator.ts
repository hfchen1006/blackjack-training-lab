import type { Card } from '../blackjack/card'
import { requiresDealerPeek } from '../blackjack/dealer-rules'
import { evaluateHand } from '../blackjack/hand'
import type { Hand } from '../blackjack/hand'
import type { PlayerAction, PlayerDecisionContext, SideDecisionAction } from '../blackjack/player-rules'
import type { RuleProfile } from '../blackjack/rule-profile'
import { getTrainingDecision } from './decision'
import type { TrainingDecision } from './decision'
import { createRandom, createShoe, hashSeed } from './question-generator-internals'
import type { PhysicalCard } from './question-generator-internals'

export const QUESTION_GENERATOR_VERSION = 'question-generator-v1' as const
export type QuestionScenario = 'initial' | 'continuing' | 'split' | 'insurance' | 'even-money'
export type QuestionRequest = {
  readonly seed: string
  readonly questionIndex: number
  readonly scenario: QuestionScenario
  readonly profile: RuleProfile
  readonly generatorVersion?: string
  /** Retry budget only: increasing it never changes an already successful question. */
  readonly maxAttempts?: number
}

type ActionableDecision = Extract<TrainingDecision, { kind: 'action' | 'side-decision' }>
type DecisionInput = { readonly hand: Hand; readonly context: PlayerDecisionContext }
type QuestionBase = {
  readonly id: string
  readonly generatorVersion: typeof QUESTION_GENERATOR_VERSION
  readonly questionIndex: number
  readonly scenario: QuestionScenario
  readonly profile: { readonly id: string; readonly version: number }
  readonly playerCards: readonly Card[]
  readonly dealer: { readonly upcard: Card; readonly holeCard: 'face-down' }
  readonly handSummary: ActionableDecision['handSummary']
}
export type TrainingQuestion = QuestionBase & (
  | { readonly phase: 'player'; readonly selectableAnswers: readonly PlayerAction[] }
  | { readonly phase: 'insurance'; readonly selectableAnswers: readonly SideDecisionAction[]; readonly evenMoneyEligible: boolean }
)

type ReachabilityStep =
  | { readonly kind: 'side-decision'; readonly before: DecisionInput; readonly action: 'decline-insurance' }
  | { readonly kind: 'peek'; readonly before: DecisionInput; readonly result: 'clear' | 'blackjack' }
  | { readonly kind: 'hit'; readonly before: DecisionInput; readonly drawn: PhysicalCard }
  | { readonly kind: 'split'; readonly before: DecisionInput; readonly retained: PhysicalCard;
      readonly sibling: PhysicalCard; readonly replacement: PhysicalCard }

export type QuestionGenerationResult =
  | {
    readonly kind: 'generated'
    /** Presentation-only data: never contains the answer or dealer hole-card value. */
    readonly question: TrainingQuestion
    readonly answerKey: {
      readonly decision: ActionableDecision
      readonly input: DecisionInput
      /** Private verification data. Never pass the answer key to presentation components. */
      readonly evidence: {
        readonly attempt: number
        /** Initial draw order is player, dealer upcard, player, dealer hole card. */
        readonly dealtCards: readonly PhysicalCard[]
        readonly dealerHoleCard: PhysicalCard
        readonly activeCards: readonly PhysicalCard[]
        readonly pendingSplitCards: readonly PhysicalCard[]
        readonly steps: readonly ReachabilityStep[]
      }
    }
  }
  | {
    readonly kind: 'failure'
    readonly generatorVersion: typeof QUESTION_GENERATOR_VERSION
    readonly reason: 'invalid-request' | 'unsupported-generator-version' | 'unsupported-profile' | 'engine-rejected' | 'attempt-limit'
    readonly attempts: number
    readonly lastRejection: string | null
  }

type Round = {
  hand: Hand
  context: PlayerDecisionContext
  activeCards: PhysicalCard[]
  pendingSplitCards: PhysicalCard[]
  dealerHoleCard: PhysicalCard
  dealtCards: PhysicalCard[]
  steps: ReachabilityStep[]
  draw: () => PhysicalCard
}
type Candidate = { round: Round; decision: TrainingDecision; rejection?: string }

function initialContext(upcard: Card, profile: RuleProfile): PlayerDecisionContext {
  return {
    dealerUpcard: upcard,
    dealerPeek: requiresDealerPeek(upcard, profile) ? 'pending' : 'not-required',
    sideDecision: upcard.rank === 'A' ? 'pending' : 'not-applicable',
    handsInRound: 1, splitFromRank: null, surrendered: false,
  }
}

function snapshot(round: Round): DecisionInput {
  // Round updates replace these records; earlier history snapshots are never edited.
  return { hand: round.hand, context: round.context }
}

function makeRound(profile: RuleProfile, nextInt: (upperExclusive: number) => number): Round {
  const shoe = createShoe(profile.settings.decks, nextInt)
  const dealtCards: PhysicalCard[] = []
  const draw = () => { const card = shoe.draw(); dealtCards.push(card); return card }
  const first = draw()
  const upcard = draw()
  const second = draw()
  const hole = draw()
  return {
    hand: { cards: [first.card, second.card], history: { origin: 'initial-deal', actions: [] } },
    context: initialContext(upcard.card, profile),
    activeCards: [first, second], pendingSplitCards: [], dealerHoleCard: hole,
    dealtCards, steps: [], draw,
  }
}

function hit(round: Round): void {
  const before = snapshot(round)
  const drawn = round.draw()
  round.steps.push({ kind: 'hit', before, drawn })
  round.activeCards = [...round.activeCards, drawn]
  round.hand = {
    cards: [...round.hand.cards, drawn.card],
    history: { origin: round.hand.history.origin, actions: [...round.hand.history.actions, 'hit'] },
  }
}

function buildCandidate(request: QuestionRequest, nextInt: (upperExclusive: number) => number): Candidate {
  const { profile, scenario } = request
  const round = makeRound(profile, nextInt)
  let decision = getTrainingDecision(round.hand, round.context, profile)
  if (scenario === 'insurance' || scenario === 'even-money') return { round, decision }

  if (decision.kind === 'side-decision') {
    if (!decision.legalSideActions.includes('decline-insurance')) return { round, decision, rejection: 'side-decline-unavailable' }
    round.steps.push({ kind: 'side-decision', before: snapshot(round), action: 'decline-insurance' })
    round.context = { ...round.context, sideDecision: 'declined' }
    decision = getTrainingDecision(round.hand, round.context, profile)
  }
  if (decision.kind === 'pending' && decision.phase === 'dealer-peek') {
    const dealer = evaluateHand({
      cards: [round.context.dealerUpcard, round.dealerHoleCard.card],
      history: { origin: 'initial-deal', actions: [] },
    })
    const result = dealer.isNaturalBlackjack ? 'blackjack' : 'clear'
    round.steps.push({ kind: 'peek', before: snapshot(round), result })
    round.context = { ...round.context, dealerPeek: result }
    decision = getTrainingDecision(round.hand, round.context, profile)
  }
  if (decision.kind !== 'action' || scenario === 'initial') return { round, decision }

  if (scenario === 'split') {
    // Follow the first child only; other one-card children await later play.
    // This avoids inventing a dealing order for future sibling replacement cards.
    for (let split = 0; split < profile.settings.maxSplitHands - 1; split += 1) {
      if (decision.kind !== 'action' || !decision.legalActions.includes('split')) break
      if (split > 0 && nextInt(2) === 0) break
      const before = snapshot(round)
      const [retained, sibling] = round.activeCards
      round.context = {
        ...round.context, handsInRound: round.context.handsInRound + 1,
        splitFromRank: retained.card.rank,
      }
      round.hand = { cards: [retained.card], history: { origin: 'split', actions: [] } }
      const awaiting = getTrainingDecision(round.hand, round.context, profile)
      if (awaiting.kind !== 'pending' || awaiting.phase !== 'awaiting-split-card') {
        return { round, decision: awaiting, rejection: 'split-replacement-phase-mismatch' }
      }
      const replacement = round.draw()
      round.steps.push({ kind: 'split', before, retained, sibling, replacement })
      round.pendingSplitCards.push(sibling)
      round.activeCards = [retained, replacement]
      round.hand = { cards: [retained.card, replacement.card], history: { origin: 'split', actions: [] } }
      decision = getTrainingDecision(round.hand, round.context, profile)
    }
    if (round.hand.history.origin !== 'split') return { round, decision, rejection: 'split-unavailable' }
  }

  const hits = scenario === 'continuing' ? 1 + nextInt(3) : nextInt(4)
  for (let index = 0; index < hits; index += 1) {
    if (decision.kind !== 'action' || !decision.legalActions.includes('hit')) break
    hit(round)
    decision = getTrainingDecision(round.hand, round.context, profile)
  }
  return { round, decision }
}

function matchesScenario(scenario: QuestionScenario, decision: TrainingDecision): decision is ActionableDecision {
  if (scenario === 'insurance' || scenario === 'even-money') {
    return decision.kind === 'side-decision' && decision.evenMoneyEligible === (scenario === 'even-money')
  }
  return decision.kind === 'action' && decision.handSummary.provenance.kind === scenario
}

function publish(request: QuestionRequest, key: string, attempt: number, round: Round, decision: ActionableDecision): QuestionGenerationResult {
  const summary = decision.handSummary
  const question: QuestionBase = {
    id: `${QUESTION_GENERATOR_VERSION}:${request.scenario}:${request.questionIndex}:${hashSeed(key).toString(16).padStart(8, '0')}${hashSeed(key, 0x9e3779b9).toString(16).padStart(8, '0')}`,
    generatorVersion: QUESTION_GENERATOR_VERSION, questionIndex: request.questionIndex, scenario: request.scenario,
    profile: { id: request.profile.id, version: request.profile.version },
    playerCards: round.hand.cards.map((card) => ({ ...card })),
    dealer: { upcard: { ...round.context.dealerUpcard }, holeCard: 'face-down' },
    handSummary: {
      ...summary, provenance: { kind: summary.provenance.kind, history: {
        origin: summary.provenance.history.origin, actions: [...summary.provenance.history.actions],
      } },
    },
  }
  return {
    kind: 'generated',
    question: decision.kind === 'action'
      ? { ...question, phase: 'player', selectableAnswers: [...decision.legalActions] }
      : { ...question, phase: 'insurance', selectableAnswers: [...decision.legalSideActions], evenMoneyEligible: decision.evenMoneyEligible },
    answerKey: {
      decision, input: snapshot(round), evidence: {
        attempt, dealtCards: round.dealtCards, dealerHoleCard: round.dealerHoleCard,
        activeCards: round.activeCards, pendingSplitCards: round.pendingSplitCards, steps: round.steps,
      },
    },
  }
}

/**
 * Independent, bounded generation per index. Scenario-conditioned samples are not
 * a Balanced/Realistic distribution. Only the `question` field is presentation data.
 */
export function generateQuestion(request: QuestionRequest): QuestionGenerationResult {
  const failure = (reason: Extract<QuestionGenerationResult, { kind: 'failure' }>['reason'], attempts = 0, lastRejection: string | null = null): QuestionGenerationResult =>
    ({ kind: 'failure', generatorVersion: QUESTION_GENERATOR_VERSION, reason, attempts, lastRejection })
  if ((request.generatorVersion ?? QUESTION_GENERATOR_VERSION) !== QUESTION_GENERATOR_VERSION) return failure('unsupported-generator-version')
  const maxAttempts = request.maxAttempts ?? 2048
  if (typeof request.seed !== 'string' || request.seed.length > 1024 ||
      !Number.isSafeInteger(request.questionIndex) || request.questionIndex < 0 ||
      !['initial', 'continuing', 'split', 'insurance', 'even-money'].includes(request.scenario) ||
      !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 4096) return failure('invalid-request')

  // Delegate profile support to the approved adapter using a fixed valid probe.
  const probe = getTrainingDecision({
    cards: [{ rank: '2', suit: 'hearts' }, { rank: '3', suit: 'diamonds' }],
    history: { origin: 'initial-deal', actions: [] },
  }, initialContext({ rank: '6', suit: 'spades' }, request.profile), request.profile)
  if (probe.kind === 'unsupported-profile') return failure('unsupported-profile', 0, probe.reason)
  if (probe.kind !== 'action') return failure('engine-rejected', 0, probe.kind)

  // Supported settings are fixed by the adapter. Object property order is irrelevant.
  const key = JSON.stringify([QUESTION_GENERATOR_VERSION, request.seed, request.questionIndex, request.scenario, request.profile.id, request.profile.version])
  const nextInt = createRandom(key)
  let lastRejection: string | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { round, decision, rejection } = buildCandidate(request, nextInt)
    if (decision.kind === 'invalid-input' || decision.kind === 'unsupported-profile' || decision.kind === 'uncovered-case') {
      return failure('engine-rejected', attempt, `${decision.kind}:${decision.reason}`)
    }
    if (!rejection && matchesScenario(request.scenario, decision)) return publish(request, key, attempt, round, decision)
    lastRejection = rejection ?? (decision.kind === 'terminal' ? `terminal:${decision.reason}` : `${decision.kind}:scenario-mismatch`)
  }
  return failure('attempt-limit', maxAttempts, lastRejection)
}
