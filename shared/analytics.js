/* Visual Learner analytics. The only place analytics code lives; pages just load this file.
 *
 *   Cloudflare Web Analytics  always on for visitors who have not opted out: page views, country, device, referrer. No cookies.
 *   Google Analytics 4        only after the visitor clicks Accept in the banner. Sets cookies (_ga*). Never loaded before that.
 *
 * Nothing runs unless the page is served from turnscience.com, so local servers, forks, tests and previews send nothing.
 * Nothing runs at all when the browser sends Do Not Track or Global Privacy Control.
 * The choice is kept in localStorage ("vl-consent": "granted" | "denied"). VLAnalytics.open() shows the banner again.
 * Policy: docs/PRIVACY.md and /privacy.html. Tests turn the script on for other hosts with localStorage "vl-analytics-test" = "1".
 */
(function () {
'use strict';

var GA_ID = 'G-WZK5PE8P61';
var CF_TOKEN = 'e33a7f9bc4584e509018781fc76aeae3';
var HOSTS = ['turnscience.com', 'www.turnscience.com'];
var KEY = 'vl-consent';

function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }
function active() { return HOSTS.indexOf(location.hostname) >= 0 || store('vl-analytics-test') === '1'; }
function optedOut() { return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true; }

var api = window.VLAnalytics = { open: function () {}, status: function () { return 'off'; } };
if (!active() || optedOut()) return;

/* ---- Cloudflare Web Analytics: cookieless ---- */
(function () {
  var s = document.createElement('script');
  s.defer = true; s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_TOKEN }));
  document.head.appendChild(s);
})();

/* ---- Google Analytics: only after consent ---- */
var gaLoaded = false;
function loadGA() {
  if (gaLoaded) return; gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
}
function clearGA() {
  /* withdrawing consent: stop sending and remove Google's cookies for this site */
  window['ga-disable-' + GA_ID] = true;
  document.cookie.split(';').forEach(function (c) {
    var n = c.split('=')[0].trim();
    if (/^_ga(_|$)/.test(n)) { ['', '.' + location.hostname, '.turnscience.com'].forEach(function (d) { document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); }); }
  });
}

/* ---- the banner ---- */
var banner = null;
function css() {
  if (document.getElementById('vl-consent-css')) return;
  var st = document.createElement('style'); st.id = 'vl-consent-css';
  st.textContent = '#vl-consent{position:fixed;z-index:2147483000;left:50%;top:14px;transform:translateX(-50%);width:min(540px,calc(100vw - 340px));min-width:300px;box-sizing:border-box;padding:14px 16px 14px;border-radius:14px;background:rgba(12,14,13,.92);border:1px solid rgba(255,255,255,.2);color:#f1f3ee;font:500 13px/1.45 Figtree,system-ui,sans-serif;box-shadow:0 20px 50px -20px #000;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}' +
    '#vl-consent p{margin:0 0 10px;color:#c4c9c1}#vl-consent b{color:#f1f3ee;font-weight:700}#vl-consent a{color:#c8f03c}' +
    '#vl-consent .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '#vl-consent button{font:700 13px Figtree,system-ui,sans-serif;height:36px;padding:0 16px;border-radius:99px;border:0;cursor:pointer;background:transparent;color:#f1f3ee;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}' +
    '#vl-consent button.yes{background:#c8f03c;color:#11160a;box-shadow:none}#vl-consent button:focus-visible,#vl-consent a:focus-visible{outline:2px solid #c8f03c;outline-offset:2px}' +
    '@media(max-width:900px){#vl-consent{width:auto;min-width:0;left:10px;right:10px;transform:none;top:10px}}';
  document.head.appendChild(st);
}
function close() { if (banner) { banner.remove(); banner = null; } }
function choose(v) { store(KEY, v); if (v === 'granted') loadGA(); else clearGA(); close(); }
function el(tag, props, kids) {
  var e = document.createElement(tag); Object.keys(props || {}).forEach(function (k) { e[k] = props[k]; });
  (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e;
}
function open() {
  if (banner) return; css();
  var yes = el('button', { type: 'button', className: 'yes', textContent: 'Accept' }), no = el('button', { type: 'button', className: 'no', textContent: 'Decline' });
  yes.addEventListener('click', function () { choose('granted'); });
  no.addEventListener('click', function () { choose('denied'); });
  banner = el('div', { id: 'vl-consent' }, [
    el('p', {}, [el('b', { textContent: 'Counting visits. ' }), 'This site counts page views with Cloudflare Web Analytics, which uses no cookies. Google Analytics is optional and does set cookies. Accept it to show which topics help most?']),
    el('div', { className: 'row' }, [yes, no, el('a', { href: privacyUrl(), textContent: 'Privacy' })])
  ]);
  banner.setAttribute('role', 'dialog'); banner.setAttribute('aria-label', 'Analytics choice');
  document.body.appendChild(banner);
}
function privacyUrl() {
  /* the privacy page sits next to the landing page; shared/analytics.js is found relative to it */
  var me = document.querySelector('script[src$="shared/analytics.js"]');
  return me ? me.getAttribute('src').replace('shared/analytics.js', 'privacy.html') : '/privacy.html';
}

api.open = open;
api.status = function () { return store(KEY) || 'unset'; };

var saved = store(KEY);
if (saved === 'granted') loadGA();
function ready(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
if (saved !== 'granted' && saved !== 'denied') ready(open);
})();
