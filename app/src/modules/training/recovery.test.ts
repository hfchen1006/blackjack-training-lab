import { afterEach, describe, expect, it, vi } from 'vitest'
import * as generator from './question-generator'
import { answerPractice, nextPractice, retryPractice, startPractice } from './practice'
import { trainingConfig } from './training-flow'
import { advanceSpeedRun, answerSpeedRun, readySpeedRun, retrySpeedRun, speedRunConfig, speedRunReport, startSpeedRun } from './speed-run'

afterEach(() => vi.restoreAllMocks())
type Failure = Extract<generator.QuestionGenerationResult, { kind: 'failure' }>
function failure(reason: Failure['reason'] = 'attempt-limit', attempts = 2048): Failure {
  return { kind: 'failure', generatorVersion: generator.QUESTION_GENERATOR_VERSION, reason, attempts, lastRejection: null }
}

describe('bounded deterministic recovery', () => {
  it('recovers the confirmed challenge-276 Practice fixture at attempt 2090 without changing its request identity', () => {
    const spy = vi.spyOn(generator, 'generateQuestion')
    const initial = startPractice(trainingConfig('challenge-276', 'even-money'))
    expect(initial.current).toMatchObject({ kind: 'failure', reason: 'attempt-limit', attempts: 2048 })
    const recovered = retryPractice(initial)
    if (recovered.current.kind !== 'generated') throw new Error('Expected confirmed extended recovery')
    expect(recovered.current.answerKey.evidence.attempt).toBe(2090)
    expect(recovered.current.question.id).toBe('question-generator-v1:even-money:0:5cce7c68daa85b1c')
    expect(recovered.index).toBe(0)
    expect(recovered.attemptBudget).toBe(4096)
    expect(spy.mock.calls.map(([input]) => input.maxAttempts)).toEqual([2048, 4096])
    expect({ ...spy.mock.calls[1][0], maxAttempts: 2048 }).toEqual(spy.mock.calls[0][0])
    expect(retryPractice(recovered)).toBe(recovered)
    const next = nextPractice(answerPractice(recovered, recovered.current.answerKey.decision.action))
    expect(next).toMatchObject({ index: 1, attemptBudget: 2048 })
    expect(spy.mock.calls[2][0]).toMatchObject({ questionIndex: 1, maxAttempts: 2048 })
  })

  it('recovers the same Speed Run fixture without counting failure/recovery time or creating duplicate answers', () => {
    const spy = vi.spyOn(generator, 'generateQuestion')
    let state = startSpeedRun(speedRunConfig('challenge-276', 'even-money', 25))
    const savedRecords = state.records
    expect(state).toMatchObject({ phase: 'error', index: 0, elapsedMs: 0 })
    state = retrySpeedRun(state)
    expect(state).toMatchObject({ phase: 'ready', index: 0, attemptBudget: 4096, elapsedMs: 0 })
    expect(state.records).toBe(savedRecords)
    expect({ ...spy.mock.calls[1][0], maxAttempts: 2048 }).toEqual(spy.mock.calls[0][0])
    state = readySpeedRun(state, 10000)
    if (state.current.kind !== 'generated') throw new Error('Expected recovery')
    expect(state.current.answerKey.evidence.attempt).toBe(2090)
    const question = state.current
    state = answerSpeedRun(state, question.answerKey.decision.action, 10050, question.question.id)
    expect(state.records).toHaveLength(1)
    expect(state.records[0]).toMatchObject({ questionIndex: 0, durationMs: 50, correct: true })
    expect(state.elapsedMs).toBe(50)
    expect(answerSpeedRun(state, question.answerKey.decision.action, 10051, question.question.id)).toBe(state)
    state = advanceSpeedRun(state)
    expect(state).toMatchObject({ index: 1, attemptBudget: 2048 })
    expect(speedRunReport(state)).toBeNull()
  })

  it('exhausts at most one extended retry in either mode and never advances a failed index', () => {
    const spy = vi.spyOn(generator, 'generateQuestion').mockImplementation((input) => failure('attempt-limit', input.maxAttempts))
    const practice = retryPractice(startPractice(trainingConfig()))
    expect(practice).toMatchObject({ index: 0, attemptBudget: 4096, feedback: null })
    expect(practice.current).toMatchObject({ kind: 'failure', attempts: 4096 })
    expect(retryPractice(practice)).toBe(practice)
    expect(nextPractice(practice)).toBe(practice)
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockClear()
    const run = retrySpeedRun(startSpeedRun())
    expect(run).toMatchObject({ phase: 'error', index: 0, attemptBudget: 4096, records: [], elapsedMs: 0 })
    expect(retrySpeedRun(run)).toBe(run)
    expect(advanceSpeedRun(run)).toBe(run)
    expect(speedRunReport(run)).toBeNull()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not retry invalid or unsupported failures with an identical or larger budget', () => {
    const spy = vi.spyOn(generator, 'generateQuestion')
    for (const reason of ['invalid-request', 'unsupported-generator-version', 'unsupported-profile', 'engine-rejected'] as const) {
      spy.mockClear().mockReturnValue(failure(reason, 0))
      const practice = startPractice(trainingConfig())
      const run = startSpeedRun()
      expect(retryPractice(practice)).toBe(practice)
      expect(retrySpeedRun(run)).toBe(run)
      expect(spy).toHaveBeenCalledTimes(2)
    }
  })
})
