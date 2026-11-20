import { evaluateHand } from '../blackjack/hand'
import type { Hand, HandEvaluation, HandHistory } from '../blackjack/hand'
import { evaluatePlayerDecision } from '../blackjack/player-rules'
import type { PlayerDecisionContext } from '../blackjack/player-rules'
import type { RuleProfile } from '../blackjack/rule-profile'
import { getBasicStrategy } from '../strategy/basic-strategy'
import type { StrategyResult } from '../strategy/basic-strategy'

type HandSummary = HandEvaluation & {
  readonly classification: 'hard' | 'soft'
  readonly provenance: {
    readonly kind: 'initial' | 'continuing' | 'split'
    /** Split histories remain local to the current hand. */
    readonly history: HandHistory
  }
}

type NoDecisionDetails = Omit<Extract<StrategyResult, { kind: 'no-decision' }>, 'kind' | 'phase'>

export type TrainingDecision =
  | (Extract<StrategyResult, { kind: 'action' }> & {
    readonly phase: 'player'
    readonly handSummary: HandSummary
  })
  | (Extract<StrategyResult, { kind: 'side-decision' }> & {
    readonly phase: 'insurance'
    readonly handSummary: HandSummary
    readonly evenMoneyEligible: boolean
  })
  | (NoDecisionDetails & { readonly kind: 'terminal'; readonly phase: 'terminal' })
  | (NoDecisionDetails & { readonly kind: 'pending'; readonly phase: 'dealer-peek' | 'awaiting-split-card' })
  | Extract<StrategyResult, { kind: 'invalid-input' | 'unsupported-profile' | 'uncovered-case' }>

function summarizeHand(hand: Hand): HandSummary {
  const evaluation = evaluateHand(hand)
  return {
    ...evaluation,
    classification: evaluation.isSoft ? 'soft' : 'hard',
    provenance: {
      kind: hand.history.origin === 'split' ? 'split' :
        hand.history.actions.includes('hit') ? 'continuing' : 'initial',
      history: { origin: hand.history.origin, actions: [...hand.history.actions] },
    },
  }
}

/**
 * Pure integration of typed domain records for future training consumers.
 * `action` is the recommendation; its corresponding legal list is phase-specific.
 * Errors never acquire hand summaries or become selectable training decisions.
 */
export function getTrainingDecision(hand: Hand, context: PlayerDecisionContext, profile: RuleProfile): TrainingDecision {
  const strategy = getBasicStrategy(hand, context, profile)
  if (strategy.kind === 'invalid-input' || strategy.kind === 'unsupported-profile' || strategy.kind === 'uncovered-case') {
    return strategy
  }
  if (strategy.kind === 'no-decision') {
    return strategy.phase === 'terminal'
      ? { ...strategy, kind: 'terminal', phase: 'terminal' }
      : { ...strategy, kind: 'pending', phase: strategy.phase }
  }

  const decision = evaluatePlayerDecision(hand, context, profile)
  if (strategy.kind === 'action') {
    if (decision.phase !== 'player' || !decision.actions.includes(strategy.action)) {
      return { kind: 'invalid-input', reason: 'integration.rule-strategy-mismatch', strategyVersion: strategy.strategyVersion }
    }
    return { ...strategy, phase: 'player', legalActions: [...decision.actions], handSummary: summarizeHand(hand) }
  }
  if (decision.phase !== 'insurance' || !decision.sideActions.includes(strategy.action)) {
    return { kind: 'invalid-input', reason: 'integration.rule-strategy-mismatch', strategyVersion: strategy.strategyVersion }
  }
  return {
    ...strategy, phase: 'insurance', legalSideActions: [...decision.sideActions],
    evenMoneyEligible: decision.evenMoneyEligible, handSummary: summarizeHand(hand),
  }
}
