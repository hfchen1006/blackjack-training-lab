import { getCardValue } from './card'
import type { Card } from './card'
import { evaluateHand } from './hand'
import type { Hand } from './hand'
import type { RuleProfile } from './rule-profile'
import { getHandHistoryError, getRuleProfileError } from './rule-validation'

export type DealerPeekState = 'not-required' | 'pending' | 'clear' | 'blackjack'

export function requiresDealerPeek(upcard: Card, profile: RuleProfile): boolean {
  return profile.settings.dealerBlackjackCheck === 'american-peek' &&
    (upcard.rank === 'A' || getCardValue(upcard) === 10)
}

export type DealerDecision =
  | { readonly phase: 'invalid'; readonly reason: string }
  | { readonly phase: 'terminal'; readonly reason: 'bust' | 'natural-blackjack' }
  | { readonly phase: 'hit' | 'stand' }

function mustHit(hand: Hand, profile: RuleProfile): boolean {
  const { total, isSoft } = evaluateHand(hand)
  return total < 17 || (total === 17 && isSoft && profile.settings.dealerSoft17 === 'H17')
}

/** Evaluates a known dealer hand; drawing/revealing cards and settlement are external. */
export function evaluateDealerDecision(hand: Hand, profile: RuleProfile): DealerDecision {
  const error = getRuleProfileError(profile) ?? getHandHistoryError(hand)
  if (error) return { phase: 'invalid', reason: error }
  if (hand.history.origin !== 'initial-deal' || hand.cards.length < 2) {
    return { phase: 'invalid', reason: 'invalid-dealer-hand-origin' }
  }
  let visibleCards = 2
  for (const action of hand.history.actions) {
    if (action === 'double' || action === 'split') return { phase: 'invalid', reason: 'invalid-dealer-action' }
    const before: Hand = {
      cards: hand.cards.slice(0, visibleCards),
      history: { origin: 'initial-deal', actions: [] },
    }
    const expectedHit = mustHit(before, profile)
    if ((action === 'hit') !== expectedHit) return { phase: 'invalid', reason: 'dealer-history-against-rules' }
    if (action === 'hit') visibleCards += 1
  }
  const evaluation = evaluateHand(hand)
  if (evaluation.isBust) return { phase: 'terminal', reason: 'bust' }
  if (evaluation.isNaturalBlackjack) return { phase: 'terminal', reason: 'natural-blackjack' }
  return { phase: mustHit(hand, profile) ? 'hit' : 'stand' }
}
