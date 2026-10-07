const { test, expect } = require('@playwright/test');
const password = 'thoughtful-notebook-2026';
async function register(page, name, email) {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Your mind/ })).toBeVisible();
}
test('real accounts can draft, publish, read, comment, edit and exchange live messages', async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:18107' });
  const reader = await other.newPage();
  reader.on('pageerror', (e) => errors.push(e.message));
  try {
    await register(page, 'Maya Writer', 'maya-browser@example.test');
    await register(reader, 'Alex Reader', 'alex-browser@example.test');
    await page.goto('/write');
    await page.getByLabel('Story title').fill('A thought worth keeping');
    await page
      .getByLabel('Story body')
      .fill(
        '## A useful discovery\n\nSmall notes make big connections. This is a real saved story.',
      );
    await page
      .getByLabel('A little introduction')
      .fill('Finding connections in everyday learning.');
    await page.getByLabel('Topics').fill('Learning');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A useful discovery' })).toBeVisible();
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page).toHaveURL(/\/blogs\/[a-f0-9]{24}\/edit/);
    const story = new URL(page.url()).pathname.replace('/edit', '');
    expect((await reader.request.get('/api/public' + story)).status()).toBe(404);
    await page.screenshot({ path: 'docs/editor-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Publish story', exact: true }).click();
    await page.getByRole('button', { name: 'Publish now', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Your story is out in the world.', { exact: true })).toBeVisible();
    await reader.goto('/blogs');
    await reader
      .getByRole('heading', { name: 'A thought worth keeping' })
      .getByRole('link')
      .click();
    await expect(reader.getByRole('heading', { name: 'A useful discovery' })).toBeVisible();
    await reader
      .getByRole('textbox', { name: 'Your response' })
      .fill('This connected a few dots for me.');
    await reader.getByRole('button', { name: 'Post response' }).click();
    await expect(
      reader.getByText('This connected a few dots for me.', { exact: true }),
    ).toBeVisible();
    await page.getByLabel('Story title').fill('A thought worth sharing');
    await page.getByRole('button', { name: 'Publish changes' }).click();
    await page.getByRole('button', { name: 'Publish now' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await reader.reload();
    await expect(reader.getByRole('heading', { name: 'A thought worth sharing' })).toBeVisible();
    await reader.screenshot({ path: 'docs/article-desktop.png', fullPage: true });
    await page.goto('/messages');
    await reader.goto('/messages');
    await page.getByRole('textbox', { name: 'Find people' }).fill('Alex Reader');
    await page.locator('.people-results').getByRole('button', { name: 'Alex Reader' }).click();
    await expect(page).toHaveURL(/\/messages\/[a-f0-9]{24}/);
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Message', exact: true })
      .fill('Hello from my notebook!');
    await page.getByRole('button', { name: 'Send message' }).click();
    await reader
      .locator('.room-list')
      .getByRole('button', { name: /Maya Writer/ })
      .click();
    await expect(
      reader.locator('.live-message').getByText('Hello from my notebook!'),
    ).toBeVisible();
    await reader
      .getByRole('textbox', { name: 'Message', exact: true })
      .fill('A little shared thinking.');
    await reader.getByRole('button', { name: 'Send message' }).click();
    await expect(
      page.locator('.live-message').getByText('A little shared thinking.'),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator('.live-message').getByText('Hello from my notebook!')).toBeVisible();
    await page.screenshot({ path: 'docs/messages-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Your little corner.' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out of all sessions' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email address').fill('maya-browser@example.test');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Your mind/ })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await other.close();
  }
});
test('public sample stories, filters and the editor fit desktop and mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto('/blogs?demo=true');
  await expect(
    page.getByRole('heading', { name: 'The small art of connecting what you know' }),
  ).toBeVisible();
  await page.screenshot({ path: 'docs/stories-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Technology', exact: true }).click();
  await expect(page.locator('.story-card')).toHaveCount(1);
  await page
    .getByRole('heading', { name: 'A friendlier way to think about RAG' })
    .getByRole('link')
    .click();
  await expect(page.getByRole('heading', { name: 'Start with the source' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blogs');
  await expect(page.locator('.featured-story')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/stories-mobile.png', fullPage: true });
  await page.goto('/write');
  await page.getByLabel('Story title').fill('A mobile thought');
  await page.getByLabel('Story body').fill('I can write wherever an idea arrives.');
  await page.reload();
  await expect(page.getByLabel('Story title')).toHaveValue('A mobile thought');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/editor-mobile.png', fullPage: true });
});
