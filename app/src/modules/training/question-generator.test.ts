import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCardIdentity } from '../blackjack/card'
import { requiresDealerPeek } from '../blackjack/dealer-rules'
import { evaluateHand } from '../blackjack/hand'
import type { Hand } from '../blackjack/hand'
import type { PlayerDecisionContext } from '../blackjack/player-rules'
import { BASELINE_RULE_PROFILE } from '../blackjack/rule-profile'
import * as adapter from './decision'
import type { TrainingDecision } from './decision'
import { generateQuestion, QUESTION_GENERATOR_VERSION } from './question-generator'
import type { QuestionGenerationResult, QuestionRequest, QuestionScenario } from './question-generator'

type Generated = Extract<QuestionGenerationResult, { kind: 'generated' }>
const scenarios: readonly QuestionScenario[] = ['initial', 'continuing', 'split', 'insurance', 'even-money']

function request(scenario: QuestionScenario = 'initial', seed = 'golden', questionIndex = 0): QuestionRequest {
  return { seed, questionIndex, scenario, profile: BASELINE_RULE_PROFILE }
}

function generated(input: QuestionRequest): Generated {
  const result = generateQuestion(input)
  if (result.kind !== 'generated') throw new Error(`Generation failed: ${JSON.stringify({ input, result })}`)
  return result
}

/** Replay actual draws/transitions, delegating all eligibility to the approved adapter. */
function verify(result: Generated, input: QuestionRequest): void {
  const { question, answerKey } = result
  const { evidence } = answerKey
  const dealt = evidence.dealtCards
  expect(dealt.length).toBeLessThanOrEqual(10)
  expect(new Set(dealt.map((item) => item.physicalId)).size).toBe(dealt.length)
  const counts = new Map<string, number>()
  for (const item of dealt) {
    expect(item.copy).toBeGreaterThanOrEqual(0)
    expect(item.copy).toBeLessThan(6)
    expect(item.physicalId).toBe(`${item.copy}:${getCardIdentity(item.card)}`)
    const identity = getCardIdentity(item.card)
    counts.set(identity, (counts.get(identity) ?? 0) + 1)
    expect(counts.get(identity)).toBeLessThanOrEqual(6)
  }
  expect(evidence.dealerHoleCard).toEqual(dealt[3])
  let hand: Hand = { cards: [dealt[0].card, dealt[2].card], history: { origin: 'initial-deal', actions: [] } }
  let context: PlayerDecisionContext = {
    dealerUpcard: dealt[1].card,
    dealerPeek: requiresDealerPeek(dealt[1].card, input.profile) ? 'pending' : 'not-required',
    sideDecision: dealt[1].card.rank === 'A' ? 'pending' : 'not-applicable',
    handsInRound: 1, splitFromRank: null, surrendered: false,
  }
  let active = [dealt[0], dealt[2]]
  const siblings = []
  let nextDraw = 4
  for (const step of evidence.steps) {
    expect(step.before).toEqual({ hand, context })
    const decision = adapter.getTrainingDecision(hand, context, input.profile)
    if (step.kind === 'side-decision') {
      if (decision.kind !== 'side-decision') throw new Error('Side action outside its phase')
      expect(decision.legalSideActions).toContain(step.action)
      context = { ...context, sideDecision: 'declined' }
    } else if (step.kind === 'peek') {
      expect(decision).toMatchObject({ kind: 'pending', phase: 'dealer-peek' })
      if (context.dealerUpcard.rank === 'A') expect(context.sideDecision).toBe('declined')
      const dealer = evaluateHand({ cards: [context.dealerUpcard, dealt[3].card], history: { origin: 'initial-deal', actions: [] } })
      expect(step.result).toBe(dealer.isNaturalBlackjack ? 'blackjack' : 'clear')
      context = { ...context, dealerPeek: step.result }
    } else {
      if (decision.kind !== 'action') throw new Error('Ordinary action outside its phase')
      expect(decision.legalActions).toContain(step.kind)
      if (step.kind === 'hit') {
        expect(step.drawn).toEqual(dealt[nextDraw++])
        active = [...active, step.drawn]
        hand = { cards: [...hand.cards, step.drawn.card], history: { origin: hand.history.origin, actions: [...hand.history.actions, 'hit'] } }
      } else {
        expect([step.retained, step.sibling]).toEqual(active)
        expect(step.replacement).toEqual(dealt[nextDraw++])
        context = { ...context, handsInRound: context.handsInRound + 1, splitFromRank: step.retained.card.rank }
        const oneCardChild: Hand = { cards: [step.retained.card], history: { origin: 'split', actions: [] } }
        expect(adapter.getTrainingDecision(oneCardChild, context, input.profile))
          .toMatchObject({ kind: 'pending', phase: 'awaiting-split-card' })
        siblings.push(step.sibling)
        active = [step.retained, step.replacement]
        hand = { cards: active.map((item) => item.card), history: { origin: 'split', actions: [] } }
      }
    }
  }
  expect(nextDraw).toBe(dealt.length)
  expect({ hand, context }).toEqual(answerKey.input)
  expect(active).toEqual(evidence.activeCards)
  expect(siblings).toEqual(evidence.pendingSplitCards)
  expect(context.handsInRound).toBe(1 + siblings.length)
  expect(context.handsInRound).toBeLessThanOrEqual(4)
  // Every drawn card is still allocated: active hand, queued sibling, or dealer.
  expect(new Set([...active, ...siblings, dealt[1], dealt[3]].map((item) => item.physicalId)))
    .toEqual(new Set(dealt.map((item) => item.physicalId)))
  expect(answerKey.decision).toEqual(adapter.getTrainingDecision(hand, context, input.profile))
  expect(question.playerCards).toEqual(hand.cards)
  expect(question.dealer).toEqual({ upcard: dealt[1].card, holeCard: 'face-down' })
  expect(question.handSummary).toEqual(answerKey.decision.handSummary)
  expect(question.generatorVersion).toBe(QUESTION_GENERATOR_VERSION)
  expect(question.scenario).toBe(input.scenario)
  if (question.phase === 'player') {
    if (answerKey.decision.kind !== 'action') throw new Error('Ordinary answer/phase mismatch')
    expect(question.selectableAnswers).toEqual(answerKey.decision.legalActions)
    expect(question.selectableAnswers).toContain(answerKey.decision.action)
    expect(context.sideDecision).not.toBe('pending')
    expect(context.dealerPeek).not.toBe('pending')
    expect(context.dealerPeek).not.toBe('blackjack')
    expect(question.handSummary.provenance.kind).toBe(input.scenario)
  } else {
    if (answerKey.decision.kind !== 'side-decision') throw new Error('Side answer/phase mismatch')
    expect(question.selectableAnswers).toEqual(answerKey.decision.legalSideActions)
    expect(question.selectableAnswers).toContain(answerKey.decision.action)
    expect(question.evenMoneyEligible).toBe(input.scenario === 'even-money')
    expect(context).toMatchObject({ dealerPeek: 'pending', sideDecision: 'pending' })
    expect(evidence.steps).toEqual([])
  }
  const forbidden = new Set(['physicalId', 'copy', 'dealerHoleCard', 'dealtCards', 'evidence', 'decision', 'reasonKey', 'caseId', 'preferredAction', 'fallbackAction', 'action'])
  function inspectPresentation(value: unknown): void {
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        expect(forbidden.has(key), `Leaked presentation field ${key}`).toBe(false)
        inspectPresentation(child)
      }
    }
  }
  inspectPresentation(question)
  expect(JSON.parse(JSON.stringify(result))).toEqual(result)
}

afterEach(() => vi.restoreAllMocks())

describe('generator v1 reproducibility', () => {
  it.each(scenarios)('reproduces %s by seed/index/settings independently of call order', (scenario) => {
    const input = request(scenario)
    const first = generated(input)
    generateQuestion(request('initial', 'unrelated', 99))
    expect(generateQuestion({ ...input, profile: structuredClone(input.profile), generatorVersion: QUESTION_GENERATOR_VERSION })).toEqual(first)
    verify(first, input)
  })

  it('locks question IDs, physical draw order, and reachability for representative v1 seeds', () => {
    const vectors = [
      { scenario: 'initial', id: 'question-generator-v1:initial:0:cecba9293e6124d5', attempt: 1, dealt: ['4:9:diamonds', '4:4:hearts', '3:10:hearts', '3:9:clubs'] },
      { scenario: 'continuing', id: 'question-generator-v1:continuing:0:fc31ea3546b6b549', attempt: 2, dealt: ['0:3:clubs', '3:9:clubs', '4:7:clubs', '3:10:diamonds', '4:6:clubs', '5:3:clubs'] },
      { scenario: 'split', id: 'question-generator-v1:split:0:18961329dc0fbafd', attempt: 45, dealt: ['2:2:diamonds', '1:10:clubs', '4:2:hearts', '0:Q:spades', '0:2:clubs', '5:8:spades'] },
      { scenario: 'insurance', id: 'question-generator-v1:insurance:0:02cb3ac5acb069c9', attempt: 1, dealt: ['5:A:spades', '2:A:spades', '4:9:spades', '0:J:hearts'] },
      { scenario: 'even-money', id: 'question-generator-v1:even-money:0:7dbec71a62a5fafe', attempt: 170, dealt: ['3:J:clubs', '2:A:hearts', '3:A:hearts', '5:8:hearts'] },
    ] as const
    for (const vector of vectors) {
      const result = generated(request(vector.scenario))
      expect(result.question.id).toBe(vector.id)
      expect(result.answerKey.evidence.attempt).toBe(vector.attempt)
      expect(result.answerKey.evidence.dealtCards.map((item) => item.physicalId)).toEqual(vector.dealt)
    }
  })

  it('varies visible questions across seeds and independent question indices', () => {
    const seeds = Array.from({ length: 20 }, (_, index) => generated(request('initial', `variation-${index}`)))
    const indices = Array.from({ length: 20 }, (_, index) => generated(request('initial', 'index-sequence', index)))
    for (const sample of [seeds, indices]) {
      expect(new Set(sample.map((item) => item.question.id)).size).toBe(20)
      expect(new Set(sample.map((item) => JSON.stringify([item.question.playerCards, item.question.dealer.upcard]))).size).toBeGreaterThan(15)
    }
    expect(generateQuestion(request('initial', 'index-sequence', 7))).toEqual(indices[7])
  })

  it('does not consume global randomness or let retry budgets alter a successful result', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Unexpected global randomness') })
    const first = generated({ ...request(), maxAttempts: 1 })
    const second = generated({ ...request(), maxAttempts: 4096 })
    random.mockRestore()
    expect(second).toEqual(first)
  })
})

describe('sampled reachability and physical constraints', () => {
  it.each(scenarios)('replays actual legal transitions and complete card allocation for %s', (scenario) => {
    for (let index = 0; index < 16; index += 1) {
      const input = { ...request(scenario, `sample-${index}`, index), maxAttempts: 4096 }
      verify(generated(input), input)
    }
  })

  it('reaches a soft-to-hard Ace transition through two actual legal hits', () => {
    const input = request('continuing', 'transition-2')
    const result = generated(input)
    verify(result, input)
    expect(result.question.playerCards.map((card) => card.rank)).toEqual(['A', '5', 'A', 'J'])
    expect(result.question.handSummary).toMatchObject({ total: 17, classification: 'hard', isSoft: false })
    const hits = result.answerKey.evidence.steps.filter((step) => step.kind === 'hit')
    expect(hits).toHaveLength(2)
    expect(evaluateHand(hits[1].before.hand).isSoft).toBe(true)
    expect(result.answerKey.input.hand.history).toEqual({ origin: 'initial-deal', actions: ['hit', 'hit'] })
  })

  it('reaches the four-hand limit through three real splits with queued siblings', () => {
    const input = request('split', 'cap-1066')
    const result = generated(input)
    verify(result, input)
    expect(result.answerKey.input.context.handsInRound).toBe(4)
    expect(result.answerKey.evidence.steps.filter((step) => step.kind === 'split')).toHaveLength(3)
    expect(result.answerKey.evidence.pendingSplitCards).toHaveLength(3)
    expect(result.question.handSummary.provenance).toMatchObject({ kind: 'split', history: { origin: 'split', actions: [] } })
    expect(result.question.selectableAnswers).toContain('double') // DAS survives actual splits.
    expect(result.question.selectableAnswers).not.toContain('split')
  })

  it('offers Insurance before peek even when the privately dealt dealer hand is Blackjack', () => {
    const input = request('insurance')
    const result = generated(input)
    verify(result, input)
    expect(result.question.dealer.upcard.rank).toBe('A')
    expect(result.answerKey.evidence.dealerHoleCard.card.rank).toBe('J')
    expect(result.question.phase).toBe('insurance')
    expect(result.answerKey.evidence.steps).toEqual([])
    expect(result.answerKey.input.context.dealerPeek).toBe('pending')
  })
})

describe('bounded and explicit failures', () => {
  it.each([
    { seed: 'reject-6', rejection: 'terminal:dealer-blackjack' },
    { seed: 'reject-33', rejection: 'terminal:natural-blackjack' },
    { seed: 'reject-84', rejection: 'terminal:split-aces-complete' },
  ])('rejects $rejection without emitting an ordinary question', ({ seed, rejection }) => {
    expect(generateQuestion({ ...request('split', seed), maxAttempts: 1 })).toEqual({
      kind: 'failure', generatorVersion: QUESTION_GENERATOR_VERSION, reason: 'attempt-limit', attempts: 1, lastRejection: rejection,
    })
  })

  it('exhausts a caller-specified attempt budget and reproduces that failure', () => {
    const input = { ...request('even-money'), maxAttempts: 1 }
    const result = generateQuestion(input)
    expect(result).toMatchObject({ kind: 'failure', reason: 'attempt-limit', attempts: 1 })
    expect(result).not.toHaveProperty('question')
    expect(generateQuestion(input)).toEqual(result)
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it('rejects unsupported versions, invalid bounds/categories, and unsupported profiles before attempting a round', () => {
    const cases: QuestionRequest[] = [
      { ...request(), generatorVersion: 'question-generator-v2' },
      { ...request(), questionIndex: -1 }, { ...request(), questionIndex: 1.5 },
      { ...request(), questionIndex: Number.MAX_SAFE_INTEGER + 1 },
      { ...request(), maxAttempts: 0 }, { ...request(), maxAttempts: 4097 },
      { ...request(), scenario: 'mixed' as QuestionScenario }, { ...request(), seed: 'x'.repeat(1025) },
      { ...request(), profile: { ...BASELINE_RULE_PROFILE, settings: { ...BASELINE_RULE_PROFILE.settings, doubleAfterSplit: false } } },
    ]
    for (const input of cases) {
      expect(generateQuestion(input)).toMatchObject({ kind: 'failure', attempts: 0 })
      expect(generateQuestion(input)).not.toHaveProperty('question')
    }
  })

  it.each<TrainingDecision>([
    { kind: 'terminal', phase: 'terminal', reason: 'bust', strategyVersion: 'baseline-s17-v1' },
    { kind: 'pending', phase: 'awaiting-split-card', reason: 'awaiting-split-card', strategyVersion: 'baseline-s17-v1' },
    { kind: 'invalid-input', reason: 'test-invalid', strategyVersion: 'baseline-s17-v1' },
    { kind: 'unsupported-profile', reason: 'profile-version', strategyVersion: 'baseline-s17-v1' },
    { kind: 'uncovered-case', reason: 'missing-reference', strategyVersion: 'baseline-s17-v1' },
  ])('never publishes an ordinary question from an upstream $kind state', (blocked) => {
    // Only the capability probe succeeds; simulate an unexpected downstream result.
    const probe = adapter.getTrainingDecision({ cards: [{ rank: '2', suit: 'hearts' }, { rank: '3', suit: 'diamonds' }], history: { origin: 'initial-deal', actions: [] } }, {
      dealerUpcard: { rank: '6', suit: 'spades' }, dealerPeek: 'not-required', sideDecision: 'not-applicable', handsInRound: 1, splitFromRank: null, surrendered: false,
    }, BASELINE_RULE_PROFILE)
    const spy = vi.spyOn(adapter, 'getTrainingDecision').mockReturnValueOnce(probe).mockReturnValue(blocked)
    const result = generateQuestion({ ...request(), maxAttempts: 3 })
    expect(result.kind).toBe('failure')
    expect(result).not.toHaveProperty('question')
    expect(spy.mock.calls.length).toBeLessThanOrEqual(4)
  })
})

it('does not mutate a frozen request/profile and keeps presentation separate from the answer key', () => {
  const input = { ...request('continuing', 'transition-2'), profile: structuredClone(BASELINE_RULE_PROFILE) }
  const before = structuredClone(input)
  Object.freeze(input.profile.settings.blackjackPayout)
  Object.freeze(input.profile.settings)
  Object.freeze(input.profile)
  Object.freeze(input)
  const result = generated(input)
  expect(input).toEqual(before)
  expect(result.question.playerCards).not.toBe(result.answerKey.input.hand.cards)
  expect(result.question.handSummary).not.toBe(result.answerKey.decision.handSummary)
  expect(result.question.handSummary.provenance.history.actions).not.toBe(result.answerKey.input.hand.history.actions)
  expect(generateQuestion(before)).toEqual(result)
})
