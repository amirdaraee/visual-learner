// Makes the 1200x630 share cards in assets/social/ from topics.json and the preview images. Maintainer tool, not part of the site.
// Needs Chrome or Chromium (headless). Set CHROME to its path if it is not in the default macOS location.
//   node scripts/social-cards.mjs            all cards
//   node scripts/social-cards.mjs cpu        one topic (use "site" for the site card)
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(chrome)) { console.error(`Chrome not found at ${chrome}. Set CHROME to the browser binary.`); process.exit(1); }
const data = JSON.parse(readFileSync(join(root, 'topics.json'), 'utf8'));
const out = join(root, 'assets', 'social');
mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'vl-cards-'));
const only = process.argv[2];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const img = (p) => pathToFileURL(join(root, p)).href;
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Figtree:wght@500;600&family=Martian+Mono:wght@500&display=swap" rel="stylesheet">';
const CSS = `
*{box-sizing:border-box;margin:0}html,body{width:1200px;height:630px;overflow:hidden}
body{background:radial-gradient(ellipse 80% 70% at 85% 0%,#1d2c22 0%,transparent 70%),#0b0d0c;color:#f1f3ee;font-family:Figtree,Helvetica,Arial,sans-serif;position:relative}
.brand{position:absolute;left:64px;bottom:52px;display:flex;align-items:center;gap:14px;font:800 30px 'Bricolage Grotesque',sans-serif;letter-spacing:-.02em}
.brand svg{width:44px;height:44px}.brand span{color:#99a097;font:500 22px 'Martian Mono',monospace;letter-spacing:0;margin-left:6px}
.tags{display:flex;gap:10px;align-items:center;font:500 20px 'Martian Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
.chip{border:2px solid #c8f03c;color:#c8f03c;padding:6px 16px;border-radius:99px}.lvl{color:#99a097}
h1{font:800 76px/1 'Bricolage Grotesque',sans-serif;letter-spacing:-.035em;text-wrap:balance}
h1 em{font-style:normal;color:#c8f03c}.sub{font-size:30px;line-height:1.35;color:#c4c9c1;margin-top:20px;font-weight:500}
.frame{position:absolute;right:56px;top:96px;width:520px;height:325px;border-radius:22px;overflow:hidden;border:2px solid rgba(255,255,255,.14);box-shadow:0 30px 60px -20px #000;background:#101311}
.frame img{width:100%;height:100%;object-fit:cover;display:block}
`;
const MARK = '<svg viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#171b18"/><path d="M10 8c8 4 4 12 12 16M22 8c-8 4-4 12-12 16" fill="none" stroke="#c8f03c" stroke-width="2.6" stroke-linecap="round"/></svg>';
const brand = `<div class="brand">${MARK}Visual Learner<span>turnscience.com</span></div>`;

function topicHtml(t) {
  const cat = data.categories.find((c) => c.id === t.category);
  const i = t.title.indexOf(':');
  const main = i > 0 ? t.title.slice(0, i) : t.title, sub = i > 0 ? t.title.slice(i + 1).trim() : t.summary;
  return `<!doctype html><meta charset="utf-8">${FONTS}<style>${CSS}.txt{position:absolute;left:64px;top:96px;width:540px}.tags{margin-bottom:30px}</style>
<div class="txt"><div class="tags"><span class="chip">${esc(cat.name)}</span><span class="lvl">${esc(t.level)}</span></div><h1>${esc(main)}</h1><p class="sub">${esc(sub)}</p></div>
<div class="frame"><img src="${img(t.preview)}"></div>${brand}`;
}
function siteHtml() {
  const tiles = data.topics.filter((t) => t.preview).slice(0, 4);
  return `<!doctype html><meta charset="utf-8">${FONTS}<style>${CSS}.txt{position:absolute;left:64px;top:110px;width:560px}
.grid{position:absolute;right:48px;top:64px;width:520px;display:grid;grid-template-columns:1fr 1fr;gap:16px}.grid div{height:240px;border-radius:18px;overflow:hidden;border:2px solid rgba(255,255,255,.14);background:#101311}.grid img{width:100%;height:100%;object-fit:cover}.grid div:nth-child(even){transform:translateY(44px)}</style>
<div class="txt"><h1>Turn science <em>around</em></h1><p class="sub">Interactive 3D explainers you can orbit and change. Biology, math, physics, computer science and more.</p></div>
<div class="grid">${tiles.map((t) => `<div><img src="${img(t.preview)}"></div>`).join('')}</div>${brand}`;
}

const jobs = [['site', siteHtml()], ...data.topics.filter((t) => t.status === 'live' && t.preview).map((t) => [t.id, topicHtml(t)])].filter(([id]) => !only || id === only);
if (!jobs.length) { console.error(`No card named "${only}".`); process.exit(1); }
for (const [id, html] of jobs) {
  const f = join(tmp, id + '.html'); writeFileSync(f, html);
  execFileSync(chrome, ['--headless=new', '--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=12000', `--screenshot=${join(out, id + '.png')}`, pathToFileURL(f).href], { stdio: 'ignore' });
  console.log('assets/social/' + id + '.png');
}
rmSync(tmp, { recursive: true, force: true });
