import { getCardValue } from './card'
import type { Card, Rank } from './card'
import { requiresDealerPeek } from './dealer-rules'
import type { DealerPeekState } from './dealer-rules'
import { evaluateHand, isExactRankPair } from './hand'
import type { Hand, HandAction } from './hand'
import type { RuleProfile } from './rule-profile'
import { getHandHistoryError, getRuleProfileError, isKnownCard } from './rule-validation'

export type PlayerAction = HandAction | 'surrender'
export type SideDecisionAction = 'take-insurance' | 'decline-insurance' | 'take-even-money'
export type SideDecisionStatus =
  | 'not-applicable' | 'pending' | 'declined' | 'insurance-taken' | 'even-money-taken'

export type PlayerDecisionContext = {
  readonly dealerUpcard: Card
  readonly dealerPeek: DealerPeekState
  /** Round-level side-decision status, retained for later continuing/split hands. */
  readonly sideDecision: SideDecisionStatus
  /** Total current hands in the round, not the number of splits performed. */
  readonly handsInRound: number
  /** Rank retained from the split; null for an original hand. */
  readonly splitFromRank: Rank | null
  /** Surrender is absent from the approved HandAction model. */
  readonly surrendered: boolean
}

type NoActions = { readonly actions: readonly [] }
type TerminalReason =
  | 'dealer-blackjack' | 'even-money' | 'natural-blackjack' | 'bust' | 'twenty-one'
  | 'stand' | 'double' | 'split' | 'surrendered' | 'split-aces-complete'

export type PlayerDecision =
  | (NoActions & { readonly phase: 'invalid'; readonly reason: string })
  | (NoActions & { readonly phase: 'insurance'; readonly sideActions: readonly SideDecisionAction[];
      readonly evenMoneyEligible: boolean })
  | (NoActions & { readonly phase: 'dealer-peek' | 'awaiting-split-card' })
  | (NoActions & { readonly phase: 'terminal'; readonly reason: TerminalReason })
  | { readonly phase: 'player'; readonly actions: readonly PlayerAction[] }

const NO_ACTIONS = Object.freeze([] as const)

function allowsDouble(hand: Hand, profile: RuleProfile): boolean {
  if (hand.cards.length !== 2 || hand.history.actions.length !== 0) return false
  if (hand.history.origin === 'split' && !profile.settings.doubleAfterSplit) return false
  const { total, isSoft } = evaluateHand(hand)
  switch (profile.settings.doubleRestriction) {
    case 'any-initial-two-cards': return true
    case 'hard-9-10-11': return !isSoft && total >= 9 && total <= 11
    case 'hard-10-11': return !isSoft && total >= 10 && total <= 11
  }
}

function allowsLateSurrender(hand: Hand, context: PlayerDecisionContext, profile: RuleProfile): boolean {
  const blackjackPossible = context.dealerUpcard.rank === 'A' || getCardValue(context.dealerUpcard) === 10
  return profile.settings.surrender === 'late' && hand.history.origin === 'initial-deal' &&
    hand.cards.length === 2 && hand.history.actions.length === 0 &&
    evaluateHand(hand).total < 21 &&
    (!blackjackPossible || context.dealerPeek === 'clear')
}

function getContextError(hand: Hand, context: PlayerDecisionContext, profile: RuleProfile): string | undefined {
  const profileError = getRuleProfileError(profile)
  if (profileError) return profileError
  // Early surrender needs its own pre-peek offer/decline flow, outside this baseline.
  if (profile.settings.surrender === 'early') return 'unsupported-early-surrender'
  const historyError = getHandHistoryError(hand)
  if (historyError) return historyError
  if (!isKnownCard(context.dealerUpcard) ||
      !['not-required', 'pending', 'clear', 'blackjack'].includes(context.dealerPeek) ||
      !['not-applicable', 'pending', 'declined', 'insurance-taken', 'even-money-taken'].includes(context.sideDecision) ||
      typeof context.surrendered !== 'boolean') return 'unknown-decision-context'
  if (!Number.isInteger(context.handsInRound) || context.handsInRound < 1 ||
      context.handsInRound > profile.settings.maxSplitHands) return 'invalid-hand-count'

  const { history, cards } = hand
  const lastAction = history.actions.at(-1)
  if (history.origin === 'initial-deal') {
    if (context.splitFromRank !== null) return 'original-hand-with-split-rank'
    if (context.handsInRound !== 1 && lastAction !== 'split') return 'original-hand-in-split-round'
  } else if (context.splitFromRank === null || context.handsInRound < 2 ||
             cards[0].rank !== context.splitFromRank) {
    return 'contradictory-split-context'
  }

  const splitAces = history.origin === 'split' && context.splitFromRank === 'A'
  if (splitAces && !profile.settings.hitSplitAces &&
      history.actions.some((action) => action === 'hit' || action === 'double')) {
    return 'draw-after-split-ace-replacement'
  }
  if (lastAction === 'double') {
    const before: Hand = { cards: cards.slice(0, 2), history: { origin: history.origin, actions: [] } }
    if (!allowsDouble(before, profile)) return 'illegal-double-history'
  }
  if (lastAction === 'split' && (context.handsInRound < 2 ||
      (splitAces && !profile.settings.resplitAces))) return 'illegal-split-history'

  const peekRequired = requiresDealerPeek(context.dealerUpcard, profile)
  if ((peekRequired && context.dealerPeek === 'not-required') ||
      (!peekRequired && context.dealerPeek !== 'not-required')) return 'contradictory-peek-state'
  const aceUp = context.dealerUpcard.rank === 'A'
  if ((aceUp && context.sideDecision === 'not-applicable') ||
      (!aceUp && context.sideDecision !== 'not-applicable')) return 'contradictory-side-decision'
  if (context.sideDecision === 'pending' &&
      (context.dealerPeek === 'clear' || context.dealerPeek === 'blackjack')) {
    return 'peek-before-side-decision'
  }
  const progressed = history.origin === 'split' || history.actions.length !== 0 || context.surrendered
  if ((context.dealerPeek === 'pending' || context.dealerPeek === 'blackjack' ||
       context.sideDecision === 'pending') && progressed) return 'play-before-prerequisites'

  const evaluation = evaluateHand(hand)
  const { numerator, denominator } = profile.settings.blackjackPayout
  if (context.sideDecision === 'even-money-taken' &&
      (!evaluation.isNaturalBlackjack || numerator * 2 !== denominator * 3)) return 'ineligible-even-money'
  if (context.surrendered && !allowsLateSurrender(hand, context, profile)) return 'illegal-surrender-context'
}

/**
 * Returns eligibility and decision phases only, never a recommended action.
 * Cards must be in deal order. A split child's local history starts after its
 * mandatory replacement card; origin and splitFromRank preserve its provenance.
 * Inputs are typed domain records, not arbitrary JSON; decoding is external.
 */
export function evaluatePlayerDecision(
  hand: Hand,
  context: PlayerDecisionContext,
  profile: RuleProfile,
): PlayerDecision {
  const error = getContextError(hand, context, profile)
  if (error) return { phase: 'invalid', reason: error, actions: NO_ACTIONS }
  const evaluation = evaluateHand(hand)
  const { numerator, denominator } = profile.settings.blackjackPayout
  if (context.sideDecision === 'pending') {
    // 3:2 is required for the conventional Insurance/even-money equivalence.
    // NJ 13:69F-2.7/2.9: https://www.nj.gov/oag/ge/docs/Regulations/CHAPTER69F.pdf
    const evenMoneyEligible = evaluation.isNaturalBlackjack && numerator * 2 === denominator * 3
    const sideActions: SideDecisionAction[] = ['take-insurance', 'decline-insurance']
    if (evenMoneyEligible) sideActions.push('take-even-money')
    return { phase: 'insurance', actions: NO_ACTIONS, sideActions, evenMoneyEligible }
  }
  if (context.sideDecision === 'even-money-taken') {
    return { phase: 'terminal', reason: 'even-money', actions: NO_ACTIONS }
  }
  if (context.dealerPeek === 'pending') return { phase: 'dealer-peek', actions: NO_ACTIONS }
  if (context.dealerPeek === 'blackjack') {
    return { phase: 'terminal', reason: 'dealer-blackjack', actions: NO_ACTIONS }
  }
  if (context.surrendered) return { phase: 'terminal', reason: 'surrendered', actions: NO_ACTIONS }
  if (evaluation.isNaturalBlackjack) {
    return { phase: 'terminal', reason: 'natural-blackjack', actions: NO_ACTIONS }
  }
  if (evaluation.isBust) return { phase: 'terminal', reason: 'bust', actions: NO_ACTIONS }
  const lastAction = hand.history.actions.at(-1)
  if (lastAction === 'stand' || lastAction === 'double' || lastAction === 'split') {
    return { phase: 'terminal', reason: lastAction, actions: NO_ACTIONS }
  }
  if (evaluation.total === 21) return { phase: 'terminal', reason: 'twenty-one', actions: NO_ACTIONS }
  if (hand.cards.length === 1) return { phase: 'awaiting-split-card', actions: NO_ACTIONS }

  const canSplit = hand.history.actions.length === 0 && isExactRankPair(hand.cards) &&
    context.handsInRound < profile.settings.maxSplitHands &&
    !(hand.history.origin === 'split' && hand.cards[0].rank === 'A' && !profile.settings.resplitAces)
  if (context.splitFromRank === 'A' && !profile.settings.hitSplitAces) {
    return canSplit
      ? { phase: 'player', actions: ['stand', 'split'] }
      : { phase: 'terminal', reason: 'split-aces-complete', actions: NO_ACTIONS }
  }
  const actions: PlayerAction[] = ['hit', 'stand']
  if (allowsDouble(hand, profile)) actions.push('double')
  if (canSplit) actions.push('split')
  if (allowsLateSurrender(hand, context, profile)) actions.push('surrender')
  return { phase: 'player', actions }
}
