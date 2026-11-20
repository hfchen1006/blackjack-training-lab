import { describe, expect, it } from 'vitest'
import type { Rank } from './card'
import { evaluateHand, isExactRankPair, isNaturalBlackjack } from './hand'
import type { Hand, HandHistory } from './hand'

function hand(
  ranks: readonly Rank[],
  history: HandHistory = { origin: 'initial-deal', actions: [] },
): Hand {
  return { cards: ranks.map((rank) => ({ rank, suit: 'hearts' })), history }
}

describe('hand totals', () => {
  it.each<{ ranks: Rank[]; total: number; isSoft: boolean }>([
    { ranks: ['A', '7'], total: 18, isSoft: true },
    { ranks: ['A', 'A'], total: 12, isSoft: true },
    { ranks: ['A', 'A', '9'], total: 21, isSoft: true },
    { ranks: ['A', 'A', '9', 'K'], total: 21, isSoft: false },
    { ranks: ['A', '9', '5'], total: 15, isSoft: false },
    { ranks: ['A', '6', 'K'], total: 17, isSoft: false },
    { ranks: ['A', 'A', 'A', '8'], total: 21, isSoft: true },
    { ranks: ['A', 'A', 'A', 'A', '9'], total: 13, isSoft: false },
    { ranks: ['7', '7', '7'], total: 21, isSoft: false },
  ])('$ranks evaluates to $total (soft: $isSoft)', ({ ranks, total, isSoft }) => {
    expect(evaluateHand(hand(ranks))).toMatchObject({
      total,
      isSoft,
      isBust: false,
      cardCount: ranks.length,
    })
  })

  it('changes a soft hand to hard after a hit without altering its history', () => {
    const initial = hand(['A', '6'])
    const afterHit = hand(['A', '6', 'K'], { origin: 'initial-deal', actions: ['hit'] })

    expect(evaluateHand(initial)).toMatchObject({ total: 17, isSoft: true, cardCount: 2 })
    expect(evaluateHand(afterHit)).toMatchObject({ total: 17, isSoft: false, cardCount: 3 })
    expect(afterHit.history.actions).toEqual(['hit'])
  })

  it.each<{ ranks: Rank[]; minimumTotal: number }>([
    { ranks: ['K', 'Q', '2'], minimumTotal: 22 },
    { ranks: ['K', 'Q', 'J'], minimumTotal: 30 },
    { ranks: ['A', 'A', 'A', 'K', 'Q'], minimumTotal: 23 },
  ])('returns the minimum total for busted $ranks', ({ ranks, minimumTotal }) => {
    expect(evaluateHand(hand(ranks))).toMatchObject({
      total: minimumTotal,
      isBust: true,
      isSoft: false,
      isNaturalBlackjack: false,
      cardCount: ranks.length,
    })
  })

  it('defines empty and single-card evaluation without assuming a complete deal', () => {
    expect(evaluateHand(hand([]))).toEqual({
      total: 0,
      isSoft: false,
      isBust: false,
      isNaturalBlackjack: false,
      isExactRankPair: false,
      cardCount: 0,
    })
    expect(evaluateHand(hand(['A']))).toMatchObject({
      total: 11, isSoft: true, isBust: false, isNaturalBlackjack: false, cardCount: 1,
    })
  })

  it('evaluates frozen inputs without mutating cards or history', () => {
    const input = hand(['A', 'A', '9'], { origin: 'initial-deal', actions: ['hit'] })
    const before = structuredClone(input)
    input.cards.forEach(Object.freeze)
    Object.freeze(input.cards)
    Object.freeze(input.history.actions)
    Object.freeze(input.history)
    Object.freeze(input)

    expect(evaluateHand(input)).toMatchObject({ total: 21, isSoft: true })
    expect(input).toEqual(before)
  })
})

describe('natural Blackjack', () => {
  it.each<Rank>(['10', 'J', 'Q', 'K'])('recognizes Ace + %s in either order', (rank) => {
    for (const ranks of [['A', rank], [rank, 'A']] satisfies Rank[][]) {
      const input = hand(ranks)
      expect(isNaturalBlackjack(input)).toBe(true)
      expect(evaluateHand(input)).toMatchObject({
        total: 21, isSoft: true, isBust: false, isNaturalBlackjack: true, cardCount: 2,
      })
    }
  })

  it('distinguishes split-hand 21 from an original natural with identical cards', () => {
    const original = hand(['A', 'K'])
    const split = hand(['A', 'K'], { origin: 'split', actions: [] })

    expect(isNaturalBlackjack(original)).toBe(true)
    expect(evaluateHand(split)).toMatchObject({
      total: 21, isSoft: true, isNaturalBlackjack: false, cardCount: 2,
    })
  })

  it('uses explicit prior actions rather than treating two cards as proof of an untouched deal', () => {
    for (const action of ['hit', 'double', 'split'] as const) {
      const input = hand(['A', 'K'], { origin: 'initial-deal', actions: [action] })
      expect(isNaturalBlackjack(input)).toBe(false)
      expect(evaluateHand(input).isNaturalBlackjack).toBe(false)
    }
  })

  it('preserves natural classification when only a stand has been recorded', () => {
    expect(isNaturalBlackjack(hand(['A', 'K'], {
      origin: 'initial-deal', actions: ['stand'],
    }))).toBe(true)
  })

  it('rejects non-natural two-card hands and multi-card totals of 21', () => {
    const examples: Rank[][] = [['A', '9'], ['10', 'J'], ['A', 'A'], ['A', '5', '5'], ['7', '7', '7']]
    for (const ranks of examples) {
      const input = hand(ranks)
      expect(isNaturalBlackjack(input)).toBe(false)
      expect(evaluateHand(input).isNaturalBlackjack).toBe(false)
    }
  })
})

describe('exact-rank pairs', () => {
  it('recognizes rank equality only for two-card hands, independently of value or suit', () => {
    const pairs: Rank[][] = [['8', '8'], ['A', 'A'], ['K', 'K']]
    const nonPairs: Rank[][] = [[], ['8'], ['8', '8', '8'], ['10', 'J'], ['J', 'Q'], ['8', '9']]
    for (const ranks of pairs) {
      const input = hand(ranks)
      expect(isExactRankPair(input.cards)).toBe(true)
      expect(evaluateHand(input).isExactRankPair).toBe(true)
    }
    for (const ranks of nonPairs) {
      const input = hand(ranks)
      expect(isExactRankPair(input.cards)).toBe(false)
      expect(evaluateHand(input).isExactRankPair).toBe(false)
    }
    expect(isExactRankPair([
      { rank: '8', suit: 'hearts' }, { rank: '8', suit: 'spades' },
    ])).toBe(true)
  })
})
