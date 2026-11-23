import { REGION_BY_ID, type RegionId } from '../data/regions';
import { STATE_BY_FIPS } from '../data/states';
import { grade, type Question } from '../quiz/engine';
import type { MapHighlight } from '../map/USMap';

/** The map highlight that matches a question. */
export function highlightFor(question: Question): MapHighlight {
  switch (question.mode) {
    case 'regions':
      return { kind: 'region', regionId: question.targetKey as RegionId };
    case 'states':
      return { kind: 'state', fips: question.targetKey };
    case 'capitals':
      return { kind: 'state', fips: question.targetKey, showCapital: true };
  }
}

/** The name of the thing being asked about: a region or a state. */
export function targetName(question: Question): string {
  if (question.mode === 'regions') return REGION_BY_ID[question.targetKey as RegionId].name;
  return STATE_BY_FIPS[question.targetKey].name;
}

/** Number of correct answers in a row, counting back from the latest answered question. */
export function currentStreak(questions: Question[], answers: (string | null)[]): number {
  let streak = 0;
  for (let i = 0; i < questions.length; i++) {
    const answer = answers[i];
    if (answer === null || answer === undefined) break;
    streak = grade(questions[i], answer) ? streak + 1 : 0;
  }
  return streak;
}

/** Questions the child got wrong (or never answered), in round order. */
export function missedQuestions(questions: Question[], answers: (string | null)[]): Question[] {
  return questions.filter((q, i) => {
    const answer = answers[i];
    return answer === null || answer === undefined || !grade(q, answer);
  });
}
