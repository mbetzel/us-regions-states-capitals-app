export type AnswerState = 'idle' | 'correct' | 'wrong' | 'reveal-correct' | 'disabled';

interface AnswerButtonProps {
  label: string;
  /** The number key (1 to 4) that picks this answer. */
  keyNumber: number;
  state: AnswerState;
  onPick: () => void;
}

const STYLES: Record<AnswerState, string> = {
  idle: 'border-sky-300 bg-white text-sky-950 hover:border-sky-500 hover:bg-sky-50',
  correct: 'border-green-600 bg-green-100 text-green-900',
  'reveal-correct': 'border-green-600 bg-green-100 text-green-900',
  // Soft orange, never red: a wrong pick is a "try again" moment, not a failure.
  wrong: 'border-orange-500 bg-orange-100 text-orange-900',
  disabled: 'border-sky-200 bg-white/60 text-sky-700 opacity-70',
};

const ICONS: Partial<Record<AnswerState, string>> = {
  correct: '✓',
  'reveal-correct': '✓',
  wrong: '✗',
};

export function AnswerButton({ label, keyNumber, state, onPick }: AnswerButtonProps) {
  const icon = ICONS[state];
  return (
    <button
      type="button"
      data-state={state}
      disabled={state !== 'idle'}
      onClick={onPick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-lg font-bold transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-default ${STYLES[state]}`}
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base text-sky-900"
      >
        {keyNumber}
      </span>
      <span className="flex-1">{label}</span>
      {icon && (
        <span aria-hidden="true" className="text-2xl">
          {icon}
        </span>
      )}
    </button>
  );
}
