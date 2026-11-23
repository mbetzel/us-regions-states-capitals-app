import { expect, type Page } from '@playwright/test';

export type ModeTitle = 'Regions' | 'States' | 'Capitals';

/** Opens home and starts a round in the given mode. */
export async function startMode(page: Page, title: ModeTitle): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(`^${title}`) }).click();
}

/**
 * Answers every question in the round by clicking the first answer each time.
 * The correct answer is revealed through data-state only after clicking, so the
 * score is counted from first-click results. Returns how many were correct.
 */
export async function answerWholeRound(page: Page, total: number): Promise<number> {
  const answers = page.getByRole('group', { name: 'Answer choices' }).getByRole('button');
  const next = page.getByRole('button', { name: /^(Next|See my results)/ });
  let correct = 0;

  for (let i = 1; i <= total; i++) {
    await expect(page.getByText(`Question ${i} of ${total}`)).toBeVisible();
    await expect(answers).toHaveCount(4);
    await answers.first().click();
    await expect(next).toBeVisible();

    const states = await answers.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-state')),
    );
    expect(states.filter((s) => s === 'correct' || s === 'reveal-correct')).toHaveLength(1);
    if (states[0] === 'correct') correct++;

    await next.click();
  }
  return correct;
}

/** Checks the results page shows the expected score and one list item per missed question. */
export async function expectResults(page: Page, mode: string, correct: number, total: number) {
  await expect(page).toHaveURL(new RegExp(`/results/${mode}$`));
  await expect(page.getByText(`${correct} / ${total}`, { exact: true })).toBeVisible();

  const missed = total - correct;
  if (missed > 0) {
    await expect(
      page.getByRole('list', { name: 'Missed questions' }).getByRole('listitem'),
    ).toHaveCount(missed);
  } else {
    await expect(page.getByRole('list', { name: 'Missed questions' })).toHaveCount(0);
  }
}
