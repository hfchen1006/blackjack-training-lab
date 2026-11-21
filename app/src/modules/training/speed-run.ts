import { assessAnswer, canExtendGeneration, DEFAULT_ATTEMPTS, EXTENDED_ATTEMPTS, loadQuestion, trainingConfig } from './training-flow'
import type { Answer, AnswerFeedback, GenerationBudget, TrainingConfig } from './training-flow'
import type { QuestionGenerationResult, QuestionScenario } from './question-generator'

export type SessionLength = 25 | 50 | 100
export type SpeedRunConfig = TrainingConfig & { readonly questionCount: SessionLength }
export type AnswerRecord = AnswerFeedback & { readonly questionIndex: number; readonly durationMs: number }
type RunningPhase = 'ready' | 'answering' | 'transition'
export type SpeedRunState = {
  readonly config: SpeedRunConfig
  readonly phase: RunningPhase | 'paused' | 'error' | 'complete'
  readonly resumePhase: RunningPhase
  readonly index: number
  readonly current: QuestionGenerationResult
  readonly attemptBudget: GenerationBudget
  readonly records: readonly AnswerRecord[]
  readonly questionStartedAt: number | null
  readonly accumulatedQuestionMs: number
  readonly elapsedMs: number
  readonly lastTimestamp: number | null
}

export function speedRunConfig(seed = 'training-lab', scenario: QuestionScenario = 'initial', questionCount: SessionLength = 50): SpeedRunConfig {
  return { ...trainingConfig(seed, scenario), questionCount }
}

export function startSpeedRun(config = speedRunConfig()): SpeedRunState {
  const current = loadQuestion(config, 0)
  return { config, phase: current.kind === 'generated' ? 'ready' : 'error', resumePhase: 'ready',
    index: 0, current, attemptBudget: DEFAULT_ATTEMPTS, records: [], questionStartedAt: null, accumulatedQuestionMs: 0, elapsedMs: 0, lastTimestamp: null }
}

function validTime(state: SpeedRunState, now: number): boolean {
  return Number.isFinite(now) && now >= 0 && (state.lastTimestamp === null || now >= state.lastTimestamp)
}

/** Called only after the current question has rendered. Generation is not timed. */
export function readySpeedRun(state: SpeedRunState, now: number): SpeedRunState {
  return state.phase === 'ready' && validTime(state, now)
    ? { ...state, phase: 'answering', questionStartedAt: now, lastTimestamp: now } : state
}

export function answerSpeedRun(state: SpeedRunState, answer: Answer, now: number, questionId: string): SpeedRunState {
  if (state.phase !== 'answering' || state.current.kind !== 'generated' || state.questionStartedAt === null || !validTime(state, now)) return state
  if (state.current.question.id !== questionId) return state
  const feedback = assessAnswer(state.current, answer)
  if (!feedback) return state
  const durationMs = state.accumulatedQuestionMs + now - state.questionStartedAt
  const records = [...state.records, { ...feedback, questionIndex: state.index, durationMs }]
  return { ...state, records, phase: records.length === state.config.questionCount ? 'complete' : 'transition',
    elapsedMs: state.elapsedMs + durationMs, questionStartedAt: null, accumulatedQuestionMs: 0, lastTimestamp: now }
}

export function advanceSpeedRun(state: SpeedRunState): SpeedRunState {
  if (state.phase !== 'transition') return state
  const index = state.index + 1
  const current = loadQuestion(state.config, index)
  return { ...state, index, current, attemptBudget: DEFAULT_ATTEMPTS, phase: current.kind === 'generated' ? 'ready' : 'error' }
}

export function retrySpeedRun(state: SpeedRunState): SpeedRunState {
  if (state.phase !== 'error' || !canExtendGeneration(state.current, state.attemptBudget)) return state
  const current = loadQuestion(state.config, state.index, EXTENDED_ATTEMPTS)
  return { ...state, current, attemptBudget: EXTENDED_ATTEMPTS, phase: current.kind === 'generated' ? 'ready' : 'error' }
}

export function pauseSpeedRun(state: SpeedRunState, now: number): SpeedRunState {
  if (!validTime(state, now) || (state.phase !== 'answering' && state.phase !== 'ready' && state.phase !== 'transition')) return state
  const accumulatedQuestionMs = state.accumulatedQuestionMs +
    (state.phase === 'answering' && state.questionStartedAt !== null ? now - state.questionStartedAt : 0)
  return { ...state, phase: 'paused', resumePhase: state.phase, questionStartedAt: null, accumulatedQuestionMs, lastTimestamp: now }
}

export function resumeSpeedRun(state: SpeedRunState, now: number): SpeedRunState {
  if (state.phase !== 'paused' || !validTime(state, now)) return state
  return { ...state, phase: state.resumePhase === 'transition' ? 'transition' : 'ready', lastTimestamp: now }
}

/** No report is available before completion. Records stay in memory only. */
export function speedRunReport(state: SpeedRunState) {
  if (state.phase !== 'complete') return null
  const correct = state.records.filter((record) => record.correct).length
  return { correct, incorrect: state.records.length - correct, total: state.records.length,
    accuracyPercent: correct / state.records.length * 100, elapsedMs: state.elapsedMs,
    averageResponseMs: state.elapsedMs / state.records.length, records: state.records, config: state.config }
}
