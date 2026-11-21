import type { AnswerFeedback } from '../modules/training/training-flow'
import type { Locale } from './locale'
import { messages } from './messages'

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (token, key: string) => String(values[key] ?? token))
}
/** Presents approved metadata; never selects a strategy action. */
export function explainFeedback(feedback: AnswerFeedback, locale: Locale): string {
  const copy = messages[locale]
  const decision = feedback.decision
  if (decision.kind === 'side-decision') return copy.sideExplanation
  const [, category, value, , dealer] = decision.caseId.split('.')
  const categoryLabel = category === 'pair' ? copy.pair : category === 'soft' ? copy.soft : copy.hard
  const rank = (text: string) => text in copy.ranks ? copy.ranks[text as keyof typeof copy.ranks] : text
  const parts = [format(copy.reference, { category: categoryLabel, value: rank(value), dealer: rank(dealer), action: copy.actions[decision.preferredAction] })]
  if (decision.fallbackAction) parts.push(decision.reasonKey === 'strategy.split-otherwise-total'
    ? format(copy.splitFallback, { fallback: copy.actions[decision.fallbackAction] })
    : format(copy.otherwise, { preferred: copy.actions[decision.preferredAction], fallback: copy.actions[decision.fallbackAction] }))
  if (decision.usedFallback) parts.push(format(copy.fallbackUsed, { preferred: copy.actions[decision.preferredAction], action: copy.actions[decision.action] }))
  return parts.join(' ')
}
