import { afterEach, describe, expect, it, vi } from 'vitest'
import { advanceSpeedRun, answerSpeedRun, pauseSpeedRun, readySpeedRun, resumeSpeedRun, retrySpeedRun, speedRunConfig, speedRunReport, startSpeedRun } from './speed-run'
import * as generator from './question-generator'

afterEach(() => vi.restoreAllMocks())

describe('pure Speed Run transitions', () => {
  it('defaults to 50 Balanced questions with a versioned distribution selection', () => {
    expect(speedRunConfig()).toMatchObject({ questionCount: 50, selection: { kind: 'distribution', distribution: 'balanced', version: 'training-distribution-v1' } })
    const state = startSpeedRun()
    expect(state).toMatchObject({ phase: 'ready', index: 0, records: [], questionStartedAt: null })
    expect(speedRunReport(state)).toBeNull()
  })

  it.each([25, 50, 100] as const)('completes %s sequential questions with exact records and a final-only report', (count) => {
    let state = startSpeedRun(speedRunConfig('session-test', 'initial', count))
    for (let index = 0; index < count; index += 1) {
      const readyAt = 100 + index * 1000
      state = readySpeedRun(state, readyAt)
      if (state.current.kind !== 'generated') throw new Error('Expected a question')
      const current = state.current
      const answer = index === 0 ? current.question.selectableAnswers.find((item) => item !== current.answerKey.decision.action)! : current.answerKey.decision.action
      const before = state
      state = answerSpeedRun(state, answer, readyAt + 40, current.question.id)
      expect(before.records).toHaveLength(index)
      expect(state.records.at(-1)).toMatchObject({ questionIndex: index, selected: answer, recommended: current.answerKey.decision.action, durationMs: 40 })
      expect(answerSpeedRun(state, answer, readyAt + 45, current.question.id)).toBe(state)
      if (index < count - 1) {
        expect(speedRunReport(state)).toBeNull()
        state = advanceSpeedRun(state)
        const independentlyGenerated = generator.generateQuestion({ seed: 'session-test', scenario: 'initial', questionIndex: index + 1, profile: state.config.profile })
        expect(state.current).toEqual(independentlyGenerated)
      }
    }
    const report = speedRunReport(state)!
    expect(state.phase).toBe('complete')
    expect(report).toMatchObject({ total: count, correct: count - 1, incorrect: 1, elapsedMs: count * 40, averageResponseMs: 40 })
    expect(report.accuracyPercent).toBeCloseTo((count - 1) / count * 100)
    expect(report.records.map((record) => record.questionIndex)).toEqual(Array.from({ length: count }, (_, i) => i))
    expect(advanceSpeedRun(state)).toBe(state)
    expect(startSpeedRun(state.config)).toMatchObject({ index: 0, records: [], phase: 'ready' })
  })

  it('starts only when ready, rejects bad timestamps/stale events, and excludes paused and transition time', () => {
    let state = startSpeedRun()
    if (state.current.kind !== 'generated') throw new Error('Expected a question')
    const firstId = state.current.question.id
    const answer = state.current.answerKey.decision.action
    expect(answerSpeedRun(state, answer, 10, firstId)).toBe(state)
    state = readySpeedRun(state, 100)
    expect(answerSpeedRun(state, answer, 99, firstId)).toBe(state)
    expect(answerSpeedRun(state, answer, Number.NaN, firstId)).toBe(state)
    expect(answerSpeedRun(state, 'surrender', 120, firstId)).toBe(state)
    state = pauseSpeedRun(state, 150)
    expect(state.accumulatedQuestionMs).toBe(50)
    expect(answerSpeedRun(state, answer, 200, firstId)).toBe(state)
    state = resumeSpeedRun(state, 1000)
    state = readySpeedRun(state, 1100)
    state = answerSpeedRun(state, answer, 1200, firstId)
    expect(state.records[0].durationMs).toBe(150)
    state = advanceSpeedRun(state)
    state = readySpeedRun(state, 5000)
    if (state.current.kind !== 'generated') throw new Error('Expected next question')
    expect(answerSpeedRun(state, state.current.answerKey.decision.action, 5050, firstId)).toBe(state)
    state = answerSpeedRun(state, state.current.answerKey.decision.action, 5100, state.current.question.id)
    expect(state.elapsedMs).toBe(250)
    expect(state.records[1].durationMs).toBe(100)
  })

  it.each(['continuing', 'split', 'insurance', 'even-money'] as const)('uses the selected %s scenario and supplied answer key', (scenario) => {
    let state = readySpeedRun(startSpeedRun(speedRunConfig('golden', scenario, 25)), 0)
    if (state.current.kind !== 'generated') throw new Error('Expected scenario')
    const current = state.current
    expect(current.question.scenario).toBe(scenario)
    state = answerSpeedRun(state, current.answerKey.decision.action, 100, current.question.id)
    expect(state.records[0]).toMatchObject({ correct: true, recommended: current.answerKey.decision.action })
  })

  it('keeps failed indices and records fixed, and excludes recovery time', () => {
    let state = readySpeedRun(startSpeedRun(speedRunConfig('golden', 'initial', 25)), 0)
    if (state.current.kind !== 'generated') throw new Error('Expected question')
    state = answerSpeedRun(state, state.current.answerKey.decision.action, 50, state.current.question.id)
    const failure = { kind: 'failure', generatorVersion: generator.QUESTION_GENERATOR_VERSION, reason: 'attempt-limit', attempts: 2048, lastRejection: null } as const
    const spy = vi.spyOn(generator, 'generateQuestion').mockReturnValueOnce(failure)
    const savedRecords = state.records
    const savedTimestamp = state.lastTimestamp
    state = advanceSpeedRun(state)
    expect(state).toMatchObject({ phase: 'error', index: 1, elapsedMs: 50 })
    expect(state.records).toHaveLength(1)
    state = retrySpeedRun(state)
    expect(state.records).toBe(savedRecords)
    expect(state.lastTimestamp).toBe(savedTimestamp)
    expect(state).toMatchObject({ elapsedMs: 50, accumulatedQuestionMs: 0 })
    expect(spy.mock.calls.map(([input]) => input.questionIndex)).toEqual([1, 1])
    expect(spy.mock.calls.map(([input]) => input.maxAttempts)).toEqual([2048, 4096])
    state = readySpeedRun(state, 10000)
    if (state.current.kind !== 'generated') throw new Error('Expected recovery')
    state = answerSpeedRun(state, state.current.answerKey.decision.action, 10050, state.current.question.id)
    expect(state.records[1].durationMs).toBe(50)
    expect(state.elapsedMs).toBe(100)
  })
})
