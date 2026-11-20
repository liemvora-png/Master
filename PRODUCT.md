# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, weighted equally (confirmed by owner):

- **Recruiters and hiring managers** evaluating Connor Chen for a role — scanning projects, accomplishments, and current activity.
- **Clients** evaluating and booking services — the site carries a `/services` surface and a real booking flow (Clerk instance at clerk.liemvora.cc, `BOOKING_EMAIL` transactional email from the Worker).

Secondary: technical peers and collaborators who arrive through a specific project or news item.

## Product Purpose

Personal portfolio for Connor Chen. It presents the person and their work, keeps itself demonstrably current through admin-managed news and a last-updated status, and converts interest into either a hiring conversation or a booked services session. Success = a visitor forms an accurate, current picture of what Connor does and takes contact/booking action.

## Positioning

**Breadth of practice in one living place** (owner-chosen). Unlike a portfolio that shows only past projects, this site carries the whole practice at once: projects, accomplishments, arrangements, services, gallery, and news — all maintained live through an admin content system. The differentiator a neighbor could not copy without doing the same ongoing work is that the breadth is current, not a static snapshot.

## Operating Context

- Content is edited through an admin surface and served from Cloudflare D1 (`portfolio-content`); the public pages fetch `/api/content` (nav labels, wordmark name, footer, last-updated timestamp) and `/api/news` (home news feed, top 3 items).
- Gallery assets live in Cloudflare R2 (`portfolio-gallery`).
- Booking runs through Clerk (`clerk.liemvora.cc`) and Worker `send_email`.
- Owner develops with `wrangler dev` (`npm run dev`); deploys with `wrangler deploy`.
- Visitors can toggle light/dark theme; choice persists in localStorage and prevents flash via an inline head script.

## Capabilities and Constraints

- Architecture: Cloudflare Worker (`src/worker.js`) with static Assets binding, `run_worker_first: true`, D1 and R2 bindings. Node ≥ 20, `node --test` tests.
- All public pages share one stylesheet (`public/styles.css`) and one behavior script (`public/assets/site.js`); home behavior depends on specific selectors (`#home-last-updated`, `#home-news-list`, `.wordmark-name`, `.site-footer > span`, `[data-theme-toggle]`, `meta[name="theme-color"]`). Behavior changes must keep these contracts.
- Current redesign scope is **the home page only**. Home-scope surface brief keeps these untouched: nav structure, news feed, last-updated status, theme toggle behavior.
- Shared stylesheet means other pages must not regress; home-scoped styling is the working approach.

## Brand Commitments

- Brand-element binding status was **not decided** when asked (δ glyph, name, copy voice, live-content primacy were offered as a set; owner skipped). Treat them as open questions, not free variables.
- Color anchor **is decided** (owner instruction during the home redesign): every page, home included, uses the shared palette in `public/styles.css` (cream/olive/ink light, dark mirror); no page-private palettes.
- Structural facts regardless of that choice: the δ wordmark glyph and the name are rendered in markup and updated by `site.js` from live API content; footer strings are likewise API-driven. Existing page copy ("Welcome to my portfolio.", "MADE WITH CARE · 2026") is current product truth and stays unless the owner changes it.
- Live, admin-managed content is the source of truth for news, timestamps, nav labels, and footer strings. Design work renders that content; it never hardcodes substitutes.

## Evidence on Hand

- Real, working surfaces: home, `/projects`, `/accomplishments.html`, `/arrangements.html`, `/services`, `/gallery`, `/news`, plus admin and booking plumbing.
- Real content system: D1-backed content API, news API, R2 gallery bucket, timestamped last-updated status.
- **Absences that must not be fabricated:** no testimonials, client logos, customer counts, pricing claims, or benchmarks exist in the repo. Any such claim in a design is invention and is banned. Demonstrative content authored for design purposes must be labeled synthetic.

## Product Principles

1. The site proves current activity, not just past work — recency is a feature, not decoration.
2. One practice, many surfaces: a visitor should feel the breadth (work, services, arrangements, gallery, news) belongs to the same person.
3. Real systems over mocks: live content, real booking, real email — the design must never pretend at what already runs.
4. The person leads the work: identity is first, artifacts follow (owner's confirmed home-page answer).

## Accessibility & Inclusion

No product-specific requirement established. Baseline expectations apply: skip link, semantic landmarks, and the status live-region (`[role="status"]`) already exist on home and must be preserved.
