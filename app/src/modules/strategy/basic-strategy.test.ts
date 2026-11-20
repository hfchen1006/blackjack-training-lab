import { describe, expect, it } from 'vitest'
import type { Rank } from '../blackjack/card'
import type { Hand, HandAction } from '../blackjack/hand'
import { evaluatePlayerDecision } from '../blackjack/player-rules'
import type { PlayerDecisionContext } from '../blackjack/player-rules'
import { BASELINE_RULE_PROFILE } from '../blackjack/rule-profile'
import type { RuleProfile, RuleSettings } from '../blackjack/rule-profile'
import { getBasicStrategy } from './basic-strategy'
import type { ActionRecommendation, StrategyResult } from './basic-strategy'
import { S17_DAS_REFERENCE_V1 as reference } from './__fixtures__/s17-das-v1'

function checkedStrategy(input: Hand, ctx: PlayerDecisionContext, profile: RuleProfile): StrategyResult {
  const result = getBasicStrategy(input, ctx, profile)
  if (result.kind === 'action') {
    const eligibility = evaluatePlayerDecision(input, ctx, profile)
    if (eligibility.phase !== 'player') throw new Error('Recommendation outside the player phase')
    expect(eligibility.actions).toContain(result.action)
    expect(result.legalActions).toEqual(eligibility.actions)
  }
  return result
}

function hand(ranks: readonly Rank[], actions: readonly HandAction[] = [], origin: 'initial-deal' | 'split' = 'initial-deal'): Hand {
  return { cards: ranks.map((rank) => ({ rank, suit: 'hearts' })), history: { origin, actions } }
}

function context(upcard: Rank = '6', overrides: Partial<PlayerDecisionContext> = {}): PlayerDecisionContext {
  return {
    dealerUpcard: { rank: upcard, suit: 'spades' },
    dealerPeek: ['A', '10', 'J', 'Q', 'K'].includes(upcard) ? 'clear' : 'not-required',
    sideDecision: upcard === 'A' ? 'declined' : 'not-applicable',
    handsInRound: 1, splitFromRank: null, surrendered: false, ...overrides,
  }
}

// Independent input representatives, not production selection/evaluation helpers.
const hardHands: Record<number, { initial: Rank[]; continuing?: Rank[] }> = {
  4: { initial: ['2', '2'] },
  5: { initial: ['2', '3'] },
  6: { initial: ['2', '4'], continuing: ['2', '2', '2'] },
  7: { initial: ['2', '5'], continuing: ['2', '2', '3'] },
  8: { initial: ['2', '6'], continuing: ['2', '3', '3'] },
  9: { initial: ['2', '7'], continuing: ['2', '3', '4'] },
  10: { initial: ['2', '8'], continuing: ['2', '3', '5'] },
  11: { initial: ['2', '9'], continuing: ['2', '4', '5'] },
  12: { initial: ['2', '10'], continuing: ['2', '5', '5'] },
  13: { initial: ['3', '10'], continuing: ['2', '5', '6'] },
  14: { initial: ['4', '10'], continuing: ['2', '6', '6'] },
  15: { initial: ['5', '10'], continuing: ['2', '6', '7'] },
  16: { initial: ['6', '10'], continuing: ['2', '7', '7'] },
  17: { initial: ['7', '10'], continuing: ['2', '7', '8'] },
  18: { initial: ['8', '10'], continuing: ['2', '8', '8'] },
  19: { initial: ['9', '10'], continuing: ['2', '8', '9'] },
  20: { initial: ['10', 'J'], continuing: ['2', '9', '9'] },
}

const softHands: Record<number, { initial: Rank[]; continuing: Rank[] }> = {
  13: { initial: ['A', '2'], continuing: ['A', 'A', 'A'] },
  14: { initial: ['A', '3'], continuing: ['A', '2', 'A'] },
  15: { initial: ['A', '4'], continuing: ['A', '3', 'A'] },
  16: { initial: ['A', '5'], continuing: ['A', '4', 'A'] },
  17: { initial: ['A', '6'], continuing: ['A', '5', 'A'] },
  18: { initial: ['A', '7'], continuing: ['A', '6', 'A'] },
  19: { initial: ['A', '8'], continuing: ['A', '7', 'A'] },
  20: { initial: ['A', '9'], continuing: ['A', '8', 'A'] },
}

// Oracle decoding uses only the independently transcribed published fixture.
function oracle(code: string): { preferred: 'hit' | 'stand' | 'double'; fallback: 'hit' | 'stand' | null } {
  switch (code) {
    case 'H': return { preferred: 'hit', fallback: null }
    case 'S': return { preferred: 'stand', fallback: null }
    case 'D': return { preferred: 'double', fallback: 'hit' }
    case 'd': return { preferred: 'double', fallback: 'stand' }
    default: throw new Error(`Unknown reference token: ${code}`)
  }
}

function hardCode(total: number, column: number): string {
  return reference.hard[total as keyof typeof reference.hard][column]
}

function actionResult(result: StrategyResult, label = ''): ActionRecommendation {
  expect(result.kind, label).toBe('action')
  if (result.kind !== 'action') throw new Error(`${label}: ${JSON.stringify(result)}`)
  expect(result.legalActions, label).toContain(result.action)
  return result
}

describe('independent S17/DAS reference fixture v1', () => {
  it('contains every applicable published row and ten dealer columns', () => {
    expect(reference.version).toBe('s17-das-reference-v1')
    expect(Object.keys(reference.hard).map(Number)).toEqual(Array.from({ length: 17 }, (_, i) => i + 4))
    expect(Object.keys(reference.soft).map(Number)).toEqual(Array.from({ length: 8 }, (_, i) => i + 13))
    expect(Object.keys(reference.pairs).sort()).toEqual(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'].sort())
    expect(reference.dealerUpcards).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'])
    for (const row of [...Object.values(reference.hard), ...Object.values(reference.soft)]) {
      expect(row).toMatch(/^[HSDd]{10}$/)
    }
    for (const row of Object.values(reference.pairs)) expect(row).toMatch(/^[YN]{10}$/)
  })

  it.each(Object.entries(reference.hard))('matches every dealer cell for hard %s', (key, row) => {
    const total = Number(key)
    reference.dealerUpcards.forEach((dealer, column) => {
      // Hard 4 exists only as 2,2; use a valid capped split child to access its total fallback.
      const input = hand(hardHands[total].initial, [], total === 4 ? 'split' : 'initial-deal')
      const ctx = context(dealer, total === 4 ? { handsInRound: 4, splitFromRank: '2' } : {})
      const result = actionResult(checkedStrategy(input, ctx, BASELINE_RULE_PROFILE), `hard ${total}/${dealer}`)
      const expected = oracle(row[column])
      expect(result.action).toBe(expected.preferred)
      if (total !== 4) {
        expect(result.preferredAction).toBe(expected.preferred)
        expect(result.preferredActionLegal).toBe(true)
        expect(result.fallbackAction).toBe(expected.fallback)
        expect(result.usedFallback).toBe(false)
        expect(result.caseId).toBe(`baseline-s17-v1.hard.${total}.vs.${dealer}`)
      }
    })
  })

  it.each(Object.entries(reference.soft))('matches every dealer cell for soft %s', (key, row) => {
    const total = Number(key)
    reference.dealerUpcards.forEach((dealer, column) => {
      const result = actionResult(checkedStrategy(hand(softHands[total].initial), context(dealer), BASELINE_RULE_PROFILE), `soft ${total}/${dealer}`)
      const expected = oracle(row[column])
      expect(result).toMatchObject({
        action: expected.preferred, preferredAction: expected.preferred, preferredActionLegal: true,
        fallbackAction: expected.fallback, usedFallback: false,
        caseId: `baseline-s17-v1.soft.${total}.vs.${dealer}`,
      })
    })
  })

  it.each(Object.entries(reference.pairs))('matches every dealer cell for pair %s', (key, row) => {
    const rank = key as keyof typeof reference.pairs
    reference.dealerUpcards.forEach((dealer, column) => {
      const result = actionResult(checkedStrategy(hand([rank, rank]), context(dealer), BASELINE_RULE_PROFILE), `pair ${rank}/${dealer}`)
      const expected = row[column] === 'Y' ? 'split' :
        oracle(hardCode(reference.pairFallbackTotals[rank as keyof typeof reference.pairFallbackTotals], column)).preferred
      expect(result).toMatchObject({
        action: expected, preferredAction: expected, preferredActionLegal: true, usedFallback: false,
        caseId: `baseline-s17-v1.pair.${rank}.vs.${dealer}`,
      })
    })
  })
})

describe('documented legality fallbacks', () => {
  const continuingHardRows = Object.entries(reference.hard).filter(([key]) => hardHands[Number(key)].continuing)
  it.each(continuingHardRows)('matches hard %s with Double unavailable after Hit', (key, row) => {
    const total = Number(key)
    reference.dealerUpcards.forEach((dealer, column) => {
      const input = hand(hardHands[total].continuing!, ['hit'])
      const result = actionResult(checkedStrategy(input, context(dealer), BASELINE_RULE_PROFILE))
      const expected = oracle(row[column])
      expect(result).toMatchObject({
        preferredAction: expected.preferred,
        preferredActionLegal: expected.preferred !== 'double',
        action: expected.fallback ?? expected.preferred,
        fallbackAction: expected.fallback,
        usedFallback: expected.preferred === 'double',
      })
    })
  })

  it.each(Object.entries(reference.soft))('matches soft %s with Double unavailable after Hit', (key, row) => {
    reference.dealerUpcards.forEach((dealer, column) => {
      const result = actionResult(checkedStrategy(hand(softHands[Number(key)].continuing, ['hit']), context(dealer), BASELINE_RULE_PROFILE))
      const expected = oracle(row[column])
      expect(result).toMatchObject({
        preferredAction: expected.preferred,
        preferredActionLegal: expected.preferred !== 'double',
        action: expected.fallback ?? expected.preferred,
        fallbackAction: expected.fallback,
        usedFallback: expected.preferred === 'double',
      })
    })
  })

  it.each(Object.entries(reference.pairs))('uses published capped-pair handling for %s', (key, row) => {
    const rank = key as keyof typeof reference.pairs
    reference.dealerUpcards.forEach((dealer, column) => {
      const input = hand([rank, rank], [], 'split')
      const ctx = context(dealer, { handsInRound: 4, splitFromRank: rank })
      if (rank === 'A') {
        expect(checkedStrategy(input, ctx, BASELINE_RULE_PROFILE)).toMatchObject({
          kind: 'no-decision', phase: 'terminal', reason: 'split-aces-complete',
        })
        return
      }
      const total = reference.pairFallbackTotals[rank]
      const totalExpected = oracle(hardCode(total, column))
      const result = actionResult(checkedStrategy(input, ctx, BASELINE_RULE_PROFILE), `capped ${rank}/${dealer}`)
      expect(result).toMatchObject({
        action: totalExpected.preferred,
        preferredAction: row[column] === 'Y' ? 'split' : totalExpected.preferred,
        preferredActionLegal: row[column] !== 'Y', usedFallback: row[column] === 'Y',
      })
      if (row[column] === 'Y') {
        expect(result.fallbackAction).toBe(totalExpected.preferred)
        expect(result.fallbackCaseId).toBe(`baseline-s17-v1.hard.${total}.vs.${dealer}`)
      }
    })
  })
})

describe('sensitive boundaries and provenance', () => {
  it.each<{ ranks: Rank[]; dealer: Rank; preferred: string; fallback: string | null }>([
    { ranks: ['2', '9'], dealer: 'A', preferred: 'hit', fallback: null },
    { ranks: ['2', '9'], dealer: '6', preferred: 'double', fallback: 'hit' },
    { ranks: ['2', '10'], dealer: '2', preferred: 'hit', fallback: null },
    { ranks: ['2', '10'], dealer: '3', preferred: 'hit', fallback: null },
    { ranks: ['2', '10'], dealer: '4', preferred: 'stand', fallback: null },
    { ranks: ['A', '7'], dealer: '3', preferred: 'double', fallback: 'stand' },
    { ranks: ['A', '7'], dealer: '4', preferred: 'double', fallback: 'stand' },
    { ranks: ['A', '7'], dealer: '6', preferred: 'double', fallback: 'stand' },
    { ranks: ['A', '7'], dealer: '9', preferred: 'hit', fallback: null },
    { ranks: ['10', '6'], dealer: '10', preferred: 'hit', fallback: null },
    { ranks: ['8', '8'], dealer: 'A', preferred: 'split', fallback: 'hit' },
    { ranks: ['4', '4'], dealer: '5', preferred: 'split', fallback: 'hit' },
    { ranks: ['4', '4'], dealer: '6', preferred: 'split', fallback: 'hit' },
    { ranks: ['2', '2'], dealer: '2', preferred: 'split', fallback: 'hit' },
    { ranks: ['3', '3'], dealer: '3', preferred: 'split', fallback: 'hit' },
    { ranks: ['6', '6'], dealer: '2', preferred: 'split', fallback: 'hit' },
  ])('retains verified behavior for $ranks versus $dealer', ({ ranks, dealer, preferred, fallback }) => {
    expect(actionResult(checkedStrategy(hand(ranks), context(dealer), BASELINE_RULE_PROFILE)))
      .toMatchObject({ action: preferred, preferredAction: preferred, fallbackAction: fallback })
  })

  it('reclassifies a soft hand as hard after a Hit instead of reusing the old recommendation', () => {
    expect(actionResult(checkedStrategy(hand(['A', '6']), context('6'), BASELINE_RULE_PROFILE)))
      .toMatchObject({ action: 'double', caseId: 'baseline-s17-v1.soft.17.vs.6' })
    expect(actionResult(checkedStrategy(hand(['A', '6', 'K'], ['hit']), context('6'), BASELINE_RULE_PROFILE)))
      .toMatchObject({ action: 'stand', caseId: 'baseline-s17-v1.hard.17.vs.6', usedFallback: false })
  })

  it('retains Double after a non-Ace split, then uses the documented Stand fallback after a hit', () => {
    const splitCtx = context('4', { handsInRound: 2, splitFromRank: '6' })
    expect(actionResult(checkedStrategy(hand(['6', 'A'], [], 'split'), splitCtx, BASELINE_RULE_PROFILE)))
      .toMatchObject({ action: 'double', caseId: 'baseline-s17-v1.soft.17.vs.4' })
    expect(actionResult(checkedStrategy(hand(['6', 'A', 'A'], ['hit'], 'split'), splitCtx, BASELINE_RULE_PROFILE)))
      .toMatchObject({ action: 'stand', preferredAction: 'double', usedFallback: true, caseId: 'baseline-s17-v1.soft.18.vs.4' })
  })

  it('treats mixed ten-value ranks as hard 20 and equal ranks as the never-split ten-pair row', () => {
    const ranks = ['10', 'J', 'Q', 'K'] as const
    for (const first of ranks) for (const second of ranks) {
      const result = actionResult(checkedStrategy(hand([first, second]), context(), BASELINE_RULE_PROFILE))
      expect(result.action).toBe('stand')
      expect(result.preferredAction).toBe('stand')
      expect(result.caseId).toBe(first === second ? `baseline-s17-v1.pair.${first}.vs.6` : 'baseline-s17-v1.hard.20.vs.6')
    }
  })

  it('canonicalizes dealer J/Q/K to the ten column, including case identifiers', () => {
    for (const input of [hand(['A', '7']), hand(['8', '8']), hand(['2', '9'])]) {
      const expected = checkedStrategy(input, context('10'), BASELINE_RULE_PROFILE)
      for (const upcard of ['J', 'Q', 'K'] as const) {
        expect(checkedStrategy(input, context(upcard), BASELINE_RULE_PROFILE)).toEqual(expected)
      }
    }
  })
})

describe('side decisions and blocked states', () => {
  it.each([
    { ranks: ['8', '3'] as Rank[], evenMoney: 'not-applicable' },
    { ranks: ['A', 'K'] as Rank[], evenMoney: 'decline' },
  ])('declines the side offer for $ranks while keeping Even Money guidance explicit', ({ ranks, evenMoney }) => {
    const input = hand(ranks)
    const ctx = context('A', { dealerPeek: 'pending', sideDecision: 'pending' })
    const result = checkedStrategy(input, ctx, BASELINE_RULE_PROFILE)
    expect(result).toMatchObject({
      kind: 'side-decision', action: 'decline-insurance', insurance: 'decline', evenMoney,
      usedFallback: false, reasonKey: 'strategy.decline-side-decisions',
      caseId: `baseline-s17-v1.side.${evenMoney === 'decline' ? 'even-money' : 'insurance'}`,
    })
    const eligibility = evaluatePlayerDecision(input, ctx, BASELINE_RULE_PROFILE)
    if (eligibility.phase !== 'insurance' || result.kind !== 'side-decision') throw new Error('Expected side phase')
    expect(eligibility.sideActions).toContain(result.action)
    expect(result.legalSideActions).toContain('take-insurance') // Eligibility is not a recommendation.
  })

  it.each<{
    name: string; input: Hand; ctx?: PlayerDecisionContext; phase: string
  }>([
    { name: 'natural', input: hand(['A', 'K']), phase: 'terminal' },
    { name: 'bust', input: hand(['10', '9', '5'], ['hit']), phase: 'terminal' },
    { name: '21', input: hand(['7', '7', '7'], ['hit']), phase: 'terminal' },
    { name: 'stood', input: hand(['8', '3'], ['stand']), phase: 'terminal' },
    { name: 'doubled', input: hand(['5', '6', '2'], ['double']), phase: 'terminal' },
    { name: 'split parent', input: hand(['8', '8'], ['split']), ctx: context('6', { handsInRound: 2 }), phase: 'terminal' },
    { name: 'split Aces', input: hand(['A', '3'], [], 'split'), ctx: context('6', { handsInRound: 2, splitFromRank: 'A' }), phase: 'terminal' },
    { name: 'split replacement pending', input: hand(['A'], [], 'split'), ctx: context('6', { handsInRound: 2, splitFromRank: 'A' }), phase: 'awaiting-split-card' },
    { name: 'peek pending', input: hand(['8', '3']), ctx: context('10', { dealerPeek: 'pending' }), phase: 'dealer-peek' },
    { name: 'dealer Blackjack', input: hand(['8', '3']), ctx: context('A', { dealerPeek: 'blackjack' }), phase: 'terminal' },
    { name: 'Even Money already accepted', input: hand(['A', 'K']), ctx: context('A', { dealerPeek: 'pending', sideDecision: 'even-money-taken' }), phase: 'terminal' },
  ])('returns no recommendation for $name', ({ input, ctx, phase }) => {
    const result = checkedStrategy(input, ctx ?? context(), BASELINE_RULE_PROFILE)
    expect(result).toMatchObject({ kind: 'no-decision', phase })
    expect(result).not.toHaveProperty('action')
  })

  it.each<{
    name: string; input: Hand; ctx?: PlayerDecisionContext
  }>([
    { name: 'empty hand', input: hand([]) },
    { name: 'unknown rank', input: hand(['1' as Rank, '3']) },
    { name: 'unrecorded draw', input: hand(['2', '3', '5']) },
    { name: 'Hit without a draw', input: hand(['2', '3'], ['hit']) },
    { name: 'play before peek', input: hand(['2', '3', '5'], ['hit']), ctx: context('10', { dealerPeek: 'pending' }) },
    { name: 'Insurance still pending after peek', input: hand(['8', '3']), ctx: context('A', { sideDecision: 'pending' }) },
    { name: 'inconsistent split provenance', input: hand(['8', '3'], [], 'split') },
  ])('returns explicit invalid input for $name', ({ input, ctx }) => {
    const result = checkedStrategy(input, ctx ?? context(), BASELINE_RULE_PROFILE)
    expect(result.kind).toBe('invalid-input')
    expect(result).not.toHaveProperty('action')
  })
})

describe('supported profile and determinism', () => {
  it('accepts equal settings/version in a distinct profile object', () => {
    const copy = structuredClone(BASELINE_RULE_PROFILE)
    expect(copy).not.toBe(BASELINE_RULE_PROFILE)
    expect(checkedStrategy(hand(['8', '3']), context(), copy)).toEqual(
      checkedStrategy(hand(['8', '3']), context(), BASELINE_RULE_PROFILE),
    )
  })

  it.each<[string, Partial<RuleSettings>]>([
    ['different deck count', { decks: 2 }], ['H17', { dealerSoft17: 'H17' }],
    ['no DAS', { doubleAfterSplit: false }], ['restricted Double', { doubleRestriction: 'hard-10-11' }],
    ['surrender', { surrender: 'late' }], ['no peek', { dealerBlackjackCheck: 'no-peek' }],
    ['different payout', { blackjackPayout: { numerator: 6, denominator: 5 } }],
    ['different split cap', { maxSplitHands: 3 }], ['resplit Aces', { resplitAces: true }],
    ['hit split Aces', { hitSplitAces: true }],
  ])('rejects unsupported %s before offering a recommendation', (_name, overrides) => {
    const profile: RuleProfile = { ...BASELINE_RULE_PROFILE, settings: { ...BASELINE_RULE_PROFILE.settings, ...overrides } }
    expect(checkedStrategy(hand(['8', '3']), context(), profile))
      .toMatchObject({ kind: 'unsupported-profile', reason: 'profile-settings' })
  })

  it('rejects unknown profile IDs, versions, and extra rule-setting fields', () => {
    for (const profile of [
      { ...BASELINE_RULE_PROFILE, id: 'unverified' },
      { ...BASELINE_RULE_PROFILE, version: 2 },
      { ...BASELINE_RULE_PROFILE, settings: { ...BASELINE_RULE_PROFILE.settings, unverifiedRule: true } },
    ]) {
      const result = checkedStrategy(hand(['8', '3']), context(), profile)
      expect(result.kind).toBe('unsupported-profile')
      expect(result).not.toHaveProperty('action')
    }
  })

  it('returns identical results for repeated and copied inputs without mutating frozen inputs', () => {
    const input = hand(['A', '6', 'A'], ['hit'])
    const ctx = context('4')
    const before = structuredClone({ input, ctx })
    input.cards.forEach(Object.freeze)
    Object.freeze(input.cards)
    Object.freeze(input.history.actions)
    Object.freeze(input.history)
    Object.freeze(input)
    Object.freeze(ctx.dealerUpcard)
    Object.freeze(ctx)
    const result = checkedStrategy(input, ctx, BASELINE_RULE_PROFILE)
    expect(result).toMatchObject({ kind: 'action', action: 'stand', preferredAction: 'double', usedFallback: true })
    expect(checkedStrategy(input, ctx, BASELINE_RULE_PROFILE)).toEqual(result)
    expect(checkedStrategy(before.input, before.ctx, structuredClone(BASELINE_RULE_PROFILE))).toEqual(result)
    expect({ input, ctx }).toEqual(before)
  })
})
