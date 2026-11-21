import { BASELINE_RULE_PROFILE } from '../blackjack/rule-profile'
import type { RuleProfile } from '../blackjack/rule-profile'
import { generateQuestion, QUESTION_GENERATOR_VERSION } from './question-generator'
import type { QuestionGenerationResult, QuestionScenario, TrainingQuestion } from './question-generator'

export type Answer = TrainingQuestion['selectableAnswers'][number]
export type GeneratedQuestion = Extract<QuestionGenerationResult, { kind: 'generated' }>
export const DEFAULT_ATTEMPTS = 2048
export const EXTENDED_ATTEMPTS = 4096
export type GenerationBudget = typeof DEFAULT_ATTEMPTS | typeof EXTENDED_ATTEMPTS
export type TrainingConfig = {
  readonly seed: string
  readonly selection: { readonly kind: 'scenario'; readonly scenario: QuestionScenario }
  readonly profile: RuleProfile
}
export type AnswerFeedback = {
  readonly selected: Answer
  readonly recommended: Answer
  readonly correct: boolean
  readonly question: TrainingQuestion
  readonly decision: GeneratedQuestion['answerKey']['decision']
}
export function trainingConfig(seed = 'training-lab', scenario: QuestionScenario = 'initial'): TrainingConfig {
  return { seed, selection: { kind: 'scenario', scenario }, profile: BASELINE_RULE_PROFILE }
}
export function loadQuestion(config: TrainingConfig, questionIndex: number, maxAttempts: GenerationBudget = DEFAULT_ATTEMPTS): QuestionGenerationResult {
  return generateQuestion({ seed: config.seed, questionIndex, scenario: config.selection.scenario, profile: config.profile, generatorVersion: QUESTION_GENERATOR_VERSION, maxAttempts })
}
export function canExtendGeneration(current: QuestionGenerationResult, budget: GenerationBudget): boolean {
  return current.kind === 'failure' && current.reason === 'attempt-limit' && budget === DEFAULT_ATTEMPTS
}
export function assessAnswer(current: GeneratedQuestion, selected: Answer): AnswerFeedback | null {
  const legal: readonly Answer[] = current.question.selectableAnswers
  if (!legal.includes(selected)) return null
  const decision = current.answerKey.decision
  return { selected, recommended: decision.action, correct: selected === decision.action, question: current.question, decision }
}
