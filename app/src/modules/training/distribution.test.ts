import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Rank } from '../blackjack/card'
import type { Hand } from '../blackjack/hand'
import { BASELINE_RULE_PROFILE as profile } from '../blackjack/rule-profile'
import { getTrainingDecision } from './decision'
import { classifyStrategyCategory, DISTRIBUTION_VERSION, generateDistributedQuestion } from './distribution'
import type { DistributionRequest, StrategyCategory } from './distribution'
import * as generator from './question-generator'

afterEach(() => vi.restoreAllMocks())
const request = (questionIndex = 0, seed = 'distribution-acceptance'): DistributionRequest => ({ seed, questionIndex, distribution: 'balanced', profile })
function generated(input: DistributionRequest) {
  const result = generateDistributedQuestion(input)
  if (result.kind !== 'generated') throw new Error(JSON.stringify(result))
  return result
}
const counts = () => ({ hard: 0, soft: 0, pair: 0 })

describe('versioned distribution selection', () => {
  it.each([
    [['A', 'A'], 'pair'], [['8', '8'], 'pair'], [['10', 'J'], 'hard'],
    [['A', '7'], 'soft'], [['A', 'A', '9'], 'soft'], [['A', '6', 'K'], 'hard'],
  ] as const)('classifies %j as %s with exact-rank pair precedence', (ranks, category) => {
    const hand: Hand = { cards: ranks.map((rank) => ({ rank, suit: 'hearts' })), history: { origin: 'initial-deal', actions: [] } }
    expect(classifyStrategyCategory(hand)).toBe(category)
  })

  it.each([25, 50, 100])('balances %i actual questions, preserves approved answers, and keeps private evidence separate', (length) => {
    const categories = counts()
    const cases = new Set<string>()
    const dealers = new Set<number | string>()
    for (let index = 0; index < length; index += 1) {
      const result = generated(request(index))
      const { question, answerKey, distribution } = result
      const category = classifyStrategyCategory(answerKey.input.hand)
      categories[category] += 1
      expect(category).toBe(distribution.requestedCategory)
      expect(distribution.actualCategory).toBe(category)
      expect(distribution.actualProvenance).toBe(distribution.requestedProvenance)
      expect(answerKey.decision).toEqual(getTrainingDecision(answerKey.input.hand, answerKey.input.context, profile))
      expect(question.selectableAnswers).toContain(answerKey.decision.action)
      expect(question.dealer.holeCard).toBe('face-down')
      expect(question).not.toHaveProperty('answerKey')
      expect(question).not.toHaveProperty('evidence')
      if (answerKey.decision.kind !== 'action') throw new Error('Unexpected side question')
      cases.add(answerKey.decision.caseId)
      dealers.add(question.dealer.upcard.rank)
    }
    expect(Math.max(...Object.values(categories)) - Math.min(...Object.values(categories))).toBeLessThanOrEqual(1)
    expect(cases.size).toBeGreaterThanOrEqual(Math.floor(length / 2))
    expect(dealers.size).toBeGreaterThanOrEqual(8)
  })

  it('rotates complete blocks, seeds remainder positions, and uses reachable 80/15/5 provenance targets', () => {
    const provenance = { initial: 0, continuing: 0, split: 0 }
    const remainderCategories = new Set<StrategyCategory>()
    for (const seed of ['one', 'two', 'three', 'four', 'five', 'six']) {
      remainderCategories.add(generated(request(24, seed)).distribution.actualCategory)
    }
    expect(remainderCategories.size).toBe(3)
    for (let block = 0; block < 20; block += 1) {
      const categories = new Set<StrategyCategory>()
      for (let offset = 0; offset < 3; offset += 1) {
        const result = generated(request(block * 3 + offset))
        const { distribution, answerKey } = result
        categories.add(distribution.actualCategory)
        provenance[distribution.actualProvenance] += 1
        if (distribution.actualProvenance === 'continuing') {
          expect(distribution.actualCategory).not.toBe('pair')
          expect(answerKey.input.hand.history.actions).toContain('hit')
          expect(answerKey.evidence.steps.some((step) => step.kind === 'hit')).toBe(true)
        }
        if (distribution.actualProvenance === 'split') {
          expect(answerKey.input.hand.history.origin).toBe('split')
          expect(answerKey.evidence.steps.some((step) => step.kind === 'split')).toBe(true)
        }
      }
      expect([...categories].sort()).toEqual(['hard', 'pair', 'soft'])
    }
    expect(provenance).toEqual({ initial: 48, continuing: 9, split: 3 })
  })

  it('replays serializably without input mutation, including extended budgets and a maximum-length seed', () => {
    for (const distribution of ['balanced', 'realistic'] as const) {
      const input = { ...request(12, 's'.repeat(1024)), distribution, distributionVersion: DISTRIBUTION_VERSION }
      const before = structuredClone(input)
      const first = generated(input)
      expect(generated(JSON.parse(JSON.stringify(input)))).toEqual(first)
      expect(generated({ ...input, maxAttempts: 4096, maxCandidates: 256 })).toEqual(first)
      expect(JSON.parse(JSON.stringify(first))).toEqual(first)
      expect(input).toEqual(before)
      expect(first.distribution.id).toContain(`:${distribution}:`)
    }
  })

  it('returns a bounded category failure without substituting or losing the plan, and extends the same candidate prefix', () => {
    const input = request()
    const target = generated(input).distribution.requestedCategory
    let wrong = generator.generateQuestion({ seed: 'wrong', questionIndex: 0, scenario: 'initial', profile })
    for (let i = 1; wrong.kind !== 'generated' || classifyStrategyCategory(wrong.answerKey.input.hand) === target; i += 1) {
      wrong = generator.generateQuestion({ seed: 'wrong', questionIndex: i, scenario: 'initial', profile })
    }
    const spy = vi.spyOn(generator, 'generateQuestion').mockReturnValue(wrong)
    const first = generateDistributedQuestion(input)
    expect(first).toMatchObject({ kind: 'failure', source: 'category', reason: 'category-attempt-limit', candidatesExamined: 128, requestedCategory: target, seed: input.seed, questionIndex: 0 })
    const prefix = spy.mock.calls.map(([call]) => call.seed)
    spy.mockClear()
    const extended = generateDistributedQuestion({ ...input, maxAttempts: 4096, maxCandidates: 256 })
    expect(extended).toMatchObject({ kind: 'failure', source: 'category', reason: 'category-attempt-limit', candidatesExamined: 256, requestedCategory: target, seed: input.seed, questionIndex: 0 })
    expect(spy.mock.calls.slice(0, 128).map(([call]) => call.seed)).toEqual(prefix)
    expect(spy.mock.calls.every(([call]) => call.maxAttempts === 4096)).toBe(true)
  })

  it('preserves explicit generator failures and rejects unsupported versions, profiles and invalid budgets', () => {
    expect(generateDistributedQuestion({ ...request(), distributionVersion: 'future' })).toMatchObject({ kind: 'failure', reason: 'unsupported-distribution-version' })
    expect(generateDistributedQuestion({ ...request(), generatorVersion: 'future' })).toMatchObject({ kind: 'failure', reason: 'unsupported-generator-version', source: 'generator' })
    expect(generateDistributedQuestion({ ...request(), profile: { ...profile, version: 99 } })).toMatchObject({ kind: 'failure', reason: 'unsupported-profile' })
    for (const maxCandidates of [0, -1, 257, 1.5, Infinity]) expect(generateDistributedQuestion({ ...request(), maxCandidates })).toMatchObject({ kind: 'failure', reason: 'invalid-request' })
    expect(generateDistributedQuestion({ ...request(), seed: 's'.repeat(1025) })).toMatchObject({ kind: 'failure', reason: 'invalid-request' })
    const failure = { kind: 'failure', reason: 'attempt-limit', generatorVersion: generator.QUESTION_GENERATOR_VERSION, attempts: 2048, lastRejection: 'terminal' } as const
    vi.spyOn(generator, 'generateQuestion').mockReturnValue(failure)
    expect(generateDistributedQuestion(request())).toMatchObject({ ...failure, source: 'generator', candidatesExamined: 1 })
  })

  it('does not publish a side decision as an ordinary question', () => {
    const side = generator.generateQuestion({ seed: 'side', questionIndex: 0, scenario: 'insurance', profile })
    expect(side.kind).toBe('generated')
    vi.spyOn(generator, 'generateQuestion').mockReturnValue(side)
    expect(generateDistributedQuestion(request())).toMatchObject({ kind: 'failure', reason: 'engine-rejected' })
  })
})

/** Independent rank enumeration: 24 physical copies/rank, draw P/up/P/hole,
 * remove both naturals. No production value, hand, RNG, or selection helpers. */
function sixDeckReference() {
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
  const ten = new Set<string>(['10', 'J', 'Q', 'K'])
  const natural = (a: Rank, b: Rank) => (a === 'A' && ten.has(b)) || (b === 'A' && ten.has(a))
  const weights = counts()
  for (const first of ranks) for (const upcard of ranks) for (const second of ranks) for (const hole of ranks) {
    if (natural(first, second) || natural(upcard, hole)) continue
    const used: Partial<Record<Rank, number>> = {}
    let ways = 1
    for (const rank of [first, upcard, second, hole]) { ways *= 24 - (used[rank] ?? 0); used[rank] = (used[rank] ?? 0) + 1 }
    weights[first === second ? 'pair' : first === 'A' || second === 'A' ? 'soft' : 'hard'] += ways
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  return { weights, total }
}

describe('Realistic actionable initial deals', () => {
  it('uses the unchanged generator directly, including internal decline and actual clear-peek paths', () => {
    let sawAce = false
    let sawPeek = false
    for (let index = 0; index < 100; index += 1) {
      const input = { ...request(index), distribution: 'realistic' as const }
      const result = generated(input)
      const original = generator.generateQuestion({ seed: input.seed, questionIndex: index, scenario: 'initial', profile })
      expect({ kind: result.kind, question: result.question, answerKey: result.answerKey }).toEqual(original)
      expect(result.distribution).toMatchObject({ requestedCategory: null, actualProvenance: 'initial', candidatesExamined: 1 })
      expect(result.question.playerCards).toHaveLength(2)
      expect(result.answerKey.input.hand.history).toEqual({ origin: 'initial-deal', actions: [] })
      expect(result.answerKey.decision.kind).toBe('action')
      expect(result.answerKey.decision).toEqual(getTrainingDecision(result.answerKey.input.hand, result.answerKey.input.context, profile))
      if (result.question.dealer.upcard.rank === 'A') {
        sawAce = true
        expect(result.answerKey.evidence.steps).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'side-decision', action: 'decline-insurance' }), expect.objectContaining({ kind: 'peek', result: 'clear' })]))
      }
      sawPeek ||= result.answerKey.evidence.steps.some((step) => step.kind === 'peek')
    }
    expect(sawAce && sawPeek).toBe(true)
  })

  it('matches an independent conditioned six-deck reference rather than Balanced quotas', () => {
    const reference = sixDeckReference()
    expect(reference).toEqual({ weights: { hard: 6935182848, soft: 842102784, pair: 654745968 }, total: 8432031600 })
    const sampleSize = 12000
    const observed = counts()
    for (let index = 0; index < sampleSize; index += 1) {
      const result = generated({ ...request(index, 'realistic-frequency-reference'), distribution: 'realistic' })
      expect(result.distribution.actualProvenance).toBe('initial')
      expect(result.question.playerCards).toHaveLength(2)
      observed[result.distribution.actualCategory] += 1
    }
    // Hoeffding + union bound across three marginal proportions, alpha=1e-6.
    // A deterministic PRNG sanity check, not proof of independent randomness.
    const tolerance = Math.sqrt(Math.log(6 / 1e-6) / (2 * sampleSize))
    for (const category of ['hard', 'soft', 'pair'] as const) {
      expect(Math.abs(observed[category] / sampleSize - reference.weights[category] / reference.total)).toBeLessThan(tolerance)
    }
    expect(observed.hard / sampleSize).toBeGreaterThan(0.75)
    expect(observed.soft / sampleSize).toBeLessThan(0.15)
    expect(observed.pair / sampleSize).toBeLessThan(0.15)
    console.info('Realistic six-deck reference check', { sampleSize, observed, tolerance })
  }, 20000)
})
