import { useEffect } from 'react'
import type { Card } from '../modules/blackjack/card'
import type { Answer } from '../modules/training/training-flow'
import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'
import { format } from '../i18n/format'
import type { QuestionView } from './question-view'

const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }
const keys: Record<Answer, string> = { hit: 'H', stand: 'S', double: 'D', split: 'P', surrender: 'R', 'take-insurance': 'T', 'decline-insurance': 'X', 'take-even-money': 'E' }

function PlayingCard({ card, locale }: { card: Card; locale: Locale }) {
  const copy = messages[locale]
  const label = locale === 'zh-TW' ? `${copy.suits[card.suit]} ${copy.ranks[card.rank]}` : `${copy.ranks[card.rank]} of ${copy.suits[card.suit]}`
  return <li className={`playing-card ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'red-suit' : ''}`} aria-label={label}>
    <span aria-hidden="true">{card.rank}<small>{symbols[card.suit]}</small></span>
    <span className="card-suit" aria-hidden="true">{symbols[card.suit]}</span>
  </li>
}

export function QuestionDisplay({ view, locale, disabled, onAnswer }: {
  view: QuestionView; locale: Locale; disabled: boolean; onAnswer: (answer: Answer) => void
}) {
  const copy = messages[locale]
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (disabled || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
      if (event.target instanceof Element && event.target.closest('input,select,textarea,button,a,[contenteditable="true"]')) return
      const answers: readonly Answer[] = view.selectableAnswers
      const answer = answers.find((action) => keys[action] === event.key.toUpperCase())
      if (answer) { event.preventDefault(); onAnswer(answer) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [view, disabled, onAnswer])
  const hits = view.provenance.history.actions.filter((action) => action === 'hit').length
  return <section className="question-table" data-question-id={view.id} aria-label={view.phase === 'insurance' ? copy.insurancePhase : copy.ordinaryPhase}>
    <div className="hand-heading"><h3>{copy.dealer}</h3><span>{copy[view.provenance.kind]}</span></div>
    <ul className="cards" aria-label={copy.dealer}>
      <PlayingCard card={view.dealerUpcard} locale={locale} />
      <li className="playing-card card-back" aria-label={copy.hiddenCard}><span aria-hidden="true">?</span></li>
    </ul>
    <div className="hand-heading"><h3>{copy.player}</h3>{hits > 0 && <span>{format(copy.hits, { count: hits })}</span>}</div>
    <ul className="cards" aria-label={copy.player}>
      {view.playerCards.map((card, index) => <PlayingCard key={index} card={card} locale={locale} />)}
    </ul>
    {view.total && <p className="hand-total">{format(copy.total, { kind: copy[view.total.classification], total: view.total.value })}</p>}
    <p className="decision-phase">{view.phase === 'insurance' ? copy.insurancePhase : copy.ordinaryPhase}</p>
    <div className="answer-controls" role="group" aria-label={copy.choices}>
      {view.selectableAnswers.map((action) => <button type="button" key={action} aria-keyshortcuts={keys[action]} disabled={disabled} onClick={(event) => { if (event.detail < 2) onAnswer(action) }}>
        {copy.actions[action]}
      </button>)}
    </div>
  </section>
}
