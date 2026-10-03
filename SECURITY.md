# Security Policy

Visual Learner is a static site. It has no server, no accounts and no database. The only data collection is the site-wide analytics in `shared/analytics.js`: Cloudflare Web Analytics without cookies, and Google Analytics only after a visitor accepts. See [the privacy page](privacy.html). The realistic risks are cross-site scripting in a page, a compromised third-party script, and accidentally committed secrets.

## Reporting a vulnerability

Please report privately through GitHub: **Security → Report a vulnerability** on this repository. Do not open a public issue for a security problem.

Include the affected page, steps to reproduce, and the impact you see. You can expect an acknowledgement within a week. Fixes are published to `main` and go live on the next Pages build.

## Scope

In scope: script injection, unsafe handling of URL or hash input, scripts or assets loaded from unexpected origins, and secrets in the repository.

Out of scope: issues in GitHub Pages itself, in browsers, or in the CDNs we load libraries from (report those to the provider).

## Standards for contributors

- Never commit tokens, keys or personal data.
- Do not add analytics, trackers or third-party embeds to a page. The one analytics file is `shared/analytics.js`, and changes to it need the owner's review.
- Load libraries only from pinned versions on a reputable CDN, or vendor them into `shared/`.
- Build DOM with `textContent` or escaped strings when showing anything that came from outside the page.
