import { getCardValue } from './card'
import type { Card } from './card'

// Records supplied by the caller; these types do not execute or permit actions.
export type HandAction = 'hit' | 'stand' | 'double' | 'split'

export type HandHistory = {
  readonly origin: 'initial-deal' | 'split'
  readonly actions: readonly HandAction[]
}

export type Hand = {
  readonly cards: readonly Card[]
  readonly history: HandHistory
}

export type HandEvaluation = {
  /** Best total at or below 21, or the all-Aces-low total when busted. */
  readonly total: number
  /** True only when an Ace counts as 11 in the evaluated total. */
  readonly isSoft: boolean
  readonly isBust: boolean
  readonly isNaturalBlackjack: boolean
  /** Rank equality only; this does not establish legal split eligibility. */
  readonly isExactRankPair: boolean
  readonly cardCount: number
}

export function isExactRankPair(cards: readonly Card[]): boolean {
  return cards.length === 2 && cards[0].rank === cards[1].rank
}

/** Classifies an original two-card deal, excluding split/drawn hands. */
export function isNaturalBlackjack(hand: Hand): boolean {
  if (hand.cards.length !== 2 || hand.history.origin !== 'initial-deal') {
    return false
  }

  // Standing does not change an original natural. Card-changing history does.
  if (hand.history.actions.some((action) => action !== 'stand')) return false

  const [first, second] = hand.cards
  return (
    (first.rank === 'A' && getCardValue(second) === 10) ||
    (second.rank === 'A' && getCardValue(first) === 10)
  )
}

/** Evaluates supplied cards/history without validating reachability or shoe limits. */
export function evaluateHand(hand: Hand): HandEvaluation {
  let minimumTotal = 0
  let hasAce = false

  for (const card of hand.cards) {
    minimumTotal += getCardValue(card)
    if (card.rank === 'A') hasAce = true
  }

  // At most one Ace can count as 11 without exceeding 21.
  const isSoft = hasAce && minimumTotal + 10 <= 21
  const total = minimumTotal + (isSoft ? 10 : 0)

  return {
    total,
    isSoft,
    isBust: total > 21,
    isNaturalBlackjack: isNaturalBlackjack(hand),
    isExactRankPair: isExactRankPair(hand.cards),
    cardCount: hand.cards.length,
  }
}
