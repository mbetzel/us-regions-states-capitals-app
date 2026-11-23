import { expect, test } from '@playwright/test';
import { answerWholeRound, expectResults, startMode } from './quiz-helpers';

test('capitals round of 10 questions ends on results with a matching score', async ({ page }) => {
  await startMode(page, 'Capitals');
  await expect(page.getByText(/What is the capital of/)).toBeVisible();

  const correct = await answerWholeRound(page, 10);
  await expectResults(page, 'capitals', correct, 10);
});
