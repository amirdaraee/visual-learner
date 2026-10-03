import { test, expect } from '@playwright/test';
import { manifest, watch } from './helpers.mjs';

// the landing page always looks at every topic, even when a pull request limits the topic tests
const liveTopics = manifest.topics.filter((t) => t.status === 'live');

test.describe('landing page', () => {
  test('shows every subject and loads without errors', async ({ page }) => {
    const log = watch(page);
    await page.goto('/index.html');
    await expect(page.locator('h1')).toContainText('subject');
    await expect(page.locator('main .grid a.card, main .grid .card')).toHaveCount(manifest.categories.length);
    expect(log.errors).toEqual([]);
  });

  test('opens a subject, lists its concepts, and the back link returns', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('a.card[href="#biology"]').click();
    await expect(page.locator('h1')).toHaveText('Biology');
    await expect(page.locator('.grid h3', { hasText: 'Exome Lab' })).toBeVisible();
    await page.locator('a.crumb').click();
    await expect(page.locator('h1')).toContainText('subject');
  });

  test('a subject without concepts says so', async ({ page }) => {
    const empty = manifest.categories.find((c) => !manifest.topics.some((t) => t.category === c.id || (t.also || []).includes(c.id)));
    test.skip(!empty, 'every subject has a concept');
    await page.goto(`/index.html#${empty.id}`);
    await expect(page.locator('.empty')).toContainText('coming soon');
  });

  test('a topic listed under several subjects appears under each of them', async ({ page }) => {
    const multi = liveTopics.find((t) => (t.also || []).length);
    test.skip(!multi, 'no multi-subject topic');
    for (const id of [multi.category, ...multi.also]) {
      await page.goto(`/index.html#${id}`);
      await expect(page.locator('.grid h3', { hasText: multi.title.split(':')[0] })).toBeVisible();
    }
  });

  test('search finds a concept across subjects and shows no result politely', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#q', liveTopics[0].title.split(':')[0].split(' ')[0]);
    await expect(page.locator('.count')).toContainText('MATCH');
    await expect(page.locator('.grid a.card').first()).toBeVisible();
    await page.fill('#q', 'zzzzqq');
    await expect(page.locator('.empty')).toContainText('Nothing matches');
  });

  test('the subject filter chips switch subjects', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.chip[data-id="math"]').click();
    await expect(page.locator('h1')).toHaveText('Math');
    await page.locator('.chip[data-id="all"]').click();
    await expect(page.locator('h1')).toContainText('subject');
  });

  test('every preview image is served as an image, and the ones in view load', async ({ page, request }) => {
    await page.goto('/index.html');
    await page.waitForSelector('.shot img');
    // every preview file exists and is served as an image (the images load lazily, so this is checked on the files themselves)
    const srcs = await page.locator('.shot img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      const res = await request.get('/' + src);
      expect(res.status(), src).toBe(200);
      expect(res.headers()['content-type'], src).toMatch(/^image\//);
    }
    // the first row is on screen at load, so it must be drawn
    const first = page.locator('.shot img').first();
    await expect.poll(() => first.evaluate((e) => e.complete && e.naturalWidth > 0)).toBe(true);
  });

  test('has no horizontal scroll on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    await page.waitForSelector('.card');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('has share tags that point at real files', async ({ page, request }) => {
    await page.goto('/index.html');
    const img = await page.getAttribute('meta[property="og:image"]', 'content');
    expect(img).toMatch(/^https:\/\/turnscience\.com\/assets\/social\/site\.png$/);
    expect((await request.get(new URL(img).pathname)).status()).toBe(200);
    expect(await page.getAttribute('meta[name="twitter:card"]', 'content')).toBe('summary_large_image');
  });

  test('the 404 page links home', async ({ request }) => {
    const res = await request.get('/404.html');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('<a href="/">');
  });
});
