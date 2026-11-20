import { describe, expect, it } from 'vitest'
import type { Rank } from './card'
import type { Hand, HandAction } from './hand'
import { evaluatePlayerDecision } from './player-rules'
import type { PlayerDecisionContext } from './player-rules'
import { BASELINE_RULE_PROFILE } from './rule-profile'
import type { RuleProfile, RuleSettings } from './rule-profile'

function hand(ranks: readonly Rank[], actions: readonly HandAction[] = [], origin: 'initial-deal' | 'split' = 'initial-deal'): Hand {
  return { cards: ranks.map((rank) => ({ rank, suit: 'hearts' })), history: { origin, actions } }
}

function context(overrides: Partial<PlayerDecisionContext> = {}): PlayerDecisionContext {
  return {
    dealerUpcard: { rank: '6', suit: 'spades' }, dealerPeek: 'not-required',
    sideDecision: 'not-applicable', handsInRound: 1, splitFromRank: null,
    surrendered: false, ...overrides,
  }
}

function rules(overrides: Partial<RuleSettings>): RuleProfile {
  return { id: 'test-profile', version: 1, settings: { ...BASELINE_RULE_PROFILE.settings, ...overrides } }
}

function splitContext(rank: Rank, handsInRound = 2): PlayerDecisionContext {
  return context({ splitFromRank: rank, handsInRound })
}

const acePending = context({
  dealerUpcard: { rank: 'A', suit: 'spades' }, dealerPeek: 'pending', sideDecision: 'pending',
})
const aceClear = { ...acePending, dealerPeek: 'clear', sideDecision: 'declined' } as const

describe('ordinary player actions', () => {
  it('offers Hit, Stand and Double on an untouched original hand, with no Surrender', () => {
    expect(evaluatePlayerDecision(hand(['8', '3']), context(), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'player', actions: ['hit', 'stand', 'double'] })
  })

  it('offers only Hit and Stand after a hit, even when the total could otherwise double', () => {
    expect(evaluatePlayerDecision(hand(['2', '3', '5'], ['hit']), context(), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'player', actions: ['hit', 'stand'] })
  })

  it.each<{
    input: Hand; decisionContext?: PlayerDecisionContext; reason: string
  }>([
    { input: hand(['8', '3'], ['stand']), reason: 'stand' },
    { input: hand(['5', '6', '3'], ['double']), reason: 'double' },
    { input: hand(['8', '8'], ['split']), decisionContext: context({ handsInRound: 2 }), reason: 'split' },
    { input: hand(['A', 'K']), reason: 'natural-blackjack' },
    { input: hand(['10', '9', '5'], ['hit']), reason: 'bust' },
    { input: hand(['7', '7', '7'], ['hit']), reason: 'twenty-one' },
  ])('exposes no actions for terminal $reason', ({ input, decisionContext, reason }) => {
    expect(evaluatePlayerDecision(input, decisionContext ?? context(), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'terminal', reason, actions: [] })
  })

  it.each<{ restriction: RuleSettings['doubleRestriction']; ranks: Rank[]; allowed: boolean }>([
    { restriction: 'any-initial-two-cards', ranks: ['A', '7'], allowed: true },
    { restriction: 'any-initial-two-cards', ranks: ['2', '2'], allowed: true },
    { restriction: 'hard-9-10-11', ranks: ['4', '4'], allowed: false },
    { restriction: 'hard-9-10-11', ranks: ['3', '6'], allowed: true },
    { restriction: 'hard-9-10-11', ranks: ['5', '6'], allowed: true },
    { restriction: 'hard-9-10-11', ranks: ['6', '6'], allowed: false },
    { restriction: 'hard-9-10-11', ranks: ['A', '8'], allowed: false },
    { restriction: 'hard-10-11', ranks: ['3', '6'], allowed: false },
    { restriction: 'hard-10-11', ranks: ['5', '5'], allowed: true },
    { restriction: 'hard-10-11', ranks: ['A', '9'], allowed: false },
  ])('applies $restriction to $ranks (Double: $allowed)', ({ restriction, ranks, allowed }) => {
    const decision = evaluatePlayerDecision(hand(ranks), context(), rules({ doubleRestriction: restriction }))
    if (decision.phase !== 'player') throw new Error('Expected an active player decision')
    expect(decision.actions.includes('double')).toBe(allowed)
  })

  it.each([true, false])('applies DAS=%s to an untouched split hand', (doubleAfterSplit) => {
    const decision = evaluatePlayerDecision(hand(['8', '3'], [], 'split'), splitContext('8'), rules({ doubleAfterSplit }))
    expect(decision.phase).toBe('player')
    expect(decision.actions).toEqual(doubleAfterSplit ? ['hit', 'stand', 'double'] : ['hit', 'stand'])
  })

  it('keeps continuing split hands ineligible for Double despite DAS', () => {
    expect(evaluatePlayerDecision(hand(['2', '3', '5'], ['hit'], 'split'), splitContext('2'), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'player', actions: ['hit', 'stand'] })
  })
})

describe('split eligibility', () => {
  it.each<{ ranks: Rank[]; allowed: boolean }>([
    { ranks: ['8', '8'], allowed: true },
    { ranks: ['A', 'A'], allowed: true },
    { ranks: ['10', '10'], allowed: true },
    { ranks: ['10', 'J'], allowed: false },
    { ranks: ['J', 'Q'], allowed: false },
  ])('uses exact ranks for $ranks (Split: $allowed)', ({ ranks, allowed }) => {
    const decision = evaluatePlayerDecision(hand(ranks), context(), BASELINE_RULE_PROFILE)
    if (decision.phase !== 'player') throw new Error('Expected an active player decision')
    expect(decision.actions.includes('split')).toBe(allowed)
  })

  it.each([2, 3, 4])('counts total hands when considering a resplit at %s hands', (handsInRound) => {
    const decision = evaluatePlayerDecision(hand(['8', '8'], [], 'split'), splitContext('8', handsInRound), BASELINE_RULE_PROFILE)
    if (decision.phase !== 'player') throw new Error('Expected an active player decision')
    expect(decision.actions.includes('split')).toBe(handsInRound < 4)
  })

  it('waits for the mandatory split replacement card without offering player actions', () => {
    expect(evaluatePlayerDecision(hand(['A'], [], 'split'), splitContext('A'), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'awaiting-split-card', actions: [] })
  })

  it('does not apply split-Ace restrictions merely because a split non-Ace hand draws an Ace', () => {
    expect(evaluatePlayerDecision(hand(['8', 'A'], [], 'split'), splitContext('8'), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'player', actions: ['hit', 'stand', 'double'] })
  })

  it.each<Rank>(['3', 'A'])('completes split Aces after the replacement %s under baseline restrictions', (rank) => {
    expect(evaluatePlayerDecision(hand(['A', rank], [], 'split'), splitContext('A'), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'terminal', reason: 'split-aces-complete', actions: [] })
  })

  it('permits an explicitly enabled Ace resplit, but no Hit or Double', () => {
    expect(evaluatePlayerDecision(hand(['A', 'A'], [], 'split'), splitContext('A'), rules({ resplitAces: true })))
      .toEqual({ phase: 'player', actions: ['stand', 'split'] })
  })

  it('still applies the hand cap when Ace resplitting is enabled', () => {
    expect(evaluatePlayerDecision(hand(['A', 'A'], [], 'split'), splitContext('A', 4), rules({ resplitAces: true })))
      .toEqual({ phase: 'terminal', reason: 'split-aces-complete', actions: [] })
  })

  it('allows ordinary split-Ace decisions only when drawing to split Aces is explicitly enabled', () => {
    expect(evaluatePlayerDecision(hand(['A', 'A'], [], 'split'), splitContext('A'), rules({ hitSplitAces: true })))
      .toEqual({ phase: 'player', actions: ['hit', 'stand', 'double'] })
  })

  it('classifies Ace + ten after splitting as terminal 21, never a natural', () => {
    expect(evaluatePlayerDecision(hand(['A', 'K'], [], 'split'), splitContext('A'), BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'terminal', reason: 'twenty-one', actions: [] })
  })
})

describe('surrender settings', () => {
  it('offers explicitly configured late surrender only on an original initial hand after a clear peek', () => {
    const profile = rules({ surrender: 'late' })
    expect(evaluatePlayerDecision(hand(['8', '3']), aceClear, profile).actions)
      .toEqual(['hit', 'stand', 'double', 'surrender'])
    expect(evaluatePlayerDecision(hand(['2', '3', '5'], ['hit']), aceClear, profile).actions)
      .not.toContain('surrender')
    expect(evaluatePlayerDecision(hand(['8', '3'], [], 'split'), splitContext('8'), profile).actions)
      .not.toContain('surrender')
  })

  it('recognizes an explicit valid surrender as terminal without extending HandAction', () => {
    expect(evaluatePlayerDecision(hand(['8', '3']), { ...aceClear, surrendered: true }, rules({ surrender: 'late' })))
      .toEqual({ phase: 'terminal', reason: 'surrendered', actions: [] })
  })

  it('does not allow late surrender while dealer Blackjack remains unknown in a no-peek profile', () => {
    const decision = evaluatePlayerDecision(hand(['8', '3']), context({
      dealerUpcard: { rank: 'K', suit: 'spades' },
    }), rules({ surrender: 'late', dealerBlackjackCheck: 'no-peek' }))
    expect(decision.phase).toBe('player')
    expect(decision.actions).not.toContain('surrender')
  })

  it('explicitly rejects early surrender profiles until their separate pre-peek flow is defined', () => {
    expect(evaluatePlayerDecision(hand(['8', '3']), context(), rules({ surrender: 'early' })))
      .toEqual({ phase: 'invalid', reason: 'unsupported-early-surrender', actions: [] })
  })
})

describe('Insurance, Even Money, and peek phases', () => {
  it('offers Insurance before an Ace peek with no ordinary actions or recommendation', () => {
    expect(evaluatePlayerDecision(hand(['8', '3']), acePending, BASELINE_RULE_PROFILE)).toEqual({
      phase: 'insurance', actions: [], sideActions: ['take-insurance', 'decline-insurance'], evenMoneyEligible: false,
    })
  })

  it('also offers Even Money for an original natural at the baseline 3:2 payout', () => {
    expect(evaluatePlayerDecision(hand(['A', 'K']), acePending, BASELINE_RULE_PROFILE)).toEqual({
      phase: 'insurance', actions: [],
      sideActions: ['take-insurance', 'decline-insurance', 'take-even-money'], evenMoneyEligible: true,
    })
  })

  it.each<Rank>(['10', 'J', 'Q', 'K'])('requires a peek but never Insurance for dealer %s', (rank) => {
    expect(evaluatePlayerDecision(hand(['8', '3']), context({
      dealerUpcard: { rank, suit: 'spades' }, dealerPeek: 'pending',
    }), BASELINE_RULE_PROFILE)).toEqual({ phase: 'dealer-peek', actions: [] })
  })

  it.each(['declined', 'insurance-taken'] as const)('waits for the peek after Insurance is %s', (sideDecision) => {
    expect(evaluatePlayerDecision(hand(['8', '3']), { ...acePending, sideDecision }, BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'dealer-peek', actions: [] })
  })

  it('allows ordinary decisions only after a clear required peek', () => {
    expect(evaluatePlayerDecision(hand(['8', '3']), aceClear, BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'player', actions: ['hit', 'stand', 'double'] })
    expect(evaluatePlayerDecision(hand(['A', 'K']), aceClear, BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'terminal', reason: 'natural-blackjack', actions: [] })
  })

  it.each<Rank[]>([['8', '3'], ['A', 'K']])('terminates when the peek finds dealer Blackjack against %s', (...ranks) => {
    expect(evaluatePlayerDecision(hand(ranks), { ...aceClear, dealerPeek: 'blackjack' }, BASELINE_RULE_PROFILE))
      .toEqual({ phase: 'terminal', reason: 'dealer-blackjack', actions: [] })
  })

  it.each([
    { numerator: 6, denominator: 5, eligible: false },
    { numerator: 6, denominator: 4, eligible: true },
  ])('requires a payout equivalent to 3:2, not $numerator:$denominator', ({ numerator, denominator, eligible }) => {
    const decision = evaluatePlayerDecision(hand(['A', 'K']), acePending, rules({ blackjackPayout: { numerator, denominator } }))
    expect(decision).toMatchObject({ phase: 'insurance', actions: [], evenMoneyEligible: eligible })
    if (decision.phase === 'insurance') expect(decision.sideActions.includes('take-even-money')).toBe(eligible)
  })

  it('closes a hand when Even Money was explicitly accepted, without calculating settlement', () => {
    expect(evaluatePlayerDecision(hand(['A', 'K']), {
      ...acePending, sideDecision: 'even-money-taken',
    }, BASELINE_RULE_PROFILE)).toEqual({ phase: 'terminal', reason: 'even-money', actions: [] })
  })

  it('keeps Insurance separate even for an explicitly configured no-peek profile', () => {
    const profile = rules({ dealerBlackjackCheck: 'no-peek' })
    expect(evaluatePlayerDecision(hand(['8', '3']), { ...acePending, dealerPeek: 'not-required' }, profile).phase)
      .toBe('insurance')
    expect(evaluatePlayerDecision(hand(['8', '3']), {
      ...aceClear, dealerPeek: 'not-required',
    }, profile).phase).toBe('player')
  })
})

describe('contradictory contexts fail closed', () => {
  it.each<{
    name: string; input: Hand; decisionContext?: PlayerDecisionContext; profile?: RuleProfile
  }>([
    { name: 'three cards without a recorded draw', input: hand(['2', '3', '5']) },
    { name: 'a recorded hit without its card', input: hand(['2', '3'], ['hit']) },
    { name: 'an incomplete original deal', input: hand(['A']) },
    { name: 'action after standing', input: hand(['2', '3', '5'], ['stand', 'hit']) },
    { name: 'Double after Hit', input: hand(['2', '3', '4', '5'], ['hit', 'double']) },
    { name: 'Split after Hit', input: hand(['2', '3', '4'], ['hit', 'split']) },
    { name: 'draw after a natural', input: hand(['A', 'K', '2'], ['hit']) },
    { name: 'draw after bust', input: hand(['10', '9', '5', 'A'], ['hit', 'hit']) },
    { name: 'split history without an exact pair', input: hand(['10', 'J'], ['split']), decisionContext: context({ handsInRound: 2 }) },
    { name: 'missing split provenance', input: hand(['8', '3'], [], 'split') },
    { name: 'wrong retained split rank', input: hand(['8', '3'], [], 'split'), decisionContext: splitContext('A') },
    { name: 'an original hand with a split rank', input: hand(['8', '3']), decisionContext: splitContext('8') },
    { name: 'an original hand in an already split round', input: hand(['8', '3']), decisionContext: context({ handsInRound: 2 }) },
    { name: 'zero hands', input: hand(['8', '3']), decisionContext: context({ handsInRound: 0 }) },
    { name: 'fractional hands', input: hand(['8', '3']), decisionContext: context({ handsInRound: 1.5 }) },
    { name: 'too many hands', input: hand(['8', '3'], [], 'split'), decisionContext: splitContext('8', 5) },
    { name: 'draw after split-Ace replacement', input: hand(['A', '2', '3'], ['hit'], 'split'), decisionContext: splitContext('A') },
    { name: 'disabled Ace resplit already recorded', input: hand(['A', 'A'], ['split'], 'split'), decisionContext: splitContext('A', 3) },
    { name: 'DAS forbidden but already recorded', input: hand(['8', '3', '4'], ['double'], 'split'), decisionContext: splitContext('8'), profile: rules({ doubleAfterSplit: false }) },
    { name: 'restricted Double already recorded', input: hand(['8', '5', '4'], ['double']), profile: rules({ doubleRestriction: 'hard-10-11' }) },
    { name: 'required peek marked unnecessary', input: hand(['8', '3']), decisionContext: { ...aceClear, dealerPeek: 'not-required' } },
    { name: 'peek pending against a six', input: hand(['8', '3']), decisionContext: context({ dealerPeek: 'pending' }) },
    { name: 'clear peek against a six', input: hand(['8', '3']), decisionContext: context({ dealerPeek: 'clear' }) },
    { name: 'dealer Blackjack against a six', input: hand(['8', '3']), decisionContext: context({ dealerPeek: 'blackjack' }) },
    { name: 'peek before resolving Insurance', input: hand(['8', '3']), decisionContext: { ...acePending, dealerPeek: 'clear' } },
    { name: 'Insurance against a non-Ace', input: hand(['8', '3']), decisionContext: context({ sideDecision: 'pending' }) },
    { name: 'skipped Ace Insurance phase', input: hand(['8', '3']), decisionContext: { ...acePending, sideDecision: 'not-applicable' } },
    { name: 'Hit before the required peek', input: hand(['2', '3', '4'], ['hit']), decisionContext: { ...acePending, sideDecision: 'declined' } },
    { name: 'Split before the required peek', input: hand(['8', '3'], [], 'split'), decisionContext: { ...aceClear, dealerPeek: 'pending', handsInRound: 2, splitFromRank: '8' } },
    { name: 'Even Money without a natural', input: hand(['8', '3']), decisionContext: { ...acePending, sideDecision: 'even-money-taken' } },
    { name: 'Even Money at a 6:5 payout', input: hand(['A', 'K']), decisionContext: { ...acePending, sideDecision: 'even-money-taken' }, profile: rules({ blackjackPayout: { numerator: 6, denominator: 5 } }) },
    { name: 'surrender forbidden but recorded', input: hand(['8', '3']), decisionContext: context({ surrendered: true }) },
    { name: 'surrender after Hit', input: hand(['2', '3', '4'], ['hit']), decisionContext: context({ surrendered: true }), profile: rules({ surrender: 'late' }) },
    { name: 'surrender of a natural', input: hand(['A', 'K']), decisionContext: { ...aceClear, surrendered: true }, profile: rules({ surrender: 'late' }) },
    { name: 'invalid profile limits', input: hand(['8', '3']), profile: rules({ maxSplitHands: 0 }) },
    { name: 'invalid payout denominator', input: hand(['8', '3']), profile: rules({ blackjackPayout: { numerator: 3, denominator: 0 } }) },
    { name: 'unknown peek state', input: hand(['8', '3']), decisionContext: { ...aceClear, dealerPeek: 'unresolved' as PlayerDecisionContext['dealerPeek'] } },
    { name: 'unknown side-decision status', input: hand(['8', '3']), decisionContext: { ...aceClear, sideDecision: 'unresolved' as PlayerDecisionContext['sideDecision'] } },
    { name: 'unknown hand action', input: hand(['8', '3'], ['insurance' as HandAction]) },
    { name: 'unknown card rank', input: hand(['1' as Rank, '3']) },
    { name: 'unknown dealer rank', input: hand(['8', '3']), decisionContext: context({ dealerUpcard: { rank: '1' as Rank, suit: 'spades' } }) },
    { name: 'unknown profile setting', input: hand(['8', '3']), profile: rules({ dealerSoft17: 'unknown' as RuleSettings['dealerSoft17'] }) },
    { name: 'unversioned profile', input: hand(['8', '3']), profile: { ...rules({}), version: 0 } },
  ])('rejects $name', ({ input, decisionContext, profile }) => {
    const decision = evaluatePlayerDecision(input, decisionContext ?? context(), profile ?? BASELINE_RULE_PROFILE)
    expect(decision).toMatchObject({ phase: 'invalid', actions: [] })
    if (decision.phase === 'invalid') expect(decision.reason.length).toBeGreaterThan(0)
  })

  it('does not mutate caller-owned hand, context, or profile data', () => {
    const input = hand(['8', '8'])
    const decisionContext = context()
    const profile = rules({})
    const before = structuredClone({ input, decisionContext, profile })
    evaluatePlayerDecision(input, decisionContext, profile)
    expect({ input, decisionContext, profile }).toEqual(before)
  })
})
