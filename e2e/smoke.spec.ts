import { expect, test } from '@playwright/test';

test('home page loads with heading and no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'US Geography Quiz' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Map of the United States/ })).toBeVisible();
  await expect(page.locator('svg path[data-fips]')).toHaveCount(50);
  expect(errors).toEqual([]);
});
