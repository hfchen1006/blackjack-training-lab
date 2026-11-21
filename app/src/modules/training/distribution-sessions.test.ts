import { afterEach, expect, it, vi } from 'vitest'
import * as distribution from './distribution'
import { answerPractice, nextPractice, retryPractice, startPractice } from './practice'
import { advanceSpeedRun, answerSpeedRun, readySpeedRun, retrySpeedRun, speedRunConfig, speedRunReport, startSpeedRun } from './speed-run'
import { trainingConfig } from './training-flow'

afterEach(() => vi.restoreAllMocks())

it.each([25, 50, 100] as const)('completes %i Balanced answers with exact quotas, ordered metadata and unchanged timing', (length) => {
  let run = startSpeedRun(speedRunConfig('completed-quota', 'balanced', length))
  const originalConfig = structuredClone(run.config)
  for (let index = 0; index < length; index += 1) {
    run = readySpeedRun(run, 1000 * index)
    if (run.current.kind !== 'generated') throw new Error(JSON.stringify(run.current))
    run = answerSpeedRun(run, run.current.answerKey.decision.action, 1000 * index + 50, run.current.question.id)
    if (index < length - 1) { expect(speedRunReport(run)).toBeNull(); run = advanceSpeedRun(run) }
  }
  const report = speedRunReport(run)!
  const categories = { hard: 0, soft: 0, pair: 0 }
  for (const [index, record] of report.records.entries()) {
    expect(record.distribution).toMatchObject({ version: distribution.DISTRIBUTION_VERSION, name: 'balanced', seed: 'completed-quota', questionIndex: index })
    categories[record.distribution!.actualCategory] += 1
    expect(record.question.selectableAnswers).toContain(record.recommended)
  }
  expect(Math.max(...Object.values(categories)) - Math.min(...Object.values(categories))).toBeLessThanOrEqual(1)
  expect(report).toMatchObject({ correct: length, elapsedMs: 50 * length, averageResponseMs: 50, config: originalConfig })
  expect(run.config).toEqual(originalConfig)
})

it('uses the same versioned API in Practice/Speed Run, retaining direct Realistic order and record metadata', () => {
  const spy = vi.spyOn(distribution, 'generateDistributedQuestion')
  let practice = startPractice(trainingConfig('shared', 'realistic'))
  let run = startSpeedRun(speedRunConfig('shared', 'realistic', 25))
  for (let index = 0; index < 5; index += 1) {
    expect(run.current).toEqual(practice.current)
    if (run.current.kind !== 'generated') throw new Error('Expected question')
    const answer = run.current.answerKey.decision.action
    const questionId = run.current.question.id
    practice = nextPractice(answerPractice(practice, answer))
    run = readySpeedRun(run, index * 1000)
    run = advanceSpeedRun(answerSpeedRun(run, answer, index * 1000 + 75, questionId))
    expect(run.records[index].distribution).toMatchObject({ name: 'realistic', requestedCategory: null, actualProvenance: 'initial' })
  }
  expect(spy.mock.calls.every(([input]) => input.distribution === 'realistic' && input.distributionVersion === distribution.DISTRIBUTION_VERSION)).toBe(true)
})

it('retries a category failure once at the same seed/index/plan and preserves completed answers', () => {
  const actual = distribution.generateDistributedQuestion
  const failure = actual({ seed: 'retry-plan', questionIndex: 1, distribution: 'balanced', profile: trainingConfig().profile, generatorVersion: 'future' })
  if (failure.kind !== 'failure') throw new Error('Expected fixture')
  const spy = vi.spyOn(distribution, 'generateDistributedQuestion').mockImplementation((input) => input.questionIndex === 1
    ? { ...failure, reason: 'category-attempt-limit', source: 'category', candidatesExamined: input.maxCandidates! }
    : actual(input))
  let run = readySpeedRun(startSpeedRun(speedRunConfig('retry-plan', 'balanced', 25)), 0)
  let practice = startPractice(trainingConfig('retry-plan', 'balanced'))
  if (run.current.kind !== 'generated') throw new Error('Expected question')
  const answer = run.current.answerKey.decision.action
  practice = nextPractice(answerPractice(practice, answer))
  run = advanceSpeedRun(answerSpeedRun(run, answer, 80, run.current.question.id))
  const savedRecords = run.records
  const savedFailure = run.current
  run = retrySpeedRun(run)
  practice = retryPractice(practice)
  expect(run).toMatchObject({ index: 1, phase: 'error', elapsedMs: 80, attemptBudget: 4096 })
  expect(run.records).toBe(savedRecords)
  expect(practice).toMatchObject({ index: 1, feedback: null, attemptBudget: 4096 })
  expect(run.current).toEqual(practice.current)
  expect(run.current).toEqual({ ...savedFailure, candidatesExamined: 256 })
  expect(retrySpeedRun(run)).toBe(run)
  expect(retryPractice(practice)).toBe(practice)
  expect(nextPractice(practice)).toBe(practice)
  const retries = spy.mock.calls.filter(([input]) => input.questionIndex === 1).map(([input]) => input)
  expect(retries.map((input) => [input.seed, input.questionIndex, input.maxCandidates, input.maxAttempts])).toEqual([
    ['retry-plan', 1, 128, 2048], ['retry-plan', 1, 128, 2048], ['retry-plan', 1, 256, 4096], ['retry-plan', 1, 256, 4096],
  ])
  expect(speedRunReport(run)).toBeNull()
})
