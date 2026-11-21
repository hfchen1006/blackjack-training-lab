import { BASELINE_RULE_PROFILE } from '../blackjack/rule-profile'
import type { RuleProfile } from '../blackjack/rule-profile'
import { generateQuestion, QUESTION_GENERATOR_VERSION } from './question-generator'
import type { QuestionGenerationResult, QuestionScenario, TrainingQuestion } from './question-generator'
import { DISTRIBUTION_VERSION, generateDistributedQuestion } from './distribution'
import type { Distribution, DistributionMetadata, DistributionResult } from './distribution'

export type Answer = TrainingQuestion['selectableAnswers'][number]
export type GeneratedQuestion = Extract<QuestionGenerationResult, { kind: 'generated' }>
export type QuestionLoadResult = QuestionGenerationResult | DistributionResult
export type TrainingSelection = Distribution | QuestionScenario
export const DEFAULT_ATTEMPTS = 2048
export const EXTENDED_ATTEMPTS = 4096
export type GenerationBudget = typeof DEFAULT_ATTEMPTS | typeof EXTENDED_ATTEMPTS
export type TrainingConfig = {
  readonly seed: string
  readonly selection: { readonly kind: 'scenario'; readonly scenario: QuestionScenario }
    | { readonly kind: 'distribution'; readonly distribution: Distribution; readonly version: typeof DISTRIBUTION_VERSION }
  readonly profile: RuleProfile
}
export type AnswerFeedback = {
  readonly selected: Answer
  readonly recommended: Answer
  readonly correct: boolean
  readonly question: TrainingQuestion
  readonly decision: GeneratedQuestion['answerKey']['decision']
  readonly distribution: DistributionMetadata | null
}
export function trainingConfig(seed = 'training-lab', selection: TrainingSelection = 'balanced'): TrainingConfig {
  return { seed, selection: selection === 'balanced' || selection === 'realistic'
    ? { kind: 'distribution', distribution: selection, version: DISTRIBUTION_VERSION }
    : { kind: 'scenario', scenario: selection }, profile: BASELINE_RULE_PROFILE }
}
export function loadQuestion(config: TrainingConfig, questionIndex: number, maxAttempts: GenerationBudget = DEFAULT_ATTEMPTS): QuestionLoadResult {
  if (config.selection.kind === 'distribution') return generateDistributedQuestion({ seed: config.seed, questionIndex,
    distribution: config.selection.distribution, distributionVersion: config.selection.version, profile: config.profile,
    generatorVersion: QUESTION_GENERATOR_VERSION, maxAttempts, maxCandidates: maxAttempts === DEFAULT_ATTEMPTS ? 128 : 256 })
  return generateQuestion({ seed: config.seed, questionIndex, scenario: config.selection.scenario, profile: config.profile, generatorVersion: QUESTION_GENERATOR_VERSION, maxAttempts })
}
export function canExtendGeneration(current: QuestionLoadResult, budget: GenerationBudget): boolean {
  return current.kind === 'failure' && (current.reason === 'attempt-limit' || current.reason === 'category-attempt-limit') && budget === DEFAULT_ATTEMPTS
}
export function assessAnswer(current: GeneratedQuestion & { readonly distribution?: DistributionMetadata }, selected: Answer): AnswerFeedback | null {
  const legal: readonly Answer[] = current.question.selectableAnswers
  if (!legal.includes(selected)) return null
  const decision = current.answerKey.decision
  return { selected, recommended: decision.action, correct: selected === decision.action, question: current.question, decision, distribution: current.distribution ?? null }
}
