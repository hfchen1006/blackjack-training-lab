export type RuleSettings = {
  readonly decks: number
  readonly dealerSoft17: 'S17' | 'H17'
  readonly doubleAfterSplit: boolean
  readonly surrender: 'none' | 'early' | 'late'
  readonly dealerBlackjackCheck: 'american-peek' | 'no-peek'
  readonly doubleRestriction: 'any-initial-two-cards' | 'hard-9-10-11' | 'hard-10-11'
  /** Net winnings : original stake, rather than total return. */
  readonly blackjackPayout: {
    readonly numerator: number
    readonly denominator: number
  }
  /** Total hands after splitting, including the original hand. */
  readonly maxSplitHands: number
  readonly resplitAces: boolean
  readonly hitSplitAces: boolean
}

export type RuleProfile = {
  readonly id: string
  /** Increment when this profile's settings change; retain with future results. */
  readonly version: number
  readonly settings: RuleSettings
}

export type RuleSettingStatus = 'confirmed' | 'accepted-default' | 'provisional'

/**
 * Project baseline, not verified rules for the user's casino.
 * Only S17 is confirmed and DAS is an accepted default. All other settings
 * are provisional project defaults. This module performs no rule enforcement.
 */
export const BASELINE_RULE_PROFILE = Object.freeze({
  id: 'phase1-baseline',
  version: 1,
  settings: Object.freeze({
    decks: 6,
    dealerSoft17: 'S17',
    doubleAfterSplit: true,
    surrender: 'none',
    dealerBlackjackCheck: 'american-peek',
    doubleRestriction: 'any-initial-two-cards',
    blackjackPayout: Object.freeze({ numerator: 3, denominator: 2 }),
    maxSplitHands: 4,
    resplitAces: false,
    hitSplitAces: false,
  }),
} satisfies RuleProfile)

export const BASELINE_RULE_SETTING_STATUS = Object.freeze({
  decks: 'provisional',
  dealerSoft17: 'confirmed',
  doubleAfterSplit: 'accepted-default',
  surrender: 'provisional',
  dealerBlackjackCheck: 'provisional',
  doubleRestriction: 'provisional',
  blackjackPayout: 'provisional',
  maxSplitHands: 'provisional',
  resplitAces: 'provisional',
  hitSplitAces: 'provisional',
} satisfies Record<keyof RuleSettings, RuleSettingStatus>)
