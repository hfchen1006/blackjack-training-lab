import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Rank } from '../blackjack/card'
import type { Hand, HandAction } from '../blackjack/hand'
import { evaluatePlayerDecision } from '../blackjack/player-rules'
import type { PlayerDecisionContext } from '../blackjack/player-rules'
import { BASELINE_RULE_PROFILE } from '../blackjack/rule-profile'
import type { RuleProfile } from '../blackjack/rule-profile'
import * as strategyEngine from '../strategy/basic-strategy'
import { getTrainingDecision } from './decision'

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

afterEach(() => vi.restoreAllMocks())

describe('actionable training integration', () => {
  it.each<{
    name: string; input: Hand; ctx: PlayerDecisionContext; total: number;
    classification: 'hard' | 'soft'; provenance: 'initial' | 'continuing' | 'split';
    action: string; usedFallback: boolean
  }>([
    { name: 'initial hard', input: hand(['5', '6']), ctx: context(), total: 11, classification: 'hard', provenance: 'initial', action: 'double', usedFallback: false },
    { name: 'initial soft', input: hand(['A', '7']), ctx: context('4'), total: 18, classification: 'soft', provenance: 'initial', action: 'double', usedFallback: false },
    { name: 'initial pair', input: hand(['8', '8']), ctx: context('A'), total: 16, classification: 'hard', provenance: 'initial', action: 'split', usedFallback: false },
    { name: 'continuing hard Double fallback', input: hand(['2', '4', '5'], ['hit']), ctx: context(), total: 11, classification: 'hard', provenance: 'continuing', action: 'hit', usedFallback: true },
    { name: 'continuing soft Double fallback', input: hand(['A', '6', 'A'], ['hit']), ctx: context('4'), total: 18, classification: 'soft', provenance: 'continuing', action: 'stand', usedFallback: true },
    { name: 'split hand with DAS', input: hand(['6', 'A'], [], 'split'), ctx: context('4', { handsInRound: 2, splitFromRank: '6' }), total: 17, classification: 'soft', provenance: 'split', action: 'double', usedFallback: false },
    { name: 'continuing split hand', input: hand(['6', 'A', 'A'], ['hit'], 'split'), ctx: context('4', { handsInRound: 2, splitFromRank: '6' }), total: 18, classification: 'soft', provenance: 'split', action: 'stand', usedFallback: true },
    { name: 'capped split-pair fallback', input: hand(['6', '6'], [], 'split'), ctx: context('4', { handsInRound: 4, splitFromRank: '6' }), total: 12, classification: 'hard', provenance: 'split', action: 'stand', usedFallback: true },
  ])('integrates $name without changing strategy metadata', ({ input, ctx, total, classification, provenance, action, usedFallback }) => {
    const expected = strategyEngine.getBasicStrategy(input, ctx, BASELINE_RULE_PROFILE)
    const eligibility = evaluatePlayerDecision(input, ctx, BASELINE_RULE_PROFILE)
    const result = getTrainingDecision(input, ctx, BASELINE_RULE_PROFILE)
    if (result.kind !== 'action' || eligibility.phase !== 'player') throw new Error('Expected an ordinary decision')
    const { phase, handSummary, ...forwarded } = result
    expect(forwarded).toEqual(expected) // Includes exact case/version, reason, preferred action, and every fallback field.
    expect(phase).toBe('player')
    expect(result.action).toBe(action)
    expect(result.usedFallback).toBe(usedFallback)
    expect(eligibility.actions).toContain(result.action)
    expect(result.legalActions).toEqual(eligibility.actions)
    expect(result).not.toHaveProperty('legalSideActions')
    expect(handSummary).toMatchObject({ total, classification, provenance: { kind: provenance, history: input.history } })
    expect(handSummary.isSoft).toBe(classification === 'soft')
    expect(handSummary.cardCount).toBe(input.cards.length)
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it.each([
    { input: hand(['8', '3']), evenMoneyEligible: false },
    { input: hand(['A', 'K']), evenMoneyEligible: true },
  ])('keeps the side phase independent (Even Money eligible: $evenMoneyEligible)', ({ input, evenMoneyEligible }) => {
    const ctx = context('A', { dealerPeek: 'pending', sideDecision: 'pending' })
    const expected = strategyEngine.getBasicStrategy(input, ctx, BASELINE_RULE_PROFILE)
    const eligibility = evaluatePlayerDecision(input, ctx, BASELINE_RULE_PROFILE)
    const result = getTrainingDecision(input, ctx, BASELINE_RULE_PROFILE)
    if (result.kind !== 'side-decision' || eligibility.phase !== 'insurance') throw new Error('Expected a side decision')
    const { phase, handSummary, evenMoneyEligible: eligible, ...forwarded } = result
    expect(forwarded).toEqual(expected)
    expect(phase).toBe('insurance')
    expect(eligible).toBe(evenMoneyEligible)
    expect(result.action).toBe('decline-insurance')
    expect(result.evenMoney).toBe(evenMoneyEligible ? 'decline' : 'not-applicable')
    expect(eligibility.sideActions).toContain(result.action)
    expect(result.legalSideActions).toEqual(eligibility.sideActions)
    expect(result).not.toHaveProperty('legalActions')
    expect(handSummary.provenance).toEqual({ kind: 'initial', history: input.history })
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it('preserves the Insurance -> peek pending -> player decision path without advancing state', () => {
    const input = hand(['8', '3'])
    const insurance = context('A', { dealerPeek: 'pending', sideDecision: 'pending' })
    const peek = { ...insurance, sideDecision: 'declined' } as const
    const cleared = { ...peek, dealerPeek: 'clear' } as const
    expect(getTrainingDecision(input, insurance, BASELINE_RULE_PROFILE)).toMatchObject({ kind: 'side-decision', phase: 'insurance' })
    expect(getTrainingDecision(input, peek, BASELINE_RULE_PROFILE)).toMatchObject({ kind: 'pending', phase: 'dealer-peek' })
    expect(getTrainingDecision(input, cleared, BASELINE_RULE_PROFILE)).toMatchObject({ kind: 'action', phase: 'player' })
    expect(insurance).toMatchObject({ dealerPeek: 'pending', sideDecision: 'pending' })
  })
})

describe('non-actionable outcomes', () => {
  it.each<{
    name: string; input: Hand; ctx?: PlayerDecisionContext;
    kind: 'terminal' | 'pending'; phase: 'terminal' | 'dealer-peek' | 'awaiting-split-card'
  }>([
    { name: 'split Ace completion', input: hand(['A', '3'], [], 'split'), ctx: context('6', { handsInRound: 2, splitFromRank: 'A' }), kind: 'terminal', phase: 'terminal' },
    { name: 'natural Blackjack', input: hand(['A', 'K']), kind: 'terminal', phase: 'terminal' },
    { name: 'bust', input: hand(['10', '9', '5'], ['hit']), kind: 'terminal', phase: 'terminal' },
    { name: 'already stood two-card hand', input: hand(['8', '3'], ['stand']), kind: 'terminal', phase: 'terminal' },
    { name: 'mandatory split replacement', input: hand(['A'], [], 'split'), ctx: context('6', { handsInRound: 2, splitFromRank: 'A' }), kind: 'pending', phase: 'awaiting-split-card' },
    { name: 'dealer peek', input: hand(['8', '3']), ctx: context('10', { dealerPeek: 'pending' }), kind: 'pending', phase: 'dealer-peek' },
    { name: 'dealer Blackjack', input: hand(['8', '3']), ctx: context('A', { dealerPeek: 'blackjack' }), kind: 'terminal', phase: 'terminal' },
    { name: 'accepted Even Money', input: hand(['A', 'K']), ctx: context('A', { dealerPeek: 'pending', sideDecision: 'even-money-taken' }), kind: 'terminal', phase: 'terminal' },
  ])('preserves $name without producing a question', ({ input, ctx = context(), kind, phase }) => {
    const expected = strategyEngine.getBasicStrategy(input, ctx, BASELINE_RULE_PROFILE)
    const result = getTrainingDecision(input, ctx, BASELINE_RULE_PROFILE)
    expect(result).toEqual({ ...expected, kind, phase })
    expect(result).not.toHaveProperty('action')
    expect(result).not.toHaveProperty('handSummary')
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it.each([
    { name: 'unrecorded draw', input: hand(['2', '3', '5']) },
    { name: 'two cards with a recorded Hit', input: hand(['8', '3'], ['hit']) },
    { name: 'missing split context', input: hand(['8', '3'], [], 'split') },
  ])('preserves invalid $name instead of classifying it as initial', ({ input }) => {
    const expected = strategyEngine.getBasicStrategy(input, context(), BASELINE_RULE_PROFILE)
    const result = getTrainingDecision(input, context(), BASELINE_RULE_PROFILE)
    expect(result).toEqual(expected)
    expect(result.kind).toBe('invalid-input')
    expect(result).not.toHaveProperty('action')
    expect(result).not.toHaveProperty('handSummary')
  })

  it('preserves unsupported-profile priority, including when the hand is also invalid', () => {
    const profiles: RuleProfile[] = [
      { ...BASELINE_RULE_PROFILE, settings: { ...BASELINE_RULE_PROFILE.settings, doubleAfterSplit: false } },
      { ...BASELINE_RULE_PROFILE, version: 2 },
    ]
    for (const profile of profiles) {
      const input = hand([])
      const result = getTrainingDecision(input, context(), profile)
      expect(result).toEqual(strategyEngine.getBasicStrategy(input, context(), profile))
      expect(result.kind).toBe('unsupported-profile')
      expect(result).not.toHaveProperty('action')
    }
  })

  it('passes through an upstream uncovered case without inventing a reachable baseline case', () => {
    // The approved baseline currently has no naturally reachable uncovered case.
    const uncovered = { kind: 'uncovered-case', reason: 'no-verified-legal-fallback', strategyVersion: strategyEngine.STRATEGY_VERSION } as const
    vi.spyOn(strategyEngine, 'getBasicStrategy').mockReturnValueOnce(uncovered)
    expect(getTrainingDecision(hand(['8', '3']), context(), BASELINE_RULE_PROFILE)).toEqual(uncovered)
  })

  it('fails closed if an upstream recommendation ever contradicts actual eligibility', () => {
    const input = hand(['8', '3'])
    const original = strategyEngine.getBasicStrategy(input, context(), BASELINE_RULE_PROFILE)
    if (original.kind !== 'action') throw new Error('Expected ordinary strategy')
    vi.spyOn(strategyEngine, 'getBasicStrategy').mockReturnValueOnce({ ...original, action: 'split' })
    expect(getTrainingDecision(input, context(), BASELINE_RULE_PROFILE)).toEqual({
      kind: 'invalid-input', reason: 'integration.rule-strategy-mismatch', strategyVersion: original.strategyVersion,
    })
  })
})

it('is deterministic and leaves supplied hand, context, and profile unchanged', () => {
  const input = hand(['A', '6', 'A'], ['hit'])
  const ctx = context('4')
  const profile = structuredClone(BASELINE_RULE_PROFILE)
  const before = structuredClone({ input, ctx, profile })
  input.cards.forEach(Object.freeze)
  Object.freeze(input.cards)
  Object.freeze(input.history.actions)
  Object.freeze(input.history)
  Object.freeze(input)
  Object.freeze(ctx.dealerUpcard)
  Object.freeze(ctx)
  Object.freeze(profile.settings.blackjackPayout)
  Object.freeze(profile.settings)
  Object.freeze(profile)
  const first = getTrainingDecision(input, ctx, profile)
  expect(getTrainingDecision(input, ctx, profile)).toEqual(first)
  expect(getTrainingDecision(before.input, before.ctx, before.profile)).toEqual(first)
  expect({ input, ctx, profile }).toEqual(before)
  expect(JSON.parse(JSON.stringify(first))).toEqual(first)
})
