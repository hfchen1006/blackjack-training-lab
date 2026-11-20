import { describe, expect, it } from 'vitest'
import { BASELINE_RULE_PROFILE, BASELINE_RULE_SETTING_STATUS } from './rule-profile'

describe('baseline rule profile', () => {
  it('records the versioned project baseline without enforcing rules', () => {
    expect(BASELINE_RULE_PROFILE).toEqual({
      id: 'phase1-baseline',
      version: 1,
      settings: {
        decks: 6,
        dealerSoft17: 'S17',
        doubleAfterSplit: true,
        surrender: 'none',
        dealerBlackjackCheck: 'american-peek',
        doubleRestriction: 'any-initial-two-cards',
        blackjackPayout: { numerator: 3, denominator: 2 },
        maxSplitHands: 4,
        resplitAces: false,
        hitSplitAces: false,
      },
    })
  })

  it('marks only S17 as confirmed and DAS as accepted; all other settings are provisional', () => {
    const { dealerSoft17, doubleAfterSplit, ...provisional } = BASELINE_RULE_SETTING_STATUS

    expect(dealerSoft17).toBe('confirmed')
    expect(doubleAfterSplit).toBe('accepted-default')
    expect(provisional).toEqual({
      decks: 'provisional',
      surrender: 'provisional',
      dealerBlackjackCheck: 'provisional',
      doubleRestriction: 'provisional',
      blackjackPayout: 'provisional',
      maxSplitHands: 'provisional',
      resplitAces: 'provisional',
      hitSplitAces: 'provisional',
    })
  })

  it('prevents accidental mutation of shared defaults, including the payout ratio', () => {
    expect(Reflect.set(BASELINE_RULE_PROFILE, 'version', 2)).toBe(false)
    expect(Reflect.set(BASELINE_RULE_PROFILE.settings, 'decks', 8)).toBe(false)
    expect(Reflect.set(BASELINE_RULE_PROFILE.settings.blackjackPayout, 'numerator', 6)).toBe(false)
    expect(Reflect.set(BASELINE_RULE_SETTING_STATUS, 'decks', 'confirmed')).toBe(false)
    expect(BASELINE_RULE_PROFILE.version).toBe(1)
    expect(BASELINE_RULE_PROFILE.settings.decks).toBe(6)
    expect(BASELINE_RULE_PROFILE.settings.blackjackPayout).toEqual({ numerator: 3, denominator: 2 })
  })
})
