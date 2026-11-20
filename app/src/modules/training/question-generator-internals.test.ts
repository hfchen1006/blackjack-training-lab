import { describe, expect, it } from 'vitest'
import { getCardIdentity } from '../blackjack/card'
import { createRandom, createShoe } from './question-generator-internals'

describe('generator v1 primitives', () => {
  it('locks the deterministic integer stream and keeps streams local', () => {
    const first = createRandom('golden')
    expect(Array.from({ length: 8 }, () => first(312))).toEqual([301, 216, 172, 55, 62, 148, 82, 76])
    const second = createRandom('golden')
    expect(second(312)).toBe(301)
    expect(() => second(0)).toThrow('invalid-random-bound')
  })

  it('exhausts a complete six-deck shoe without repeating any physical copy', () => {
    const shoe = createShoe(6, createRandom('whole-shoe'))
    const drawn = Array.from({ length: 312 }, () => shoe.draw())
    expect(new Set(drawn.map((item) => item.physicalId)).size).toBe(312)
    const counts = new Map<string, number>()
    for (const item of drawn) {
      expect(item.copy).toBeGreaterThanOrEqual(0)
      expect(item.copy).toBeLessThan(6)
      expect(item.physicalId).toBe(`${item.copy}:${getCardIdentity(item.card)}`)
      const key = getCardIdentity(item.card)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.size).toBe(52)
    expect([...counts.values()]).toEqual(Array(52).fill(6))
    expect(() => shoe.draw()).toThrow('empty-shoe')
  })
})
