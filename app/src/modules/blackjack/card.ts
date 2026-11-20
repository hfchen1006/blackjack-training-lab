export const RANKS = Object.freeze([
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
] as const)

export const SUITS = Object.freeze([
  'hearts', 'diamonds', 'clubs', 'spades',
] as const)

export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]
export type BlackjackValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type Card = {
  readonly rank: Rank
  readonly suit: Suit
}

// Rank/suit identity, not a unique physical copy in a multi-deck shoe.
export type CardIdentity = `${Rank}:${Suit}`

const RANK_VALUES: Readonly<Record<Rank, BlackjackValue>> = Object.freeze({
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 10,
  Q: 10,
  K: 10,
})

/** Aces start at 1; promotion to 11 belongs to hand evaluation. */
export function getCardValue(card: Card): BlackjackValue {
  return RANK_VALUES[card.rank]
}

export function getCardIdentity(card: Card): CardIdentity {
  return `${card.rank}:${card.suit}`
}
