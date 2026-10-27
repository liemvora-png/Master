# Liem Vora — Personal website

A minimal, responsive website with projects, accomplishments, arrangements, photography, and a service-request flow. Public pages use plain HTML/CSS with browser JavaScript for live D1 content and form controls.

## Pages

- `/` — home
- `/projects` — projects
- `accomplishments.html` — music, athletics, and coaching highlights
- `arrangements.html` — sheet music arrangements
- `/services` — photography, piano lessons, and tutoring
- `/gallery` — R2-backed photography gallery
- `/admin` — private visual content editor

## Cloudflare Worker setup

`wrangler.jsonc` is the deployment source of truth for the `master` Worker, static assets, D1 binding, R2 bucket, email binding, and Clerk public configuration for the admin routes.

The D1 database ID is already set in `wrangler.jsonc`. For a new database, create a D1 database named `portfolio-content`, then paste and run the complete [`migrations/0001_site_content.sql`](migrations/0001_site_content.sql) file in the D1 Console. It creates the `pages`, `blocks`, and `nav_items` tables used by the console checks below, plus `site_settings` for shared brand/footer text.

For an existing database created with the earlier seed, run [`migrations/0002_home_projects_empty_accomplishments.sql`](migrations/0002_home_projects_empty_accomplishments.sql) once. It adds the home page, moves the projects slug and navigation to `/projects`, replaces the navigation with the four default links, removes the seeded accomplishments so they can be managed in the editor, and updates the shared brand to `δ`.

To separate the lowercase delta logo from the site name in the header, run [`migrations/0003_separate_logo_and_site_name.sql`](migrations/0003_separate_logo_and_site_name.sql) once after migration 0002. It changes the default site name from `δ` to `Liem Vora`; your custom site name is preserved if you already changed it.

Run [`migrations/0004_services_gallery_bookings.sql`](migrations/0004_services_gallery_bookings.sql) after the earlier migrations. It adds the Services and Gallery pages and navigation links, default offering records and SAT/AP subjects, photo metadata, availability windows, and private lesson bookings. It also creates a partial unique index preventing two non-cancelled bookings for the same date and time.

The fresh seed contains 6 pages, 2 project blocks, no accomplishment blocks, and 6 navigation links. `blocks.content` stores each item as JSON text and `blocks.type` identifies whether the item is a project, accomplishment, or arrangement. These console checks should work as written:

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

The final two integrity checks should return no rows. After upgrading, confirm the `services` and `gallery` rows exist, the projects slug is `projects`, accomplishments has no blocks, and the site name is `Liem Vora`.

The `DB` binding and the Clerk variables are declared in `wrangler.jsonc`; do not also add dashboard-only copies. Set `CLERK_PUBLISHABLE_KEY` to the publishable key for the selected Clerk application, `CLERK_ISSUER` to that application's JWT issuer, `CLERK_JWKS_URL` to its JWKS endpoint, and `CLERK_ADMIN_USER_ID` to the only Clerk user allowed to edit the site. The browser uses Clerk for sign-in and the Worker validates the Clerk JWT signature, issuer, expiry, and user ID before returning the editor or accepting writes. Never put a Clerk secret key in this repository.

The existing Cloudflare Workers Build can continue deploying from this repository with `wrangler deploy`. The asset directory is `./public`, and `run_worker_first: true` sends every request through `src/worker.js`. The Worker serves templates imported from `src/templates/`, uses D1 for content and bookings, stores gallery objects in the configured R2 bucket, and sends booking notices through the Email Service binding. The templates, Worker code, SQL, and tests are not in the public directory; `.assetsignore` also excludes `src` and other repository files.

Create an R2 bucket named `portfolio-gallery` to match the `GALLERY` binding in `wrangler.jsonc`.

For booking email, configure Cloudflare Email Service (outbound sending) in addition to any Email Routing you use for inbound mail. Onboard/verify a sender domain with Email Service, and verify the Gmail destination address as an allowed recipient. Add Worker secrets named `BOOKING_EMAIL_TO` (your verified Gmail destination) and `BOOKING_EMAIL_FROM` (an address on the verified sending domain). The destination and sender are not included in the repository, and the Gmail address is never displayed publicly. Without these values, the Worker still saves the request as pending but reports that email notification is not configured.

Keep the admin routes protected by Clerk regardless of the hostname used to reach the Worker. The API does not trust browser cookies or the visibility of the admin page; every admin request must include a valid Clerk bearer token.

## Editing content

Open `/admin` and sign in with the configured Clerk admin user. The labeled editor manages site branding, navigation, page copy, projects, accomplishments, arrangements, services, tutoring subjects, lesson availability, gallery photos, and booking requests. Arrangement entries can include an optional date. Lesson availability is entered as weekly windows or date-specific overrides; each appointment reserves one 60-minute slot. Requests remain pending until manually confirmed. Optional service prices are shown only when set. Gallery uploads support JPEG, PNG, WebP, and GIF up to 8 MB, and require alt text.

For Clerk application-domain redirects, use `https://www.liemvora.cc/admin` for sign-in and sign-up, and `https://www.liemvora.cc/` after sign-out. Keep sign-up restricted to the intended admin account.

Page copy is stored in `pages`, listed content in ordered `blocks`, navigation in `nav_items`, and shared brand/footer text in `site_settings`. The service manager edits `services`, `test_prep_options`, `availability`, `photo_gallery`, and private `lesson_bookings`. Booking request data is never returned by public APIs.

Changes in D1 become the source for the public pages on their next load. If the API is temporarily unavailable, the existing HTML copy remains visible and the page displays a small notice.
