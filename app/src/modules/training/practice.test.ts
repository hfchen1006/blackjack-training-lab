import { describe, expect, it } from 'vitest'
import { answerPractice, nextPractice, startPractice } from './practice'
import { trainingConfig } from './training-flow'

describe('pure Practice transitions', () => {
  it('locks the answer and requires feedback before advancing', () => {
    const state = startPractice(trainingConfig())
    expect(nextPractice(state)).toBe(state)
    expect(answerPractice(state, 'surrender')).toBe(state)
    if (state.current.kind !== 'generated') throw new Error('Expected generated question')
    const answer = state.current.answerKey.decision.action
    const answered = answerPractice(state, answer)
    expect(answered.feedback).toMatchObject({ correct: true, selected: answer, recommended: answer })
    expect(answerPractice(answered, answer)).toBe(answered)
    expect(nextPractice(answered)).toMatchObject({ index: 1, feedback: null })
    expect(state.feedback).toBeNull()
  })
})
