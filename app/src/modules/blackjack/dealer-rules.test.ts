import { describe, expect, it } from 'vitest'
import type { Rank } from './card'
import { evaluateDealerDecision } from './dealer-rules'
import type { Hand, HandAction } from './hand'
import { BASELINE_RULE_PROFILE } from './rule-profile'
import type { RuleProfile } from './rule-profile'

function hand(ranks: readonly Rank[], actions: readonly HandAction[] = []): Hand {
  return { cards: ranks.map((rank) => ({ rank, suit: 'clubs' })), history: { origin: 'initial-deal', actions } }
}

const H17: RuleProfile = {
  id: 'test-h17', version: 1,
  settings: { ...BASELINE_RULE_PROFILE.settings, dealerSoft17: 'H17' },
}

describe('dealer decision rules', () => {
  it.each<Rank[]>([['5', '6'], ['10', '6'], ['A', '5']])('hits below 17 on %s', (...ranks) => {
    expect(evaluateDealerDecision(hand(ranks), BASELINE_RULE_PROFILE)).toEqual({ phase: 'hit' })
  })

  it.each<Rank[]>([['10', '7'], ['10', '8'], ['K', 'Q']])('stands on hard 17+ on %s', (...ranks) => {
    expect(evaluateDealerDecision(hand(ranks), BASELINE_RULE_PROFILE)).toEqual({ phase: 'stand' })
    expect(evaluateDealerDecision(hand(ranks), H17)).toEqual({ phase: 'stand' })
  })

  it('stands on Soft 17 under S17 and hits it only under an explicit H17 profile', () => {
    expect(evaluateDealerDecision(hand(['A', '6']), BASELINE_RULE_PROFILE)).toEqual({ phase: 'stand' })
    expect(evaluateDealerDecision(hand(['A', '6']), H17)).toEqual({ phase: 'hit' })
    expect(evaluateDealerDecision(hand(['A', '7']), H17)).toEqual({ phase: 'stand' })
  })

  it('makes dealer bust and natural Blackjack terminal without settlement', () => {
    expect(evaluateDealerDecision(hand(['10', '6', '8'], ['hit']), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'terminal', reason: 'bust' })
    expect(evaluateDealerDecision(hand(['A', 'K']), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'terminal', reason: 'natural-blackjack' })
  })

  it('stands on a non-natural 21 reached legally by drawing', () => {
    expect(evaluateDealerDecision(hand(['7', '7', '7'], ['hit']), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'stand' })
  })

  it('validates prior dealer hits against the selected Soft 17 rule', () => {
    const drawnHand = hand(['A', '6', 'K'], ['hit'])
    expect(evaluateDealerDecision(drawnHand, H17)).toEqual({ phase: 'stand' })
    expect(evaluateDealerDecision(drawnHand, BASELINE_RULE_PROFILE).phase).toBe('invalid')
  })

  it.each<{
    name: string; input: Hand
  }>([
    { name: 'missing draw history', input: hand(['10', '6', '2']) },
    { name: 'one-card dealer hand', input: hand(['A']) },
    { name: 'split dealer hand', input: { ...hand(['8', '3']), history: { origin: 'split', actions: [] } } },
    { name: 'dealer Double', input: hand(['5', '6', '2'], ['double']) },
    { name: 'dealer Split', input: hand(['8', '8'], ['split']) },
    { name: 'hit on hard 17', input: hand(['10', '7', '2'], ['hit']) },
    { name: 'stand below 17', input: hand(['10', '6'], ['stand']) },
    { name: 'draw after Blackjack', input: hand(['A', 'K', '2'], ['hit']) },
    { name: 'action after completion', input: hand(['10', '7', '2'], ['stand', 'hit']) },
  ])('rejects $name', ({ input }) => {
    expect(evaluateDealerDecision(input, BASELINE_RULE_PROFILE).phase).toBe('invalid')
  })
})
