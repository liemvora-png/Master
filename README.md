# Liem Vora — Personal website

A minimal, responsive website with a title-only home page, projects, accomplishments, and sheet music arrangements. Public pages remain plain HTML and CSS, with content loaded from Cloudflare D1. The HTML stays in place as an offline/static fallback.

## Pages

- `/` — home
- `/projects` — projects
- `accomplishments.html` — music, athletics, and coaching highlights
- `arrangements.html` — sheet music arrangements
- `/admin` — private visual content editor

## Cloudflare Worker setup

`wrangler.jsonc` is the deployment source of truth for the `master` Worker, static assets, D1 binding, and Access variables. It is configured with the `old-shadow-43e8.cloudflareaccess.com` team domain and the Access application audience tag for the admin routes.

The D1 database ID is already set in `wrangler.jsonc`. For a new database, create a D1 database named `portfolio-content`, then paste and run the complete [`migrations/0001_site_content.sql`](migrations/0001_site_content.sql) file in the D1 Console. It creates the `pages`, `blocks`, and `nav_items` tables used by the console checks below, plus `site_settings` for shared brand/footer text.

For an existing database created with the earlier seed, run [`migrations/0002_home_projects_empty_accomplishments.sql`](migrations/0002_home_projects_empty_accomplishments.sql) once. It adds the home page, moves the projects slug and navigation to `/projects`, replaces the navigation with the four default links, removes the seeded accomplishments so they can be managed in the editor, and updates the shared brand to `δ`.

The fresh seed contains 4 pages (`home`, `projects`, `accomplishments`, `arrangements`), 2 project blocks, no accomplishment blocks, and 4 navigation links. `blocks.content` stores each item as JSON text and `blocks.type` identifies whether the item is a project, accomplishment, or arrangement. These console checks should work as written:

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

The final two integrity checks should return no rows. After upgrading an existing database, confirm the projects slug is `projects`, accomplishments has no blocks, and `site_settings.brand` is `δ`.

The `DB` binding and the two Access variables are declared in `wrangler.jsonc`; do not also add dashboard-only copies. The Cloudflare Access self-hosted application should protect `admin*` and `api/admin*` on `www.liemvora.cc` with an allow policy for your email. Cloudflare Access provides the login flow and enforces the email policy. The Worker validates the Access JWT signature, issuer, audience, and expiry before returning the editor or accepting writes.

The existing Cloudflare Workers Build can continue deploying from this repository with `wrangler deploy`. The asset directory is `./public`, and `run_worker_first: true` sends every request through `src/worker.js`. The Worker serves page templates imported as text from `src/templates/`, routes `GET /api/content` to D1, and accepts saves through `PUT /api/admin/content`. Requests for stylesheets, scripts, and images fall through to `env.ASSETS.fetch`. The templates, Worker code, SQL, and tests are not in the public directory; `.assetsignore` also excludes `src` and other repository files.

Also disable `workers.dev` and preview URLs, or include those hostnames in the Access protection, so the admin API cannot be reached through a hostname that bypasses the Access application.

## Editing content

Open `/admin` after signing in through Cloudflare Access. The labeled editor manages site branding, navigation, the home-page title, page copy, projects, accomplishments, and arrangements. Arrangement entries can include an optional date. Page copy is stored in `pages`, each listed item is stored in its page's ordered `blocks`, navigation is stored in `nav_items`, and shared brand/footer text is stored in `site_settings`. Save validates the document before replacing these rows in one D1 batch. The server rejects unsafe URLs, invalid fields, and oversized documents.

Changes in D1 become the source for the public pages on their next load. If the API is temporarily unavailable, the existing HTML copy remains visible and the page displays a small notice.
