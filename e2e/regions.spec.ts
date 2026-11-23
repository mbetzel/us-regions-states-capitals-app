import { expect, test } from '@playwright/test';
import { answerWholeRound, expectResults, startMode } from './quiz-helpers';

test('regions round has 7 questions and the results score matches the answers', async ({
  page,
}) => {
  await startMode(page, 'Regions');
  await expect(page.getByText('Question 1 of 7')).toBeVisible();

  const correct = await answerWholeRound(page, 7);
  await expectResults(page, 'regions', correct, 7);
});

test('try again starts a fresh regions round', async ({ page }) => {
  await startMode(page, 'Regions');
  await answerWholeRound(page, 7);

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page).toHaveURL(/\/quiz\/regions$/);
  await expect(page.getByText('Question 1 of 7')).toBeVisible();
});
