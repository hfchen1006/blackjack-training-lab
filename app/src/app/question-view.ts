import type { TrainingQuestion } from '../modules/training/question-generator'
/** No answer key, physical IDs, hidden values, or hidden total in view props. */
export function questionView(question: TrainingQuestion, showTotal: boolean) {
  return {
    id: question.id, phase: question.phase, playerCards: question.playerCards,
    dealerUpcard: question.dealer.upcard, selectableAnswers: question.selectableAnswers,
    provenance: question.handSummary.provenance,
    total: showTotal ? { value: question.handSummary.total, classification: question.handSummary.classification } : null,
  }
}
export type QuestionView = ReturnType<typeof questionView>
