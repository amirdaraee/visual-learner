import { test, expect } from '@playwright/test';

const GA = /googletagmanager\.com\/gtag\/js\?id=G-WZK5PE8P61/;
const CF = /static\.cloudflareinsights\.com\/beacon\.min\.js/;

/** Turns the analytics script on for the local server and records (but never sends) what it asks for. */
async function prepare(page, { dnt = false, test: on = true, consent } = {}) {
  const asked = [];
  await page.route(/googletagmanager\.com|cloudflareinsights\.com|google-analytics\.com/, (route) => { asked.push(route.request().url()); route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }); });
  await page.addInitScript(({ dnt, on, consent }) => {
    if (on) localStorage.setItem('vl-analytics-test', '1');
    if (consent) localStorage.setItem('vl-consent', consent);
    if (dnt) Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
  }, { dnt, on, consent });
  return asked;
}

test.describe('analytics and consent', () => {
  test('sends nothing off the live site (local servers, forks, previews)', async ({ page }) => {
    const asked = await prepare(page, { test: false });
    await page.goto('/index.html');
    await page.waitForTimeout(1200);
    expect(asked).toEqual([]);
    await expect(page.locator('#vl-consent')).toHaveCount(0);
  });

  test('first visit: banner appears, Cloudflare counts, Google does not load', async ({ page }) => {
    const asked = await prepare(page);
    await page.goto('/index.html');
    await expect(page.locator('#vl-consent')).toBeVisible();
    await expect(page.locator('#vl-consent')).toContainText('Cloudflare');
    await expect(page.locator('#vl-consent a')).toHaveAttribute('href', 'privacy.html');
    await page.waitForTimeout(800);
    expect(asked.some((u) => CF.test(u)), 'cloudflare beacon requested').toBe(true);
    expect(asked.some((u) => GA.test(u)), 'google tag before consent').toBe(false);
  });

  test('Decline keeps Google out, remembers the choice and hides the banner', async ({ page }) => {
    const asked = await prepare(page);
    await page.goto('/index.html');
    await page.locator('#vl-consent .no').click();
    await expect(page.locator('#vl-consent')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('vl-consent'))).toBe('denied');
    await page.reload();
    await page.waitForTimeout(800);
    await expect(page.locator('#vl-consent')).toHaveCount(0);
    expect(asked.some((u) => GA.test(u))).toBe(false);
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/_ga/);
  });

  test('Accept loads Google Analytics with advertising features off', async ({ page }) => {
    const asked = await prepare(page);
    await page.goto('/index.html');
    await page.locator('#vl-consent .yes').click();
    await expect(page.locator('#vl-consent')).toHaveCount(0);
    await expect.poll(() => asked.some((u) => GA.test(u))).toBe(true);
    const cfg = await page.evaluate(() => [...window.dataLayer].map((a) => Array.from(a)).find((a) => a[0] === 'config'));
    expect(cfg[1]).toBe('G-WZK5PE8P61');
    expect(cfg[2]).toMatchObject({ allow_google_signals: false, allow_ad_personalization_signals: false });
    expect(await page.evaluate(() => localStorage.getItem('vl-consent'))).toBe('granted');
  });

  test('a saved Accept loads Google straight away, without the banner', async ({ page }) => {
    const asked = await prepare(page, { consent: 'granted' });
    await page.goto('/index.html');
    await expect.poll(() => asked.some((u) => GA.test(u))).toBe(true);
    await expect(page.locator('#vl-consent')).toHaveCount(0);
  });

  test('withdrawing consent stops Google and clears its cookies', async ({ page }) => {
    await prepare(page, { consent: 'granted' });
    await page.goto('/privacy.html');
    await page.evaluate(() => { document.cookie = '_ga=GA1.1.1.1; path=/'; document.cookie = '_ga_WZK5PE8P61=GS1.1.1; path=/'; });
    await page.locator('#change').click();
    await page.locator('#vl-consent .no').click();
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/_ga/);
    expect(await page.evaluate(() => window['ga-disable-G-WZK5PE8P61'])).toBe(true);
    await expect(page.locator('#state')).toContainText('declined');
  });

  test('Do Not Track: nothing loads and there is no banner', async ({ page }) => {
    const asked = await prepare(page, { dnt: true });
    await page.goto('/index.html');
    await page.waitForTimeout(1200);
    expect(asked).toEqual([]);
    await expect(page.locator('#vl-consent')).toHaveCount(0);
  });

  test('the banner does not break a topic page and links to the privacy page from there', async ({ page }) => {
    await prepare(page);
    await page.goto('/computer-science/cpu/');
    await expect(page.locator('#vl-consent a')).toHaveAttribute('href', '../../privacy.html');
    await expect(page.locator('#explain')).toBeVisible();
  });

  test('the privacy page explains both tools and offers a way to change the choice', async ({ page }) => {
    await page.goto('/privacy.html');
    const text = await page.locator('main, .wrap').first().innerText();
    for (const w of ['Cloudflare Web Analytics', 'Google Analytics', 'Do Not Track', 'Google Fonts', 'Change my choice']) expect(text).toContain(w);
    await expect(page.locator('#state')).not.toHaveText('checking…');
  });

  test('the landing footer links to the privacy page', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('footer a[href="privacy.html"]')).toBeVisible();
  });
});
