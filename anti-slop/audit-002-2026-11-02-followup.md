# Audit 002 follow-up: news page contrast fix (2026-11-02)

AFTER-mode resolution of `audit-002-2026-11-02.md`. All 5 findings fixed, deployed, and verified.

## Landing the change (git state)

The checkout was mid a no-op rebase of `main`. Per user approval:

1. `git rebase --abort` restored `main` to `fabe057` (which carries the audit-001 fixes; they were never on `origin/main`).
2. `git merge origin/main` brought in the 13 news-digest commits without discarding them. One conflict in `src/templates/services.html`: kept origin/main's new description (viola lessons) plus the audit-001 colon title (`Liem Vora: Services`).
3. Fix commit `2bdb745`, pushed to `origin/main` (`d713f51..2bdb745`).

## Fixes applied

| Finding | Rule | Fix |
|---|---|---|
| 1. Body text 1.08:1 on dark | R-25 | Inline palette replaced with site tokens: `var(--ink)` body, `var(--muted)` timestamps/updated line, `var(--line)` h2 border, `var(--olive)` links, `var(--sans)` font. No hardcoded hexes remain in the inline style. |
| 2. Links 2.68:1, timestamps 2.78:1 on dark | R-25 | Same token swap; links now `var(--olive)` with underline + 2px offset for affordance. |
| 3. Stored theme ignored | R-34 | Pre-paint script in `<head>` reads `localStorage "theme"` and sets `data-theme` on `<html>` before `/styles.css` applies, matching the other templates. |
| 4. Ignores design system | R-29 | Page now consumes the shared design tokens from `/styles.css`. |
| 5. Em dashes in digest copy | R-02 | 11 em dashes removed from `public/news/index.html` (commas/colons/periods); 13 timestamp separators `**HH:MM —**` changed to `**HH:MM:**` in `news/2026-11-01.md`. En dashes in numeric ranges (45–46%, 58–98%) kept. |

## Regression guard

The "Hourly tech news digest" automation (`56141f4a-391f-4f86-8243-bb54fc9adfe6`) prompt updated with:

- STYLE RULES: inline CSS must color only with `var(--ink/--muted/--line/--olive/--sans)`; never hardcode hexes; keep the theme bootstrap script and the `/styles.css` link; do not restyle on routine updates.
- WRITING RULE: no em dash character in headlines or summaries; en dashes in ranges allowed.

## Verification (delivery gate)

- `node --test tests/*.test.mjs`: 33/3 pass, including the news suite ("news rows are styled with the shared theme tokens").
- Local `wrangler dev` + browser canvas, computed WCAG contrast:
  - Dark (system default): body 14.15:1, updated/time 6.22:1, links 8.47:1.
  - Light (stored theme honored via bootstrap): body 13.30:1, updated 5.52:1, links 5.83:1.
- `npx wrangler deploy` (version `8e9b6100-1837-4813-b023-b4e76e21f4e1`); live `https://liemvora.cc/news/` returns 200 with tokens + bootstrap, 0 hardcoded hexes in the inline style, 0 em dashes; screenshot confirms readable rendering.

## Hook note

Impeccable flagged `single-font` on the inline `font-family` line: false positive. The page loads `/styles.css`, which styles `h1, h2` with `var(--serif)` (Playfair Display), so hierarchy comes from the shared stylesheet; the inline block only sets the body font.

## Still pending (pre-existing, unrelated)

- D1 migrations `0005_meta_title_dashes.sql` and `0005_remove_tutoring_add_viola.sql` are in the repo but were not applied to the remote D1 in this session.
