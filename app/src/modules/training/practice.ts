import { assessAnswer, canExtendGeneration, DEFAULT_ATTEMPTS, EXTENDED_ATTEMPTS, loadQuestion } from './training-flow'
import type { Answer, AnswerFeedback, GenerationBudget, QuestionLoadResult, TrainingConfig } from './training-flow'

export type PracticeState = {
  readonly config: TrainingConfig
  readonly index: number
  readonly current: QuestionLoadResult
  readonly feedback: AnswerFeedback | null
  readonly attemptBudget: GenerationBudget
}
export function startPractice(config: TrainingConfig): PracticeState {
  return { config, index: 0, current: loadQuestion(config, 0), feedback: null, attemptBudget: DEFAULT_ATTEMPTS }
}
export function answerPractice(state: PracticeState, answer: Answer): PracticeState {
  if (state.feedback || state.current.kind !== 'generated') return state
  const feedback = assessAnswer(state.current, answer)
  return feedback ? { ...state, feedback } : state
}
export function nextPractice(state: PracticeState): PracticeState {
  if (!state.feedback) return state
  const index = state.index + 1
  return { ...state, index, current: loadQuestion(state.config, index), feedback: null, attemptBudget: DEFAULT_ATTEMPTS }
}
export function retryPractice(state: PracticeState): PracticeState {
  return canExtendGeneration(state.current, state.attemptBudget)
    ? { ...state, current: loadQuestion(state.config, state.index, EXTENDED_ATTEMPTS), attemptBudget: EXTENDED_ATTEMPTS } : state
}
