import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const manifest = JSON.parse(readFileSync(join(root, 'topics.json'), 'utf8'));
export const liveTopics = manifest.topics.filter((t) => t.status === 'live');

/** Hosts a page may load from: our own server and the pinned CDNs the guide allows. */
export const ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

/** Collects what a page does wrong: script errors, console errors, failed requests, third-party hosts. */
export function watch(page) {
  const log = { errors: [], hosts: new Set() };
  page.on('pageerror', (e) => log.errors.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon/.test(t) || /Failed to load resource.*404/.test(t) && /favicon/.test(m.location()?.url || '')) return;
    log.errors.push(`console error: ${t}`);
  });
  page.on('requestfailed', (r) => { if (!/favicon/.test(r.url())) log.errors.push(`request failed: ${r.url()}`); });
  page.on('request', (r) => { try { const u = new URL(r.url()); if (u.protocol.startsWith('http')) log.hosts.add(u.hostname); } catch { /* data: and blob: */ } });
  return log;
}

export async function waitForScene(page) {
  await page.waitForSelector('#gl', { state: 'attached' });
  await page.waitForFunction(() => { const c = document.getElementById('gl'); return c && c.width > 0 && c.height > 0; });
  // the loading label fades out after the first rendered frame
  await page.waitForFunction(() => { const l = document.getElementById('loading'); return !l || getComputedStyle(l).opacity === '0' || l.style.opacity === '0'; }, null, { timeout: 30_000 }).catch(() => {});
}
