import type { Rank } from '../blackjack/card'
import { evaluateHand } from '../blackjack/hand'
import type { Hand } from '../blackjack/hand'
import { evaluatePlayerDecision } from '../blackjack/player-rules'
import type { PlayerAction, PlayerDecisionContext, SideDecisionAction } from '../blackjack/player-rules'
import type { RuleProfile } from '../blackjack/rule-profile'

export const STRATEGY_VERSION = 'baseline-s17-v1' as const
export type StrategyAction = Extract<PlayerAction, 'hit' | 'stand' | 'double' | 'split'>
type TotalAction = Exclude<StrategyAction, 'split'>
type DealerUpcard = Exclude<Rank, 'J' | 'Q' | 'K'>
type Category = 'hard' | 'soft' | 'pair'
export type StrategyCaseId = `${typeof STRATEGY_VERSION}.${Category}.${number | Rank}.vs.${DealerUpcard}`
type Versioned = { readonly strategyVersion: typeof STRATEGY_VERSION }

export type ActionRecommendation = Versioned & {
  readonly kind: 'action'
  readonly action: StrategyAction
  readonly caseId: StrategyCaseId
  readonly preferredAction: StrategyAction
  readonly preferredActionLegal: boolean
  /** Documented conditional fallback, even when the preferred action is legal. */
  readonly fallbackAction: TotalAction | null
  readonly fallbackCaseId: StrategyCaseId | null
  readonly usedFallback: boolean
  readonly legalActions: readonly PlayerAction[]
  readonly reasonKey: 'strategy.reference-action' | 'strategy.double-otherwise-hit' |
    'strategy.double-otherwise-stand' | 'strategy.split-otherwise-total'
}

export type StrategyResult = ActionRecommendation
  | (Versioned & {
    readonly kind: 'side-decision'
    readonly action: 'decline-insurance'
    readonly caseId: `${typeof STRATEGY_VERSION}.side.insurance` | `${typeof STRATEGY_VERSION}.side.even-money`
    readonly reasonKey: 'strategy.decline-side-decisions'
    readonly insurance: 'decline'
    readonly evenMoney: 'decline' | 'not-applicable'
    readonly legalSideActions: readonly SideDecisionAction[]
    readonly usedFallback: false
  })
  | (Versioned & { readonly kind: 'no-decision'; readonly phase: 'terminal' | 'dealer-peek' | 'awaiting-split-card'; readonly reason: string })
  | (Versioned & { readonly kind: 'invalid-input'; readonly reason: string })
  | (Versioned & { readonly kind: 'unsupported-profile'; readonly reason: 'profile-id' | 'profile-version' | 'profile-settings' })
  | (Versioned & { readonly kind: 'uncovered-case'; readonly reason: 'missing-reference' | 'no-verified-legal-fallback' | 'side-decline-unavailable' })

type TotalPolicy = {
  readonly preferred: TotalAction
  readonly fallback: 'hit' | 'stand' | null
}

const HIT: TotalPolicy = { preferred: 'hit', fallback: null }
const STAND: TotalPolicy = { preferred: 'stand', fallback: null }
const DOUBLE_HIT: TotalPolicy = { preferred: 'double', fallback: 'hit' }
const DOUBLE_STAND: TotalPolicy = { preferred: 'double', fallback: 'stand' }

function unsupportedProfileReason(profile: RuleProfile): 'profile-id' | 'profile-version' | 'profile-settings' | undefined {
  // Deliberately fixed to the verified version/settings, not a live baseline import.
  if (profile?.id !== 'phase1-baseline') return 'profile-id'
  if (profile.version !== 1) return 'profile-version'
  const settings = profile.settings
  if (!settings || Object.keys(settings).length !== 10 || settings.decks !== 6 ||
      settings.dealerSoft17 !== 'S17' || settings.doubleAfterSplit !== true ||
      settings.doubleRestriction !== 'any-initial-two-cards' || settings.surrender !== 'none' ||
      settings.dealerBlackjackCheck !== 'american-peek' || settings.maxSplitHands !== 4 ||
      settings.resplitAces !== false || settings.hitSplitAces !== false ||
      settings.blackjackPayout?.numerator !== 3 || settings.blackjackPayout?.denominator !== 2 ||
      Object.keys(settings.blackjackPayout).length !== 2) return 'profile-settings'
}

function canonicalUpcard(rank: Rank): DealerUpcard {
  switch (rank) {
    case 'J': case 'Q': case 'K': return '10'
    default: return rank
  }
}

// Published S17 total-dependent rules. The independent fixture is never imported.
function hardPolicy(total: number, dealer: number): TotalPolicy | null {
  if (total < 4 || total > 20) return null
  if (total <= 8) return HIT
  if (total === 9) return dealer >= 3 && dealer <= 6 ? DOUBLE_HIT : HIT
  if (total === 10) return dealer <= 9 ? DOUBLE_HIT : HIT
  if (total === 11) return dealer !== 11 ? DOUBLE_HIT : HIT
  if (total === 12) return dealer >= 4 && dealer <= 6 ? STAND : HIT
  if (total <= 16) return dealer <= 6 ? STAND : HIT
  return STAND
}

function softPolicy(total: number, dealer: number): TotalPolicy | null {
  if (total < 13 || total > 20) return null
  if (total <= 14) return dealer === 5 || dealer === 6 ? DOUBLE_HIT : HIT
  if (total <= 16) return dealer >= 4 && dealer <= 6 ? DOUBLE_HIT : HIT
  if (total === 17) return dealer >= 3 && dealer <= 6 ? DOUBLE_HIT : HIT
  if (total === 18) {
    if (dealer >= 3 && dealer <= 6) return DOUBLE_STAND
    return dealer === 2 || dealer === 7 || dealer === 8 ? STAND : HIT
  }
  return STAND
}

function prefersSplit(rank: Rank, dealer: number): boolean {
  switch (rank) {
    case 'A': case '8': return true
    case '2': case '3': case '7': return dealer <= 7
    case '4': return dealer === 5 || dealer === 6
    case '6': return dealer <= 6
    case '9': return dealer <= 6 || dealer === 8 || dealer === 9
    default: return false
  }
}

function legalTotalAction(policy: TotalPolicy | null, legal: readonly PlayerAction[]): TotalAction | null {
  if (!policy) return null
  if (legal.includes(policy.preferred)) return policy.preferred
  return policy.fallback && legal.includes(policy.fallback) ? policy.fallback : null
}

function makeCaseId(category: Category, value: number | Rank, upcard: DealerUpcard): StrategyCaseId {
  return `${STRATEGY_VERSION}.${category}.${value}.vs.${upcard}`
}

/**
 * Deterministic recommendations for typed domain records under the exact baseline.
 * Legality and phase validation stay in the approved rule engine. No EVs or
 * composition-dependent exceptions are inferred from the cards.
 */
export function getBasicStrategy(hand: Hand, context: PlayerDecisionContext, profile: RuleProfile): StrategyResult {
  const unsupported = unsupportedProfileReason(profile)
  if (unsupported) return { kind: 'unsupported-profile', reason: unsupported, strategyVersion: STRATEGY_VERSION }
  const decision = evaluatePlayerDecision(hand, context, profile)
  if (decision.phase === 'invalid') {
    return { kind: 'invalid-input', reason: decision.reason, strategyVersion: STRATEGY_VERSION }
  }
  if (decision.phase === 'insurance') {
    if (!decision.sideActions.includes('decline-insurance')) {
      return { kind: 'uncovered-case', reason: 'side-decline-unavailable', strategyVersion: STRATEGY_VERSION }
    }
    return {
      kind: 'side-decision', action: 'decline-insurance', strategyVersion: STRATEGY_VERSION,
      caseId: `${STRATEGY_VERSION}.side.${decision.evenMoneyEligible ? 'even-money' : 'insurance'}`,
      reasonKey: 'strategy.decline-side-decisions', insurance: 'decline',
      evenMoney: decision.evenMoneyEligible ? 'decline' : 'not-applicable',
      legalSideActions: decision.sideActions, usedFallback: false,
    }
  }
  if (decision.phase !== 'player') {
    return {
      kind: 'no-decision', phase: decision.phase,
      reason: decision.phase === 'terminal' ? decision.reason : decision.phase,
      strategyVersion: STRATEGY_VERSION,
    }
  }

  const evaluation = evaluateHand(hand)
  const upcard = canonicalUpcard(context.dealerUpcard.rank)
  const dealer = upcard === 'A' ? 11 : Number(upcard)
  const category = evaluation.isSoft ? 'soft' : 'hard'
  const totalCaseId = makeCaseId(category, evaluation.total, upcard)
  const totalPolicy = evaluation.isSoft ? softPolicy(evaluation.total, dealer) : hardPolicy(evaluation.total, dealer)
  const pairRank = evaluation.isExactRankPair ? hand.cards[0].rank : null
  const caseId = pairRank ? makeCaseId('pair', pairRank, upcard) : totalCaseId
  const wantsSplit = pairRank !== null && prefersSplit(pairRank, dealer)
  const preferredAction = wantsSplit ? 'split' : totalPolicy?.preferred
  if (!preferredAction) return { kind: 'uncovered-case', reason: 'missing-reference', strategyVersion: STRATEGY_VERSION }

  const preferredActionLegal = decision.actions.includes(preferredAction)
  const fallbackAction = wantsSplit ? legalTotalAction(totalPolicy, decision.actions) : totalPolicy?.fallback ?? null
  const fallbackCaseId = fallbackAction === null ? null : wantsSplit ? totalCaseId : caseId
  const action = preferredActionLegal ? preferredAction : fallbackAction
  if (!action || !decision.actions.includes(action)) {
    return { kind: 'uncovered-case', reason: 'no-verified-legal-fallback', strategyVersion: STRATEGY_VERSION }
  }
  const reasonKey = wantsSplit ? 'strategy.split-otherwise-total' :
    preferredAction === 'double' ? (fallbackAction === 'stand' ? 'strategy.double-otherwise-stand' : 'strategy.double-otherwise-hit') :
      'strategy.reference-action'
  return {
    kind: 'action', strategyVersion: STRATEGY_VERSION, action, caseId, reasonKey,
    preferredAction, preferredActionLegal, fallbackAction, fallbackCaseId,
    usedFallback: !preferredActionLegal, legalActions: decision.actions,
  }
}
