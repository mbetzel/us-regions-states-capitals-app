import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { AnswerButton, type AnswerState } from '../components/AnswerButton';
import { AnswerFeedback, type FeedbackStatus } from '../components/AnswerFeedback';
import { ProgressBar } from '../components/ProgressBar';
import { USMap } from '../map/USMap';
import { MODE_INFO, isMode } from '../lib/modes';
import { currentStreak, highlightFor } from '../lib/quizView';
import { STATE_BY_FIPS } from '../data/states';
import { useAppStore } from '../store/useAppStore';

export default function QuizScreen() {
  const { mode: modeParam } = useParams();
  const activeRound = useAppStore((s) => s.activeRound);
  const lastResult = useAppStore((s) => s.lastResult);
  const answerCurrent = useAppStore((s) => s.answerCurrent);
  const nextQuestion = useAppStore((s) => s.nextQuestion);

  const mode = isMode(modeParam) ? modeParam : null;
  const round = activeRound && mode && activeRound.mode === mode ? activeRound : null;
  const index = round?.index ?? 0;
  const question = round?.questions[index];
  const chosen = round?.answers[index] ?? null;
  const answered = chosen !== null;
  const isLast = round !== null && index === round.questions.length - 1;

  const highlight = useMemo(() => (question ? highlightFor(question) : null), [question]);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Once answered, focus Next so Enter or Space continues without a mouse.
  // On a new (unanswered) question, focus its heading so focus isn't lost to the page body.
  useEffect(() => {
    if (answered) nextButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [answered, index]);

  const advance = useCallback(() => {
    if (answered) nextQuestion();
  }, [answered, nextQuestion]);

  // Keys 1 to 4 pick answers; Enter or Space advances after answering.
  useEffect(() => {
    if (!question) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (/^[1-4]$/.test(event.key)) {
        if (!answered) answerCurrent(question.choices[Number(event.key) - 1]);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        // A focused button or link handles its own Enter or Space through a click.
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('a, button')) return;
        if (answered) {
          event.preventDefault();
          advance();
        } else if (event.key === ' ') {
          // Space must not scroll the page while the question is still open.
          event.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [question, answered, answerCurrent, advance]);

  // Finished rounds are handled by the store: the round is gone and lastResult is set.
  if (!round || !question || !mode) {
    if (!round && mode && lastResult?.mode === mode) {
      return <Navigate to={`/results/${mode}`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const streak = currentStreak(round.questions, round.answers);
  const feedback: FeedbackStatus = !answered
    ? 'idle'
    : chosen === question.answer
      ? 'correct'
      : 'wrong';

  const stateFor = (choice: string): AnswerState => {
    if (!answered) return 'idle';
    if (choice === question.answer)
      return chosen === question.answer ? 'correct' : 'reveal-correct';
    if (choice === chosen) return 'wrong';
    return 'disabled';
  };

  return (
    <main className="min-h-screen bg-sky-200 font-display text-sky-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="flex min-h-12 items-center rounded-2xl bg-white px-4 text-lg font-bold text-sky-900 shadow focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Quit
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">{MODE_INFO[mode].title}</h1>
          <p className="rounded-2xl bg-white px-4 py-2 text-lg font-bold shadow">
            <span aria-hidden="true">🔥 </span>
            {`Streak: ${streak}`}
          </p>
        </header>

        <ProgressBar index={index} total={round.questions.length} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-lg sm:p-6 lg:w-[60%]">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold outline-none sm:text-3xl"
            >
              {mode === 'capitals' ? (
                <>
                  What is the capital of <strong>{STATE_BY_FIPS[question.targetKey].name}</strong>?
                </>
              ) : (
                question.prompt
              )}
            </h2>
            {highlight && <USMap highlight={highlight} />}
          </section>

          <section className="flex flex-col gap-3 lg:flex-1">
            <div role="group" aria-label="Answer choices" className="flex flex-col gap-3">
              {question.choices.map((choice, i) => (
                <AnswerButton
                  key={choice}
                  label={choice}
                  keyNumber={i + 1}
                  state={stateFor(choice)}
                  onPick={() => answerCurrent(choice)}
                />
              ))}
            </div>

            <AnswerFeedback status={feedback} answer={question.answer} />

            {answered && (
              <button
                ref={nextButtonRef}
                type="button"
                onClick={advance}
                className="min-h-14 rounded-3xl bg-sky-600 px-6 py-3 text-xl font-bold text-white shadow-lg hover:bg-sky-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-900"
              >
                {isLast ? 'See my results ➜' : 'Next ➜'}
              </button>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
