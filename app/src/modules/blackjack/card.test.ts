import { describe, expect, it } from 'vitest'
import { getCardIdentity, getCardValue, RANKS, SUITS } from './card'
import type { BlackjackValue, Rank } from './card'

describe('card values', () => {
  it.each<{ rank: Rank; value: BlackjackValue }>([
    { rank: 'A', value: 1 },
    { rank: '2', value: 2 },
    { rank: '3', value: 3 },
    { rank: '4', value: 4 },
    { rank: '5', value: 5 },
    { rank: '6', value: 6 },
    { rank: '7', value: 7 },
    { rank: '8', value: 8 },
    { rank: '9', value: 9 },
    { rank: '10', value: 10 },
    { rank: 'J', value: 10 },
    { rank: 'Q', value: 10 },
    { rank: 'K', value: 10 },
  ])('$rank has base value $value regardless of suit', ({ rank, value }) => {
    for (const suit of SUITS) {
      expect(getCardValue({ rank, suit })).toBe(value)
    }
  })
})

describe('card identity', () => {
  it('distinguishes all 52 rank/suit combinations, including ten-value ranks', () => {
    const identities = RANKS.flatMap((rank) =>
      SUITS.map((suit) => getCardIdentity({ rank, suit })),
    )

    expect(new Set(identities).size).toBe(52)
    expect(getCardIdentity({ rank: 'A', suit: 'spades' })).toBe('A:spades')
    expect(getCardIdentity({ rank: '10', suit: 'hearts' })).not.toBe(
      getCardIdentity({ rank: 'J', suit: 'hearts' }),
    )
  })
})
