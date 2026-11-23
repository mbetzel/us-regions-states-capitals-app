import { expect, test } from '@playwright/test';
import { answerWholeRound, expectResults, startMode } from './quiz-helpers';

test('states round of 10 questions ends on results with a matching score', async ({ page }) => {
  await startMode(page, 'States');
  await expect(page.getByText('What state is highlighted?')).toBeVisible();

  const correct = await answerWholeRound(page, 10);
  await expectResults(page, 'states', correct, 10);
});

test('practice missed ones starts a round when something was missed', async ({ page }) => {
  await startMode(page, 'States');
  const correct = await answerWholeRound(page, 10);
  test.skip(correct === 10, 'Nothing was missed in this random round');

  await page.getByRole('button', { name: 'Practice missed ones' }).click();
  await expect(page).toHaveURL(/\/quiz\/states$/);
  await expect(page.getByText('Question 1 of 10')).toBeVisible();
});
