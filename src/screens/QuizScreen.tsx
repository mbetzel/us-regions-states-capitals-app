import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { AnswerButton, type AnswerState } from '../components/AnswerButton';
import { AnswerFeedback, type FeedbackStatus } from '../components/AnswerFeedback';
import { Mascot, type MascotMood } from '../components/Mascot';
import { ProgressBar } from '../components/ProgressBar';
import { USMap } from '../map/USMap';
import { bigBurst, smallBurst } from '../lib/confetti';
import { MODE_INFO, isMode } from '../lib/modes';
import { currentStreak, highlightFor } from '../lib/quizView';
import { playCorrect, playWrong } from '../lib/sound';
import { STATE_BY_FIPS } from '../data/states';
import { useAppStore } from '../store/useAppStore';

export default function QuizScreen() {
  const { mode: modeParam } = useParams();
  const activeRound = useAppStore((s) => s.activeRound);
  const lastResult = useAppStore((s) => s.lastResult);
  const answerCurrent = useAppStore((s) => s.answerCurrent);
  const nextQuestion = useAppStore((s) => s.nextQuestion);
  const soundOn = useAppStore((s) => s.settings.sound);

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

  // Move focus to Next once answered so Enter or Space continues without a mouse.
  useEffect(() => {
    if (answered) nextButtonRef.current?.focus();
  }, [answered, index]);

  // A new question moves focus to its heading, so it is not lost to the page body.
  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  const advance = useCallback(() => {
    if (answered) nextQuestion();
  }, [answered, nextQuestion]);

  // Every answer goes through here, by click or key, so feedback sound and confetti play once.
  const pick = useCallback(
    (choice: string) => {
      if (answered || !round || !question) return;
      answerCurrent(choice);
      if (choice === question.answer) {
        const answers = round.answers.slice();
        answers[index] = choice;
        const streak = currentStreak(round.questions, answers);
        playCorrect(soundOn);
        // Every 5 in a row gets the bigger burst.
        if (streak > 0 && streak % 5 === 0) bigBurst();
        else smallBurst();
      } else {
        playWrong(soundOn);
      }
    },
    [answered, round, question, index, answerCurrent, soundOn],
  );

  // Keys 1 to 4 pick answers; Enter or Space advances after answering.
  useEffect(() => {
    if (!question) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (/^[1-4]$/.test(event.key)) {
        if (!answered) pick(question.choices[Number(event.key) - 1]);
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
  }, [question, answered, pick, advance]);

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

  const mascotMood: MascotMood = !answered
    ? 'idle'
    : feedback === 'correct'
      ? 'happy'
      : 'encourage';
  const streakPop = feedback === 'correct' && streak >= 3;

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
                  onPick={() => pick(choice)}
                />
              ))}
            </div>

            <Mascot
              mood={mascotMood}
              message={feedback === 'wrong' ? "You'll get it next time!" : undefined}
            />

            <AnswerFeedback status={feedback} answer={question.answer} />

            {streakPop && (
              <p
                key={streak}
                aria-hidden="true"
                className="anim-pop-in self-center rounded-2xl bg-orange-100 px-4 py-2 text-xl font-bold text-orange-900"
              >
                {`🔥 x${streak}!`}
              </p>
            )}

            {answered && (
              <button
                ref={nextButtonRef}
                type="button"
                onClick={advance}
                className="anim-pulse-soft min-h-14 rounded-3xl bg-sky-600 px-6 py-3 text-xl font-bold text-white shadow-lg motion-safe:active:scale-95 hover:bg-sky-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-900"
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
