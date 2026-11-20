import { RANKS, SUITS } from './card'
import type { Card } from './card'
import { evaluateHand, isExactRankPair } from './hand'
import type { Hand } from './hand'
import type { RuleProfile } from './rule-profile'

export function isKnownCard(card: Card): boolean {
  return RANKS.includes(card.rank) && SUITS.includes(card.suit)
}

export function getRuleProfileError(profile: RuleProfile): string | undefined {
  const { settings } = profile
  if (!['S17', 'H17'].includes(settings.dealerSoft17) ||
      !['none', 'early', 'late'].includes(settings.surrender) ||
      !['american-peek', 'no-peek'].includes(settings.dealerBlackjackCheck) ||
      !['any-initial-two-cards', 'hard-9-10-11', 'hard-10-11'].includes(settings.doubleRestriction) ||
      [settings.doubleAfterSplit, settings.resplitAces, settings.hitSplitAces]
        .some((value) => typeof value !== 'boolean')) return 'unknown-profile-setting'
  if (!profile.id.trim() || !Number.isInteger(profile.version) || profile.version < 1) {
    return 'invalid-profile-version'
  }
  if (!Number.isInteger(settings.decks) || settings.decks < 1 ||
      !Number.isInteger(settings.maxSplitHands) || settings.maxSplitHands < 1) {
    return 'invalid-profile-limits'
  }
  const { numerator, denominator } = settings.blackjackPayout
  if (!Number.isSafeInteger(numerator) || numerator < 1 ||
      !Number.isSafeInteger(denominator) || denominator < 1) {
    return 'invalid-blackjack-payout'
  }
}

/** Validates local draw history; it does not simulate a round or validate a shoe. */
export function getHandHistoryError(hand: Hand): string | undefined {
  const { cards, history } = hand
  if (cards.some((card) => !isKnownCard(card))) return 'unknown-card'
  if (!['initial-deal', 'split'].includes(history.origin) ||
      history.actions.some((action) => !['hit', 'stand', 'double', 'split'].includes(action))) {
    return 'unknown-hand-history'
  }
  if (cards.length === 1 && history.origin === 'split' && history.actions.length === 0) {
    return undefined // A split child awaiting its mandatory second card.
  }
  if (cards.length < 2) return 'incomplete-hand'

  const draws = history.actions.filter((action) => action === 'hit' || action === 'double').length
  if (cards.length !== 2 + draws) return 'history-card-count-mismatch'

  let visibleCards = 2
  for (let index = 0; index < history.actions.length; index += 1) {
    const action = history.actions[index]
    if (action !== 'hit' && index !== history.actions.length - 1) {
      return 'action-after-completion'
    }
    if ((action === 'double' || action === 'split') && index !== 0) {
      return 'initial-action-after-hit'
    }
    const before = evaluateHand({
      cards: cards.slice(0, visibleCards),
      history: { origin: history.origin, actions: history.actions.slice(0, index) },
    })
    if (before.isBust || (action !== 'stand' && before.total === 21)) {
      return 'action-after-terminal-total'
    }
    if (action === 'split' && !isExactRankPair(cards.slice(0, visibleCards))) {
      return 'split-history-without-pair'
    }
    if (action === 'hit' || action === 'double') visibleCards += 1
  }
}
