import { RANKS, SUITS } from '../blackjack/card'
import type { Card } from '../blackjack/card'

export type PhysicalCard = {
  readonly physicalId: string
  readonly copy: number
  readonly card: Card
}

/** Versioned generator primitive: FNV-style hashing over UTF-16 code units. */
export function hashSeed(text: string, initial = 0x811c9dc5): number {
  let hash = initial >>> 0
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0
  }
  return hash
}

/** Local xorshift32 stream; no global randomness or platform-dependent ordering. */
export function createRandom(seed: string): (upperExclusive: number) => number {
  let state = hashSeed(seed) || 0x9e3779b9
  return (upperExclusive) => {
    if (!Number.isSafeInteger(upperExclusive) || upperExclusive < 1) throw new RangeError('invalid-random-bound')
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return Math.floor((state >>> 0) / 0x100000000 * upperExclusive)
  }
}

/** Swap/pop draws reserve physical copies without replacement. Internal API. */
export function createShoe(decks: number, nextInt: (upperExclusive: number) => number) {
  const remaining: PhysicalCard[] = []
  for (let copy = 0; copy < decks; copy += 1) {
    for (const rank of RANKS) for (const suit of SUITS) {
      remaining.push({ physicalId: `${copy}:${rank}:${suit}`, copy, card: { rank, suit } })
    }
  }
  return {
    draw(): PhysicalCard {
      if (remaining.length === 0) throw new RangeError('empty-shoe')
      const index = nextInt(remaining.length)
      const selected = remaining[index]
      const last = remaining.pop()!
      if (index < remaining.length) remaining[index] = last
      return selected
    },
  }
}
