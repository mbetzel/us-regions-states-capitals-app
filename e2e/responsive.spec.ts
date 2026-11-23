import { expect, test, type Page } from '@playwright/test';
import { answerWholeRound, startMode } from './quiz-helpers';

const PHONE = { width: 375, height: 812 };
const LAPTOP = { width: 1280, height: 800 };

/** True when the page is wider than its window, which means a horizontal scrollbar. */
async function horizontalOverflow(
  page: Page,
): Promise<{ scrollWidth: number; innerWidth: number }> {
  // String form keeps DOM globals out of the Node-side type check (tsc -b covers e2e/).
  return page.evaluate(
    '({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })',
  );
}

/** Clicks the correct answer of the current question, read from the saved round. */
async function answerCorrectly(page: Page): Promise<void> {
  const answer: string = await page.evaluate(`(() => {
    const raw = window.localStorage.getItem('usgeo:v1');
    if (!raw) throw new Error('no saved state');
    const round = JSON.parse(raw).state.activeRound;
    return round.questions[round.index].answer;
  })()`);
  await page
    .getByRole('group', { name: 'Answer choices' })
    .getByRole('button', { name: answer, exact: true })
    .click();
}

for (const [name, viewport] of [
  ['phone 375x812', PHONE],
  ['laptop 1280x800', LAPTOP],
] as const) {
  test.describe(`layout at ${name}`, () => {
    test.use({ viewport });

    test('home has no horizontal scroll', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'US Geography Quiz' })).toBeVisible();
      const { scrollWidth, innerWidth } = await horizontalOverflow(page);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });

    test('quiz has no horizontal scroll', async ({ page }) => {
      await startMode(page, 'Regions');
      await expect(page.getByText('Question 1 of 7')).toBeVisible();
      const { scrollWidth, innerWidth } = await horizontalOverflow(page);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

      await answerCorrectly(page);
      await expect(page.getByRole('button', { name: /^(Next|See my results)/ })).toBeVisible();
      const after = await horizontalOverflow(page);
      expect(after.scrollWidth).toBeLessThanOrEqual(after.innerWidth);
    });
  });
}

test('a full regions round logs no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await startMode(page, 'Regions');
  await answerWholeRound(page, 7);
  await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('with reduced motion, answering creates no confetti canvas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startMode(page, 'Regions');
  await expect(page.getByText('Question 1 of 7')).toBeVisible();

  await answerCorrectly(page);
  await expect(page.getByRole('button', { name: /^Next/ })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('without reduced motion, a correct answer does create a confetti canvas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await startMode(page, 'Regions');
  await expect(page.getByText('Question 1 of 7')).toBeVisible();

  await answerCorrectly(page);
  await expect(page.getByRole('button', { name: /^Next/ })).toBeVisible();
  await expect(page.locator('canvas')).not.toHaveCount(0);
});
