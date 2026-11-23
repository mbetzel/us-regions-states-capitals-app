import { useState } from 'react';
import { pickPraise } from '../lib/praise';

export type FeedbackStatus = 'idle' | 'correct' | 'wrong';

interface AnswerFeedbackProps {
  status: FeedbackStatus;
  /** The correct label, shown after a wrong answer. */
  answer: string;
}

/** The live region stays mounted so screen readers announce each new message. */
export function AnswerFeedback({ status, answer }: AnswerFeedbackProps) {
  return (
    <div aria-live="polite" className="min-h-14">
      {status === 'correct' && <CorrectMessage />}
      {status === 'wrong' && (
        <p className="anim-pop-in text-xl font-bold text-orange-900">
          Nice try! That&apos;s <span className="underline decoration-2">{answer}</span>.{' '}
          <span className="font-semibold">You&apos;ll get it next time!</span>
        </p>
      )}
    </div>
  );
}

/** Mounted once per correct answer, so the random praise is picked once and stays put. */
function CorrectMessage() {
  const [praise] = useState(() => pickPraise());
  return (
    <p className="anim-pop-in text-xl font-bold text-green-800">
      <span aria-hidden="true">✓ </span>
      {praise}
    </p>
  );
}
