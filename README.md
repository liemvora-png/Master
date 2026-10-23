# Liem Vora — Personal website

A minimal, responsive website for projects, accomplishments, and sheet music arrangements. Public pages remain plain HTML and CSS, with content loaded from Cloudflare D1. The original HTML content stays in place as an offline/static fallback.

## Pages

- `index.html` — projects
- `accomplishments.html` — music, athletics, and coaching highlights
- `arrangements.html` — sheet music arrangements
- `admin.html` — private JSON content editor

## Cloudflare Worker setup

`wrangler.jsonc` is the deployment source of truth for the `master` Worker, static assets, D1 binding, and Access variables. Before deploying, replace the two `REPLACE_...` Access placeholders in that file:

- `ACCESS_TEAM_DOMAIN` — your Zero Trust team domain, such as `your-team.cloudflareaccess.com`.
- `ACCESS_AUD` — the application audience tag for the Access app protecting the admin paths.

The D1 database ID is already set in `wrangler.jsonc`. Create a D1 database named `portfolio-content`. In the D1 Console, paste and run the complete [`migrations/0001_site_content.sql`](migrations/0001_site_content.sql) file. It creates the `pages`, `blocks`, and `nav_items` tables used by the console checks below, plus `site_settings` for shared brand/footer text, and seeds the existing site content. The migration uses `CREATE TABLE IF NOT EXISTS` and `INSERT OR IGNORE`, so it can be run again without replacing content that has already been edited.

The initial seed contains 3 pages (`index`, `accomplishments`, `arrangements`), 7 item blocks (2 projects and 5 accomplishments; arrangements starts empty), and 3 navigation links. `blocks.content` stores each item as JSON text and `blocks.type` identifies whether it is a project, accomplishment, or arrangement. These console checks should work as written:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';

SELECT sql FROM sqlite_master WHERE type='table';

SELECT 'pages' AS t, COUNT(*) AS n FROM pages
UNION ALL SELECT 'blocks', COUNT(*) FROM blocks
UNION ALL SELECT 'nav_items', COUNT(*) FROM nav_items;

SELECT slug, title FROM pages;

SELECT p.slug, b.position, b.type, substr(b.content, 1, 60) AS preview
FROM blocks b JOIN pages p ON p.id = b.page_id
ORDER BY p.slug, b.position;

SELECT * FROM nav_items ORDER BY position;

SELECT b.id FROM blocks b LEFT JOIN pages p ON p.id = b.page_id WHERE p.id IS NULL;

SELECT id FROM blocks WHERE content IS NULL OR trim(content) = '';
```

The final two integrity checks should return no rows.

The `DB` binding and the two Access variables are declared in `wrangler.jsonc`; do not also add dashboard-only copies. The Cloudflare Access self-hosted application should protect `admin*` and `api/admin*` on `www.liemvora.cc` with an allow policy for your email. The Worker validates the Access JWT signature, issuer, audience, and expiry before returning the editor or accepting writes. Cloudflare Access enforces the email policy. While either Access value is still a placeholder, admin routes return a clear `503` instead of skipping token verification.

The existing Cloudflare Workers Build can continue deploying from this repository with `wrangler deploy`. The asset directory is `./public`, and `run_worker_first: true` sends every request through `src/worker.js`. The Worker serves page templates imported as text from `src/templates/`, routes `GET /api/content` to D1, and accepts saves through `PUT /api/admin/content`. Requests for stylesheets, scripts, and images fall through to `env.ASSETS.fetch`. The templates, Worker code, SQL, and tests are not in the public directory; `.assetsignore` also excludes `src` and other repository files.

Also disable `workers.dev` and preview URLs, or include those hostnames in the Access protection, so the admin API cannot be reached through a hostname that bypasses the Access application.

## Editing content

Open `/admin` or `/admin.html` after signing in through Cloudflare Access. The labeled editor manages site branding, navigation, page copy, projects, accomplishments, and arrangements. Page copy is stored in `pages`, each listed item is stored in its page's ordered `blocks`, navigation is stored in `nav_items`, and shared brand/footer text is stored in `site_settings`. Save validates the document before replacing these rows in one D1 batch. The server rejects unsafe URLs, invalid fields, and oversized documents.

Changes in D1 become the source for the public pages on their next load. If the API is temporarily unavailable, the existing HTML copy remains visible and the page displays a small notice.
