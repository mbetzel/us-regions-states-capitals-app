import { expect, test } from '@playwright/test';
import { answerWholeRound, expectResults, startMode } from './quiz-helpers';

test('a refresh mid-round resumes at the next unanswered question', async ({ page }) => {
  await startMode(page, 'States');
  const answers = page.getByRole('group', { name: 'Answer choices' }).getByRole('button');
  const next = page.getByRole('button', { name: /^Next/ });

  for (let i = 1; i <= 3; i++) {
    await answers.first().click();
    await next.click();
  }
  await expect(page.getByText('Question 4 of 10')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/quiz\/states$/);
  await expect(page.getByText('Question 4 of 10')).toBeVisible();

  await page.getByRole('link', { name: 'Quit' }).click();
  await expect(
    page.getByRole('button', { name: 'Keep going: States (question 4 of 10)' }),
  ).toBeVisible();
});

test('a refresh after answering keeps the question locked', async ({ page }) => {
  await startMode(page, 'States');
  await page.getByRole('group', { name: 'Answer choices' }).getByRole('button').first().click();

  await page.reload();
  await expect(page.getByText('Question 1 of 10')).toBeVisible();
  // Whether the first pick was right or wrong, the right answer shows green and is locked.
  await expect(page.locator('[data-state="correct"], [data-state="reveal-correct"]')).toHaveCount(
    1,
  );
  await expect(page.getByRole('button', { name: /^Next/ })).toBeVisible();
});

test('a refresh on the results page still shows the score', async ({ page }) => {
  await startMode(page, 'Regions');
  const correct = await answerWholeRound(page, 7);

  await page.reload();
  await expectResults(page, 'regions', correct, 7);
});

test('reset progress clears the stars', async ({ page }) => {
  await page.goto('/');
  // Seed a stored best score of 3 stars for Regions, then reload so the app reads it.
  await page.evaluate(() => {
    localStorage.setItem(
      'usgeo:v1',
      JSON.stringify({
        state: {
          bestScores: {
            regions: { stars: 3, bestPct: 100, lastPlayed: new Date().toISOString() },
          },
        },
        version: 1,
      }),
    );
  });
  await page.reload();
  const regions = page.getByRole('button', { name: /^Regions/ });
  await expect(regions.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();

  await page.getByRole('button', { name: 'Reset my progress' }).click();
  await page.getByRole('button', { name: 'Yes, reset' }).click();

  await expect(regions.getByRole('img', { name: '0 of 3 stars' })).toBeVisible();
});
