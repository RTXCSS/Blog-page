const { test, expect } = require('@playwright/test');
test('sample workspace: ask, inspect a citation, save a note, search, and revisit history', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto('/?demo=true');
  await expect(page.getByRole('heading', { name: /Your mind/ })).toBeVisible();
  await page.screenshot({ path: 'docs/workspace-desktop.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Ask your Second Brain' }).fill('What is RAG?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByText('Sample excerpt', { exact: true })).toBeVisible();
  await page.locator('.answer-sources button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/Referenced passage/)).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Add knowledge', exact: true }).click();
  await page.getByRole('button', { name: 'Write a note', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('UI test memory');
  await page
    .getByLabel('Your note', { exact: true })
    .fill('I learned how knowledge retrieval works.');
  await page.getByRole('button', { name: 'Add to my knowledge' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'My knowledge' }).click();
  await expect(page.getByRole('heading', { name: 'UI test memory' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search your knowledge' }).fill('retrieval');
  await page.getByRole('button', { name: 'Find it', exact: true }).click();
  await expect(page.locator('.search-result').first()).toBeVisible();
  await page.getByRole('button', { name: 'What is RAG?', exact: true }).click();
  await expect(page.getByText('Sample excerpt', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile navigation and login are usable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.screenshot({ path: 'docs/login-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await page.screenshot({ path: 'docs/signup-mobile.png', fullPage: true });
  await page.getByRole('button', { name: /Explore the sample workspace/ }).click();
  await expect(page.getByRole('heading', { name: /Your mind/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/workspace-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Good things come together.' })).toBeVisible();
});
