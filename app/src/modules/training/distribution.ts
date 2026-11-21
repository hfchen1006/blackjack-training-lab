import { getCardValue } from '../blackjack/card'
import { evaluateHand } from '../blackjack/hand'
import type { Hand } from '../blackjack/hand'
import type { RuleProfile } from '../blackjack/rule-profile'
import { generateQuestion, QUESTION_GENERATOR_VERSION } from './question-generator'
import type { QuestionGenerationResult } from './question-generator'

/** Changing selection, candidate order, or provenance policy requires a new version. */
export const DISTRIBUTION_VERSION = 'training-distribution-v1' as const
export type Distribution = 'balanced' | 'realistic'
export type StrategyCategory = 'hard' | 'soft' | 'pair'
type Provenance = 'initial' | 'continuing' | 'split'
type Generated = Extract<QuestionGenerationResult, { kind: 'generated' }>
type GeneratorFailure = Extract<QuestionGenerationResult, { kind: 'failure' }>
export type DistributionRequest = {
  readonly seed: string
  readonly questionIndex: number
  readonly distribution: Distribution
  readonly profile: RuleProfile
  readonly distributionVersion?: string
  readonly generatorVersion?: string
  readonly maxAttempts?: number
  /** Balanced candidate budget: default 128, maximum 256. */
  readonly maxCandidates?: number
}
export type DistributionMetadata = {
  readonly version: typeof DISTRIBUTION_VERSION
  readonly name: Distribution
  readonly seed: string
  readonly questionIndex: number
  readonly requestedCategory: StrategyCategory | null
  readonly requestedProvenance: Provenance
  readonly actualCategory: StrategyCategory
  readonly actualProvenance: Provenance
  readonly candidatesExamined: number
  /** Reproducible identity; neither cryptographic nor globally unique. */
  readonly id: string
}
export type DistributionResult =
  | (Generated & { readonly distribution: DistributionMetadata })
  | {
    readonly kind: 'failure'
    readonly generatorVersion: typeof QUESTION_GENERATOR_VERSION
    readonly distributionVersion: typeof DISTRIBUTION_VERSION
    readonly reason: GeneratorFailure['reason'] | 'unsupported-distribution-version' | 'category-attempt-limit'
    readonly source: 'request' | 'generator' | 'category'
    readonly attempts: number
    readonly candidatesExamined: number
    readonly lastRejection: string | null
    readonly seed: string
    readonly questionIndex: number
    readonly distribution: Distribution
    readonly requestedCategory: StrategyCategory | null
    readonly requestedProvenance: Provenance
  }

export function classifyStrategyCategory(hand: Hand): StrategyCategory {
  const evaluation = evaluateHand(hand)
  return evaluation.isExactRankPair ? 'pair' : evaluation.isSoft ? 'soft' : 'hard'
}

// Independent selection entropy: do not couple this policy to generator internals.
function hash(parts: readonly unknown[]): number {
  const text = JSON.stringify([DISTRIBUTION_VERSION, ...parts])
  let value = 2166136261
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619)
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d)
  value ^= value >>> 15
  return value >>> 0
}

const orders: readonly (readonly StrategyCategory[])[] = [
  ['hard', 'soft', 'pair'], ['hard', 'pair', 'soft'], ['soft', 'hard', 'pair'],
  ['soft', 'pair', 'hard'], ['pair', 'hard', 'soft'], ['pair', 'soft', 'hard'],
]
// Per 60 planned questions: 48 initial, 9 continuing, 3 split. Provisional
// engineering targets, not learning-science evidence. Never request a hit pair.
const provenanceBlocks = [
  'continuing', 'initial', 'continuing', 'split', 'initial', 'continuing', 'initial',
  'continuing', 'split', 'initial', 'continuing', 'initial', 'continuing', 'split',
  'initial', 'continuing', 'initial', 'continuing', 'initial', 'continuing',
] as const

function plan(seed: string, index: number, mode: Distribution) {
  if (mode === 'realistic') return { category: null, provenance: 'initial' as Provenance, dealer: 0 }
  const block = Math.floor(index / 3)
  const order = orders[hash([seed, 'categories']) % orders.length]
  const category = order[(index % 3 + block % 3) % 3]
  const blockProvenance = provenanceBlocks[(block + hash([seed, 'provenance'])) % provenanceBlocks.length]
  const supplementaryCategory = blockProvenance === 'continuing'
    ? (['hard', 'soft'] as const)[hash([seed, block, 'continuing']) % 2]
    : order[hash([seed, block, 'split']) % 3]
  const provenance: Provenance = category === supplementaryCategory ? blockProvenance : 'initial'
  // Cycle preferred upcards per category; this is only a candidate preference.
  const dealer = 2 + (block + hash([seed, category, 'dealer'])) % 10
  return { category, provenance, dealer }
}

export function generateDistributedQuestion(request: DistributionRequest): DistributionResult {
  const { seed, questionIndex, distribution } = request
  const candidates = request.maxCandidates ?? 128
  const valid = typeof seed === 'string' && seed.length <= 1024 && Number.isSafeInteger(questionIndex) && questionIndex >= 0 &&
    (distribution === 'balanced' || distribution === 'realistic') && Number.isInteger(candidates) && candidates >= 1 && candidates <= 256 &&
    (request.maxAttempts === undefined || (Number.isInteger(request.maxAttempts) && request.maxAttempts >= 1 && request.maxAttempts <= 4096))
  const target = valid ? plan(seed, questionIndex, distribution) : { category: null, provenance: 'initial' as Provenance, dealer: 0 }
  function failure(reason: Extract<DistributionResult, { kind: 'failure' }>['reason'], source: 'request' | 'generator' | 'category', examined = 0, attempts = 0, lastRejection: string | null = null): DistributionResult {
    return { kind: 'failure', reason, source, generatorVersion: QUESTION_GENERATOR_VERSION, distributionVersion: DISTRIBUTION_VERSION,
      seed, questionIndex, distribution, requestedCategory: target.category, requestedProvenance: target.provenance,
      candidatesExamined: examined, attempts, lastRejection }
  }
  if (!valid) return failure('invalid-request', 'request')
  if (request.distributionVersion !== undefined && request.distributionVersion !== DISTRIBUTION_VERSION) return failure('unsupported-distribution-version', 'request')

  function publish(result: Generated, examined: number): DistributionResult {
    return { ...result, distribution: { version: DISTRIBUTION_VERSION, name: distribution, seed, questionIndex,
      requestedCategory: target.category, requestedProvenance: target.provenance,
      actualCategory: classifyStrategyCategory(result.answerKey.input.hand),
      actualProvenance: result.question.handSummary.provenance.kind, candidatesExamined: examined,
      id: `${DISTRIBUTION_VERSION}:${distribution}:${result.question.id}` } }
  }

  let best: Generated | undefined
  let bestScore = -1
  const limit = distribution === 'realistic' ? 1 : candidates
  // A fixed 32-candidate diversity window preserves successful results when the
  // normal 128-candidate budget is extended to 256. Smaller custom budgets may
  // select different successes; include those budgets when replaying them.
  const window = Math.min(32, limit)
  for (let candidate = 0; candidate < limit; candidate += 1) {
    const result = generateQuestion({ seed: distribution === 'realistic' ? seed : `${DISTRIBUTION_VERSION}:${hash([distribution, seed, questionIndex, candidate])}:${hash([distribution, seed, questionIndex, candidate, 'salt'])}`,
      questionIndex, scenario: target.provenance, profile: request.profile,
      generatorVersion: request.generatorVersion, maxAttempts: request.maxAttempts })
    if (result.kind === 'failure') return failure(result.reason, 'generator', candidate + 1, result.attempts, result.lastRejection)
    if (result.question.phase !== 'player' || result.answerKey.decision.kind !== 'action') return failure('engine-rejected', 'generator', candidate + 1, 0, 'Expected an ordinary actionable decision')
    if (distribution === 'realistic') return publish(result, 1)
    if (classifyStrategyCategory(result.answerKey.input.hand) === target.category) {
      const upcard = getCardValue(result.question.dealer.upcard)
      const score = (upcard === (target.dealer === 11 ? 1 : target.dealer) ? 2 ** 32 : 0) + hash([seed, questionIndex, result.answerKey.decision.caseId])
      if (score > bestScore) { best = result; bestScore = score }
    }
    if (candidate + 1 >= window && best) return publish(best, candidate + 1)
  }
  return failure('category-attempt-limit', 'category', limit, 0, 'Requested category not found within the candidate budget')
}
