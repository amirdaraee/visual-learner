# Analytics and privacy (for maintainers)

The public explanation is [privacy.html](../privacy.html). This is how it works and how to look after it.

## What runs

| Tool | When | Cookies | Where the data is |
| --- | --- | --- | --- |
| Cloudflare Web Analytics | every visit to turnscience.com, unless Do Not Track or Global Privacy Control | none | Cloudflare dashboard, account for turnscience.com (Analytics, Web Analytics) |
| Google Analytics 4 | only after the visitor clicks Accept | `_ga`, `_ga_WZK5PE8P61` | analytics.google.com, property "Visual Learner (turnscience.com)", stream "Visual Learner" |

Everything is in `shared/analytics.js`, loaded by the landing page, the privacy page and every topic with `<script defer src="...shared/analytics.js">`. The script does nothing unless the page is served from turnscience.com or www.turnscience.com, so local servers, forks and previews send nothing.

## The rules the code and tests enforce

- Google Analytics loads only through the consent path (`vl-consent` = `granted` in the visitor's localStorage). Declining or withdrawing stops it and removes its cookies.
- Google signals and ad personalisation are off.
- Do Not Track and Global Privacy Control switch everything off and hide the banner.
- No page embeds analytics code of its own. `npm run validate` fails if one does, and checks the script's safeguards.
- `tests/e2e/analytics.spec.mjs` covers first visit, decline, accept, saved choice, withdrawal, Do Not Track and the privacy page, with the network calls intercepted.

## Changing it

1. Change the IDs in `shared/analytics.js` (`GA_ID`, `CF_TOKEN`). They are public values.
2. If you add a tool or a new kind of data, update `privacy.html` in the same change, and `CLAUDE.md` rule 4 if the rule changes.
3. Run `npm test`.

## Looking at the data

- Cloudflare: dashboard, the account that holds the domain, Analytics, Web Analytics, site turnscience.com.
- Google: Reports. Topic step views arrive as page views because each step is in the address (`#step`). GA4 counts only visitors who accepted, so its numbers are lower than Cloudflare's. Compare the two before drawing conclusions.

## Settings worth a look in Google Analytics

Admin, Data collection, Data retention (the default is two months for event data; 14 months is the maximum on the free tier). Google signals stay off. Do not turn on advertising features.
