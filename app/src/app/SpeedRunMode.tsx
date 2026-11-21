import { useEffect, useState } from 'react'
import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'
import { format } from '../i18n/format'
import { advanceSpeedRun, answerSpeedRun, pauseSpeedRun, readySpeedRun, resumeSpeedRun, retrySpeedRun, speedRunConfig, speedRunReport, startSpeedRun } from '../modules/training/speed-run'
import type { SessionLength, SpeedRunState } from '../modules/training/speed-run'
import type { QuestionScenario } from '../modules/training/question-generator'
import type { Answer } from '../modules/training/training-flow'
import { canExtendGeneration } from '../modules/training/training-flow'
import { monotonicClock } from './clock'
import type { Clock } from './clock'
import { QuestionDisplay } from './QuestionDisplay'
import { questionView } from './question-view'
import { TrainingSetup } from './TrainingSetup'
import { GenerationError } from './GenerationError'
import { Feedback } from './Feedback'

export function SpeedRunMode({ locale, showTotal, clock = monotonicClock }: { locale: Locale; showTotal: boolean; clock?: Clock }) {
  const copy = messages[locale]
  const [seed, setSeed] = useState('training-lab')
  const [scenario, setScenario] = useState<QuestionScenario>('initial')
  const [count, setCount] = useState<SessionLength>(50)
  const [state, setState] = useState<SpeedRunState | null>(null)
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct'>('incorrect')
  const phase = state?.phase
  const index = state?.index
  useEffect(() => {
    if (phase !== 'ready') return
    let mounted = true
    const now = clock.now()
    queueMicrotask(() => { if (mounted) setState((current) => current ? readySpeedRun(current, now) : current) })
    return () => { mounted = false }
  }, [phase, index, clock])
  useEffect(() => {
    if (phase !== 'transition') return
    const timer = setTimeout(() => setState((current) => current ? advanceSpeedRun(current) : current), 300)
    return () => clearTimeout(timer)
  }, [phase])
  useEffect(() => {
    function pause() {
      const now = clock.now()
      setState((current) => current ? pauseSpeedRun(current, now) : current)
    }
    function visibility() { if (document.visibilityState === 'hidden') pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility) }
  }, [clock])
  function answer(selected: Answer) {
    if (!state || state.current.kind !== 'generated') return
    const questionId = state.current.question.id
    const now = clock.now()
    setState((current) => current ? answerSpeedRun(current, selected, now, questionId) : current)
  }
  const seconds = (ms: number) => format(copy.seconds, { value: new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ms / 1000) })
  const report = state ? speedRunReport(state) : null
  const reviewedRecords = report?.records.filter((record) => reviewFilter === 'all' || record.correct === (reviewFilter === 'correct')) ?? []
  return <section aria-label={copy.speedRun}>
    <div className="mode-heading"><h2>{copy.speedRun}</h2><p>{copy.speedIntro}</p></div>
    {!state ? <form className="setup-form speed-setup" onSubmit={(event) => { event.preventDefault(); setReviewFilter('incorrect'); setState(startSpeedRun(speedRunConfig(seed, scenario, count))) }}>
      <TrainingSetup locale={locale} seed={seed} scenario={scenario} onSeed={setSeed} onScenario={setScenario}>
        <label>{copy.sessionLength}<select value={count} onChange={(event) => setCount(Number(event.target.value) as SessionLength)}>
          {[25, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
        </select></label>
      </TrainingSetup>
      <button className="primary" type="submit">{copy.startRun}</button>
    </form> : report ? <section className="run-report" aria-label={copy.results}>
      <h3>{copy.results}</h3>
      <dl className="metrics">
        <div><dt>{copy.accuracy}</dt><dd>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(report.accuracyPercent)}%</dd></div>
        <div><dt>{copy.correctCount}</dt><dd>{report.correct} / {report.total}</dd></div>
        <div><dt>{copy.incorrectCount}</dt><dd>{report.incorrect}</dd></div>
        <div><dt>{copy.elapsed}</dt><dd>{seconds(report.elapsedMs)}</dd></div>
        <div><dt>{copy.average}</dt><dd>{seconds(report.averageResponseMs)}</dd></div>
      </dl>
      <p className="muted">{copy.timingNote}</p>
      <button type="button" className="primary" onClick={() => setState(null)}>{copy.anotherRun}</button>
      <h3 className="review-heading">{copy.reviewAnswers}</h3>
      <div className="review-filters" role="group" aria-label={copy.reviewFilters}>
        {(['all', 'incorrect', 'correct'] as const).map((filter) => <button type="button" key={filter} aria-pressed={reviewFilter === filter} onClick={() => setReviewFilter(filter)}>
          {format(copy.filterCount, { label: filter === 'all' ? copy.reviewAll : copy[filter], count: filter === 'all' ? report.total : report[filter] })}
        </button>)}
      </div>
      {report.incorrect === 0 && <p className="perfect-run" role="status">{copy.perfectRun}</p>}
      {reviewedRecords.length === 0 && report.incorrect > 0 && <p role="status">{copy.noReviewMatches}</p>}
      {reviewedRecords.map((record) => <details key={record.question.id} className={`review-item ${record.correct ? 'review-correct' : 'review-incorrect'}`}>
        <summary>{format(copy.reviewSummary, {
          number: record.questionIndex + 1, status: `${record.correct ? '✓' : '×'} ${record.correct ? copy.correct : copy.incorrect}`,
          answer: copy.actions[record.selected], recommended: copy.actions[record.recommended], time: seconds(record.durationMs),
        })}</summary>
        <QuestionDisplay view={questionView(record.question, showTotal)} locale={locale} disabled onAnswer={() => {}} />
        <Feedback feedback={record} locale={locale} />
      </details>)}
    </section> : <>
      <div className="run-progress"><h3 aria-live="polite">{format(copy.progress, { number: state.index + 1, total: state.config.questionCount })}</h3>
        <progress aria-label={copy.progressLabel} value={state.records.length} max={state.config.questionCount} />
      </div>
      {state.phase === 'paused' ? <div className="pause-panel" role="status"><h3>{copy.paused}</h3><p>{copy.pausedHint}</p>
        <button type="button" onClick={() => { const now = clock.now(); setState((current) => current ? resumeSpeedRun(current, now) : current) }}>{copy.resume}</button>
      </div> : state.current.kind === 'failure'
        ? <GenerationError failure={state.current} index={state.index} locale={locale} canExtend={canExtendGeneration(state.current, state.attemptBudget)} setupHint={copy.speedRecoverySetup} onRetry={() => setState((current) => current ? retrySpeedRun(current) : current)} />
        : <QuestionDisplay view={questionView(state.current.question, showTotal)} locale={locale} disabled={state.phase !== 'answering'} onAnswer={answer} />}
      {state.phase === 'transition' && <p role="status" aria-live="polite">{copy.answerRecorded}</p>}
      <div className="session-controls">
        {state.phase !== 'paused' && state.phase !== 'error' && <button type="button" onClick={() => { const now = clock.now(); setState((current) => current ? pauseSpeedRun(current, now) : current) }}>{copy.pause}</button>}
        <button type="button" onClick={() => setState(null)}>{copy.endRun}</button>
      </div>
    </>}
  </section>
}
