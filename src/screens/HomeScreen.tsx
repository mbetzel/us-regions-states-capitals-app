import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ModeCard } from '../components/ModeCard';
import { MODE_LIST, MODE_INFO } from '../lib/modes';
import type { Mode } from '../quiz/engine';
import { useAppStore } from '../store/useAppStore';

const ROUND_LENGTHS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 'all', label: 'All' },
] as const;

export default function HomeScreen() {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const bestScores = useAppStore((s) => s.bestScores);
  const activeRound = useAppStore((s) => s.activeRound);
  const startRound = useAppStore((s) => s.startRound);
  const setRoundLength = useAppStore((s) => s.setRoundLength);
  const toggleSound = useAppStore((s) => s.toggleSound);
  const togglePracticeMistakes = useAppStore((s) => s.togglePracticeMistakes);
  const resetProgress = useAppStore((s) => s.resetProgress);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const begin = (mode: Mode) => {
    startRound(mode);
    navigate(`/quiz/${mode}`);
  };

  return (
    <main className="min-h-screen bg-sky-200 font-display text-sky-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
        <header className="pt-4 text-center">
          <h1 className="text-4xl font-bold sm:text-6xl">US Geography Quiz</h1>
          <p className="mt-2 text-lg text-sky-900">Pick a game to start!</p>
        </header>

        {activeRound && (
          <button
            type="button"
            onClick={() => navigate(`/quiz/${activeRound.mode}`)}
            className="min-h-14 rounded-3xl bg-green-500 px-6 py-3 text-xl font-bold text-white shadow-lg hover:bg-green-600 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            {`Keep going: ${MODE_INFO[activeRound.mode].title} (question ${activeRound.index + 1} of ${activeRound.questions.length})`}
          </button>
        )}

        <section aria-label="Game modes" className="grid gap-4 md:grid-cols-3">
          {MODE_LIST.map((mode) => (
            <ModeCard
              key={mode}
              mode={mode}
              stars={bestScores[mode]?.stars ?? 0}
              onSelect={() => begin(mode)}
            />
          ))}
        </section>

        <section className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Questions per round</h2>
            <div role="group" aria-label="Questions per round" className="flex gap-2">
              {ROUND_LENGTHS.map((option) => {
                const selected = settings.roundLength === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRoundLength(option.value)}
                    className={`min-h-14 flex-1 rounded-2xl border-2 px-4 text-lg font-bold ${
                      selected
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-sky-300 bg-white text-sky-900 hover:bg-sky-50'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              role="switch"
              aria-checked={settings.practiceMistakes}
              onClick={togglePracticeMistakes}
              className="flex min-h-14 flex-1 items-center justify-between gap-3 rounded-2xl border-2 border-sky-300 bg-white px-4 text-lg font-bold"
            >
              Practice my mistakes
              <span
                aria-hidden="true"
                className={`rounded-full px-3 py-1 text-sm ${settings.practiceMistakes ? 'bg-green-500 text-white' : 'bg-sky-100 text-sky-900'}`}
              >
                {settings.practiceMistakes ? 'On' : 'Off'}
              </span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={settings.sound}
              onClick={toggleSound}
              className="flex min-h-14 flex-1 items-center justify-between gap-3 rounded-2xl border-2 border-sky-300 bg-white px-4 text-lg font-bold"
            >
              Sound effects
              <span
                aria-hidden="true"
                className={`rounded-full px-3 py-1 text-sm ${settings.sound ? 'bg-green-500 text-white' : 'bg-sky-100 text-sky-900'}`}
              >
                {settings.sound ? 'On' : 'Off'}
              </span>
            </button>
          </div>
        </section>

        <footer className="flex flex-col items-center gap-2 pb-6">
          {confirmingReset ? (
            <div
              role="group"
              aria-label="Confirm reset"
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <p className="text-lg">Erase all your stars and progress?</p>
              <button
                type="button"
                onClick={() => {
                  resetProgress();
                  setConfirmingReset(false);
                }}
                className="min-h-12 rounded-2xl bg-orange-600 px-4 py-2 font-bold text-white"
              >
                Yes, reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="min-h-12 rounded-2xl bg-white px-4 py-2 font-bold text-sky-900 border-2 border-sky-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="min-h-12 px-3 text-base text-sky-900 underline"
            >
              Reset my progress
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}
