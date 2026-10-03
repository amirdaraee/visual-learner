import { test, expect } from '@playwright/test';
import { liveTopics, watch, waitForScene, ALLOWED_HOSTS, manifest } from './helpers.mjs';
import { lintPanel, lintNote } from '../../scripts/lib/writing-rules.mjs';

const stepButtons = (page) => page.locator('#seg-stage button');

for (const topic of liveTopics) {
  test.describe(`${topic.id}`, () => {
    test('loads, renders a scene and stays inside the rules', async ({ page }) => {
      const log = watch(page);
      await page.goto(topic.path);
      await waitForScene(page);
      expect(log.errors, 'errors while loading').toEqual([]);
      // stays inside the allowed hosts
      expect([...log.hosts].filter((h) => !ALLOWED_HOSTS.includes(h)), 'third-party hosts').toEqual([]);
      // a real picture was drawn: a blank canvas compresses to almost nothing as a PNG
      const png = await page.locator('#gl').screenshot();
      expect(png.length, 'size of the rendered picture (bytes)').toBeGreaterThan(15_000);
      // standard furniture
      expect(await stepButtons(page).count()).toBeGreaterThanOrEqual(3);
      await expect(page.locator('#explain')).toBeVisible();
      await expect(page.locator('#why')).not.toBeEmpty();
      // the home link opens this topic's subject
      const home = await page.locator('a.icb[href*="index.html"]').first().getAttribute('href');
      expect(home).toBe(`../../index.html#${topic.category}`);
      // camera sway is off until asked for
      expect(await page.getAttribute('#cine', 'aria-pressed')).toBe('false');
    });

    test('every step can be opened, and its explanation follows the writing guide', async ({ page }) => {
      const log = watch(page);
      await page.goto(topic.path);
      await waitForScene(page);
      const n = await stepButtons(page).count();
      const problems = [];
      for (let i = 0; i < n; i++) {
        await stepButtons(page).nth(i).click();
        await expect(stepButtons(page).nth(i)).toHaveAttribute('aria-pressed', 'true');
        await page.waitForTimeout(500);
        const note = (await page.locator('#why').innerText()).trim();
        lintNote(note).forEach((p) => problems.push(`step ${i + 1} note: ${p}`));
        await page.locator('#explain').click();
        const dlg = page.locator('dialog[open]');
        await expect(dlg).toBeVisible();
        const panel = await dlg.evaluate((d) => ({ title: (d.querySelector('h2') || {}).textContent || '', headings: [...d.querySelectorAll('h3')].map((h) => h.textContent.trim()), body: d.innerText, hasTry: !!d.querySelector('.try') }));
        lintPanel(panel).forEach((p) => problems.push(`step ${i + 1} explain panel: ${p}`));
        await page.keyboard.press('Escape');
        await expect(dlg).toHaveCount(0);
      }
      expect(problems, 'writing guide').toEqual([]);
      expect(log.errors).toEqual([]);
    });

    test('arrow keys move between steps and the explain key opens the panel', async ({ page }) => {
      await page.goto(topic.path);
      await waitForScene(page);
      await stepButtons(page).first().click();
      await page.locator('#gl').click({ position: { x: 5, y: 5 } }).catch(() => {});
      await page.keyboard.press('ArrowRight');
      await expect(stepButtons(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('ArrowLeft');
      await expect(stepButtons(page).first()).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('e');
      await expect(page.locator('dialog[open]')).toBeVisible();
    });

    test('a step can be reached from the address bar', async ({ page }) => {
      await page.goto(topic.path);
      await waitForScene(page);
      const n = await stepButtons(page).count();
      await stepButtons(page).nth(n - 1).click();
      await page.waitForTimeout(400);
      const hash = new URL(page.url()).hash;
      expect(hash.length, 'the step is written to the address').toBeGreaterThan(1);
      await page.goto(topic.path + hash);
      await waitForScene(page);
      await expect(stepButtons(page).nth(n - 1)).toHaveAttribute('aria-pressed', 'true');
    });

    test('fits a phone: no sideways scroll, card and controls do not overlap', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(topic.path);
      await waitForScene(page);
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => {
        const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
        const side = r('.side'), ctl = r('.ctl'), tools = r('.tools');
        return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, sideBottom: side && side.bottom, ctlTop: ctl && ctl.top, ctlBottom: ctl && ctl.bottom, toolsBottom: tools && tools.bottom, sideTop: side && side.top, vh: innerHeight };
      });
      expect(m.overflow).toBeLessThanOrEqual(0);
      expect(m.sideTop, 'card starts below the tool row').toBeGreaterThanOrEqual(m.toolsBottom - 1);
      expect(m.sideBottom, 'card ends above the controls').toBeLessThanOrEqual(m.ctlTop + 1);
      expect(m.ctlBottom).toBeLessThanOrEqual(m.vh + 1);
      // tap targets
      const small = await page.evaluate(() => [...document.querySelectorAll('.tools .icb, .ctl .btn, #seg-stage button')].filter((e) => e.offsetParent).map((e) => ({ t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 20), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width })).filter((x) => x.h < 36 || x.w < 36));
      expect(small, 'controls smaller than 36 px').toEqual([]);
    });

    test('works with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const log = watch(page);
      await page.goto(topic.path);
      await waitForScene(page);
      await page.locator('#explain').click();
      await expect(page.locator('dialog[open]')).toBeVisible();
      expect(log.errors).toEqual([]);
    });

    test('fails gracefully without WebGL', async ({ page }) => {
      await page.addInitScript(() => {
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/i.test(type) ? null : orig.call(this, type, ...rest); };
      });
      const log = watch(page);
      await page.goto(topic.path);
      await page.waitForTimeout(2500);
      await expect(page.locator('.fallback')).toBeVisible();
      await expect(page.locator('#explain')).toBeVisible();
      expect(log.errors.filter((e) => !/WebGL|webgl|context/i.test(e))).toEqual([]);
    });
  });
}

test('every category the topics use has a landing entry', () => {
  const ids = new Set(manifest.categories.map((c) => c.id));
  for (const t of liveTopics) { expect(ids.has(t.category)).toBe(true); (t.also || []).forEach((a) => expect(ids.has(a)).toBe(true)); }
});
