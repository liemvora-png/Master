# Liem Vora — Personal website

A minimal, responsive website for projects, accomplishments, and sheet music arrangements. Public pages remain plain HTML and CSS, with content loaded from Cloudflare D1. The original HTML content stays in place as an offline/static fallback.

## Pages

- `index.html` — projects
- `accomplishments.html` — music, athletics, and coaching highlights
- `arrangements.html` — sheet music arrangements
- `admin.html` — private JSON content editor

## Cloudflare Worker setup

`wrangler.jsonc` is the deployment source of truth for the `liemvora.cc` Worker, static assets, D1 binding, and Access variables. Before merging or deploying, replace all three `REPLACE_...` placeholders in that file:

- `d1_databases[0].database_id` — the UUID shown on the D1 database overview.
- `ACCESS_TEAM_DOMAIN` — your Zero Trust team domain, such as `your-team.cloudflareaccess.com`.
- `ACCESS_AUD` — the application audience tag for the Access app protecting the admin paths.

Create a D1 database named `portfolio-content`. In the D1 Console, paste and run the complete [`migrations/0001_site_content.sql`](migrations/0001_site_content.sql) file. It creates the `site_content` table **and** inserts the existing site content as its initial seed. This is safe to run again: it creates the table if needed and only inserts the seed if the `site` record does not already exist.

The `DB` binding and the two Access variables are declared in `wrangler.jsonc`; do not also add dashboard-only copies. The Cloudflare Access self-hosted application should protect `admin*` and `api/admin*` on `www.liemvora.cc` with an allow policy for your email. The Worker validates the Access JWT signature, issuer, audience, and expiry. Cloudflare Access enforces the email policy. While either Access value is still a placeholder, admin API writes return a clear `503` instead of skipping token verification.

The existing Cloudflare Workers Build can continue deploying from this repository with `wrangler deploy`. The Worker serves public site files as static assets, routes `GET /api/content` to D1, and accepts saves through `PUT /api/admin/content`. `.assetsignore` keeps source code, SQL, tests, and deployment configuration out of the public asset bundle.

Also disable `workers.dev` and preview URLs, or include those hostnames in the Access protection, so the admin API cannot be reached through a hostname that bypasses the Access application.

## Editing content

Open `/admin.html` after signing in through Cloudflare Access. The labeled editor manages site branding, navigation, page copy, projects, accomplishments, and arrangements; the server stores them as one JSON document. Save validates the content before updating the D1 record. The server rejects unsafe URLs, invalid fields, and oversized documents.

Changes in D1 become the source for the public pages on their next load. If the API is temporarily unavailable, the existing HTML copy remains visible and the page displays a small notice.
