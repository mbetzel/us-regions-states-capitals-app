import { expect, test } from '@playwright/test';
import { answerWholeRound, expectResults, startMode } from './quiz-helpers';

/** Three states the child missed. Fips 17 Illinois, 39 Ohio, 41 Oregon. */
const MISSED_STATES = [
  {
    id: 'states:17',
    mode: 'states',
    targetKey: '17',
    prompt: 'What state is highlighted?',
    choices: ['Ohio', 'Illinois', 'Texas', 'Oregon'],
    answer: 'Illinois',
  },
  {
    id: 'states:39',
    mode: 'states',
    targetKey: '39',
    prompt: 'What state is highlighted?',
    choices: ['Illinois', 'Ohio', 'New York', 'Oregon'],
    answer: 'Ohio',
  },
  {
    id: 'states:41',
    mode: 'states',
    targetKey: '41',
    prompt: 'What state is highlighted?',
    choices: ['Texas', 'Oregon', 'Ohio', 'New York'],
    answer: 'Oregon',
  },
];

test('practice missed ones drills exactly the missed states', async ({ page }) => {
  // Seed a finished round in which all three questions were missed, then reload so the app reads it.
  await page.goto('/');
  const stored = {
    state: {
      lastResult: {
        mode: 'states',
        questions: MISSED_STATES,
        answers: ['Ohio', 'Texas', 'Ohio'],
        score: 0,
        total: 3,
        stars: 0,
      },
    },
    version: 1,
  };
  await page.evaluate((raw) => localStorage.setItem('usgeo:v1', raw), JSON.stringify(stored));
  await page.reload();

  await page.goto('/#/results/states');
  await expect(
    page.getByRole('list', { name: 'Missed questions' }).getByRole('listitem'),
  ).toHaveCount(3);
  await page.getByRole('button', { name: 'Practice missed ones' }).click();
  await expect(page).toHaveURL(/\/quiz\/states$/);
  await expect(page.getByText('Question 1 of 3')).toBeVisible();

  const answers = page.getByRole('group', { name: 'Answer choices' }).getByRole('button');
  const next = page.getByRole('button', { name: /^(Next|See my results)/ });
  const highlighted: string[] = [];
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByText(`Question ${i} of 3`)).toBeVisible();
    const fips = await page
      .locator('path[data-highlight="target"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-fips')));
    expect(fips).toHaveLength(1);
    highlighted.push(fips[0] as string);

    await answers.first().click();
    await next.click();
  }

  expect(highlighted.sort()).toEqual(['17', '39', '41']);
  await expect(page.getByRole('heading', { name: 'Practice round' })).toBeVisible();
  await expect(page).toHaveURL(/\/results\/states$/);
});

test('states round of 10 questions ends on results with a matching score', async ({ page }) => {
  await startMode(page, 'States');
  await expect(page.getByText('What state is highlighted?')).toBeVisible();

  const correct = await answerWholeRound(page, 10);
  await expectResults(page, 'states', correct, 10);
});

test('number key answers, then Enter advances to question 2', async ({ page }) => {
  await startMode(page, 'States');
  await expect(page.getByText('Question 1 of 10')).toBeVisible();
  // The heading takes focus in the same effect pass that attaches the key listener.
  await expect(page.getByRole('heading', { name: 'What state is highlighted?' })).toBeFocused();

  await page.keyboard.press('1');
  // Focus moving to Next means the answered-state effects have run.
  await expect(page.getByRole('button', { name: /^Next/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Question 2 of 10')).toBeVisible();
});
