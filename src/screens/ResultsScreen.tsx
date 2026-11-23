import { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Mascot } from '../components/Mascot';
import { Stars } from '../components/Stars';
import { STATE_BY_FIPS } from '../data/states';
import { celebration } from '../lib/confetti';
import { isMode } from '../lib/modes';
import { playFanfare } from '../lib/sound';
import { missedQuestions, targetName } from '../lib/quizView';
import type { Question } from '../quiz/engine';
import { useAppStore } from '../store/useAppStore';

const MESSAGES = {
  3: 'Perfect score! 🎉',
  2: 'Great job!',
  1: 'Good work, keep practicing!',
  0: 'Every try makes you smarter!',
} as const;

/** Missed item as the child should read it: "Illinois → Springfield" for capitals. */
function missedLabel(question: Question): string {
  if (question.mode === 'capitals') {
    return `${STATE_BY_FIPS[question.targetKey].name} → ${question.answer}`;
  }
  return targetName(question);
}

export default function ResultsScreen() {
  const { mode: modeParam } = useParams();
  const navigate = useNavigate();
  const lastResult = useAppStore((s) => s.lastResult);
  const activeRound = useAppStore((s) => s.activeRound);
  const startRound = useAppStore((s) => s.startRound);
  const soundOn = useAppStore((s) => s.settings.sound);
  const celebratedRef = useRef(false);

  const earnedStars = lastResult && lastResult.mode === modeParam ? lastResult.stars : 0;
  // Fanfare and confetti once per visit to a round with 2+ stars. The ref survives re-renders.
  useEffect(() => {
    if (earnedStars < 2 || celebratedRef.current) return;
    celebratedRef.current = true;
    playFanfare(soundOn);
    celebration();
  }, [earnedStars, soundOn]);

  if (!isMode(modeParam)) return <Navigate to="/" replace />;
  const mode = modeParam;
  if (!lastResult || lastResult.mode !== mode) {
    // "Try again" and "Practice" start a round, which clears lastResult. Going back
    // from the quiz then lands here with a round in progress, so send it to the quiz.
    if (activeRound?.mode === mode) return <Navigate to={`/quiz/${mode}`} replace />;
    return <Navigate to="/" replace />;
  }
  const missed = missedQuestions(lastResult.questions, lastResult.answers);

  // Replace this results entry so Back from the quiz never returns to a stale result.
  const tryAgain = () => {
    startRound(mode);
    navigate(`/quiz/${mode}`, { replace: true });
  };

  const practiceMissed = () => {
    startRound(mode, undefined, { targetKeys: missed.map((q) => q.targetKey) });
    navigate(`/quiz/${mode}`, { replace: true });
  };

  return (
    <main className="min-h-screen bg-sky-200 font-display text-sky-950">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-8">
        <Mascot mood={lastResult.stars >= 2 ? 'celebrate' : 'encourage'} />

        <section className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-lg sm:p-8">
          <h1 className="text-xl font-bold text-sky-900">
            {lastResult.drill ? 'Practice round' : 'Round complete'}
          </h1>
          <p className="text-6xl font-bold sm:text-7xl">{`${lastResult.score} / ${lastResult.total}`}</p>
          <Stars count={lastResult.stars} />
          <p className="text-2xl font-bold">{MESSAGES[lastResult.stars]}</p>
        </section>

        {missed.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-xl font-bold">Let&apos;s learn these</h2>
            <ul aria-label="Missed questions" className="flex flex-col gap-2">
              {missed.map((q) => (
                <li
                  key={q.id}
                  className="rounded-2xl bg-orange-50 px-4 py-3 text-lg font-bold text-orange-900"
                >
                  {missedLabel(q)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={tryAgain}
            className="min-h-14 rounded-3xl bg-green-500 px-6 py-3 text-xl font-bold text-white shadow-lg hover:bg-green-600 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Try again
          </button>
          {missed.length > 0 && (
            <button
              type="button"
              onClick={practiceMissed}
              className="min-h-14 rounded-3xl bg-sky-600 px-6 py-3 text-xl font-bold text-white shadow-lg hover:bg-sky-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-900"
            >
              Practice missed ones
            </button>
          )}
          <Link
            to="/"
            className="flex min-h-14 items-center justify-center rounded-3xl bg-white px-6 py-3 text-xl font-bold text-sky-900 shadow focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
