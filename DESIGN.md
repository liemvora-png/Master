---
name: Master-Portfolio
world: "season-programme"
description: One working practice printed as a season programme — the site's own paper and ink, with identity carried by structure and type rather than a private palette.
colors:
  paper: "#f4f1e9"
  paper-deep: "#e7ddcd"
  raised-paper: "#fffdf8"
  ink: "#242820"
  muted: "#5f6257"
  olive: "#58604b"
  hairline: "rgba(94, 74, 54, 0.22)"
  binding-brown: "#8a5a3c"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.2rem, 10vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(1.7rem, 3.5vw, 2.35rem)"
    fontWeight: 700
    letterSpacing: "0.08em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.02em"
  body:
    fontFamily: "Work Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.02rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 400
    letterSpacing: "0.16em"
rounded:
  sharp: "0px"
  micro: "2px"
spacing:
  gutter: "7.5%"
  section-rhythm: "clamp(2.6rem, 7vh, 4.2rem)"
  entry-row: "1.2rem"
  notice-row: "1.1rem"
components:
  stamp-issued:
    backgroundColor: "{colors.raised-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sharp}"
    padding: "0.7rem 0.9rem"
  button-fold:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sharp}"
    padding: "0.55rem 0.9rem"
  button-fold-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-invert:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.sharp}"
    padding: "0.85rem 1.4rem"
  button-invert-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.olive}"
  button-chrome:
    backgroundColor: "transparent"
    textColor: "{colors.olive}"
    rounded: "{rounded.micro}"
    padding: "0.55rem 0.8rem"
    height: "40px"
  button-chrome-hover:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.olive}"
  entry-link:
    textColor: "{colors.ink}"
  entry-link-hover:
    textColor: "{colors.olive}"
  band-boxoffice:
    backgroundColor: "{colors.olive}"
    textColor: "{colors.paper}"
---

# Design System: Master-Portfolio

## Overview

**Creative North Star: "The Season Programme"**

The home page is the programme document of one working practice — the printed booklet itself, not a poster about it. Everything on the surface speaks that world's native material: rules and folios, a numbered running order of works, dated notices, a rubber-stamped issue line, a full-bleed box-office band with hatch texture. The paper is the site's own warm cream, the ink is the site's own near-black, and the one accent — box-office olive, pale sage on the night press — carries every mark that matters. Home wears the same palette as every other page on the site; the world answers that borrowing with structure, not colour. The visitor reads identity first (the name set as the season title), then proof of liveness (a real "Programme issued" timestamp fed by the content API), then the running order, then the notices, then the booking window. Nothing is centered-trio hero furniture; nothing is a row of equal cards.

Depth is letterpress, never lighting: rules from 1px hairlines to a 4px masthead underline, a double olive border+outline on the issued stamp, a diagonal hatch band, and one small shadow under the stamp. There are no gradients, no glass, no rounded surfaces. Motion is the programme unfolding as you scroll — dated rows rise into place, one named control ("At a glance" / "Full programme") opens or closes the running order — and all content is visible by default without JS or under reduced motion.

The system now ships across the **entire site**, per the owner's instruction to make the whole website uniform — same font, same colours, across all pages. `public/styles.css` itself carries the world's voice: `@font-face` blocks for Barlow Condensed (400/700) and Work Sans (400/700), self-hosted from `public/assets/fonts`, with no Google Fonts links left on any page; `:root` binds `--sans` and `--mono` to Work Sans and `--serif` to Barlow Condensed and declares the four-step ladder for every page; the global `body` sets the olive caret and the olive-on-pressed-paper scrollbar, and a global `::selection` paints olive ground with paper text, in both presses. Shared headings are restyled to the programme voice — h1/h2 in Barlow Condensed 700, uppercase; h1 at `--t-name` with 0.01em tracking — and no negative letter-spacing remains anywhere in the shipped CSS. The legacy Playfair Display / DM Sans / DM Mono binding is gone repo-wide. `public/assets/home.css` is home-scoped **structure only**: its `@font-face` and token-remap blocks moved up to `styles.css`. What stays home-scoped is furniture — masthead, running order, notices, stamp, band. Every other page (projects, gallery, services, arrangements, accomplishments, the news digest, admin) now speaks the same faces, ladder, palette, caret, and selection without loading anything extra.

**Key Characteristics:**
- Site-wide cream paper, near-black ink, one olive accent at folio scale plus (at most) one full-bleed olive band — the world never repaints them.
- Fixed typographic scale ladder — folio, body, entry, name — with all display type set uppercase in condensed Barlow.
- Letterpress structure: rules, double borders, hatch texture, one stamp shadow; zero gradients, zero glass, zero rounded surfaces.
- Live data as identity furniture: the issued stamp and dated notices render real timestamps; the world never fabricates a date.
- Two presses of one ink: every light token has a dark mirror; switching theme is switching print run, not switching design.

## Colors

The palette is one set, worn identically on every page: warm cream paper with one deeper step, one near-black ink, one margin grey, brown-tinted hairlines, and a single muted-green accent that came down from the main-branch binding.

### Primary
- **Box-Office Olive** (#58604b, night-press mirror #a9b891): the world's only voice of emphasis. It sets the folio numerals (01–04), the season line, the δ marks, the issued stamp's border and folio line, entry hover states, notice source links, the masthead works anchor, the content-status border, the caret, text selection, and the scrollbar thumb — and it fills the one box-office band, where the text is always full paper (verified ≥4.5:1 in both presses).

### Neutral
- **Programme Paper** (#f4f1e9, night press #171717): the page ground; also the text colour on the olive band and on olive fills.
- **Pressed Paper** (#e7ddcd, night press #232322): the scrollbar track and the shared chrome's hover fill.
- **Fresh Sheet** (#fffdf8, night press #1d1d1c): the one raised surface — the issued stamp's paper.
- **Press Ink** (#242820, night press #e6e5e1): body text, the 4px masthead rule, entry names, notice titles, the fold control's hover fill.
- **Margin Grey** (#5f6257, night press #94938f): secondary text — entry gloss lines, notice dates, the masthead note, nav links, the theme-toggle glyph.
- **Binding Brown** (#8a5a3c, night press #b3a691): hairline furniture — the fold control's border.
- **Hairline Rule** (rgba(94,74,54,0.22), night press rgba(255,255,255,0.14)): entry-row rules, link underlines, and the shared chrome's control borders.

Every value above arrives from `public/styles.css`, which this world reads and never redefines. That sheet also carries `--danger`, `--danger-line`, `--danger-soft`, `--hover`, `--on-accent` and `--brown-deep` for admin and form furniture; the shipped home surface uses none of them, so they are not part of this system's token set and must not be pulled into programme surfaces.

The dark theme is the shared sheet flipping the press (`:root[data-theme="dark"]` plus the `prefers-color-scheme: dark` fallback); no world stylesheet writes a dark block of its own. `meta theme-color` follows the site default — #f4f1e9 light, #171717 dark — applied by `site.js`'s `THEME_COLORS`; the home template ships no override. Text selection is olive ground with paper text, and the scrollbar is an olive thumb on pressed paper, in both presses.

### Named Rules
**The Shared-Palette Rule (owner decision).** The whole site wears one colour set and no page introduces another. First the owner asked home to keep the site's colours; then they asked for the entire website to be uniform — same fonts, same colours, across all pages — and the build complies literally: no page-scoped CSS declares a colour token of its own or paints a surface with a literal, and home.css's single literal is the stamp's near-black shadow wash, which reads on both presses. The palette is common ground; the Season Programme's identity is carried entirely by structure, rules, folios, hatch, and the condensed type ladder — now typeset identically on every page. A new surface that wants a colour it doesn't already have gets none: it reaches for `--paper`, `--paper-deep`, `--surface`, `--ink`, `--muted`, `--olive`, `--line` or `--brown`.
**The No-Second-Accent Rule.** Olive is the only voice of emphasis — no additional accent, no gradient to fake one. At rest it appears only as folio-scale marks; exactly one full-bleed band per page may invert it into a surface. Its rarity is still the point: when the band or an olive mark appears on a new surface, it must mean something (a folio, a live mark, a booking action).
**The Two Presses Rule.** Light and dark are one system printed twice, and the shared sheet owns both plates: every token has its mirror set beside it, in the same block. World CSS never branches on theme, never writes its own dark block, and never hardcodes one press — consuming the token is what makes the flip free.

## Typography

**Display Font:** Barlow Condensed, 400 + 700, self-hosted woff2 (fallback: Arial Narrow, sans-serif)
**Body Font:** Work Sans, self-hosted variable woff2 declared via `@font-face` at 400 and 700 (fallback: Helvetica Neue, Arial, sans-serif)
**Label/Mono Font:** none distinct — `--mono` is bound to Work Sans on `:root`; DM Mono no longer exists anywhere on the site.

**Character:** A condensed newsstand grotesque set tall and loud against a calm text grotesque. The display voice is always uppercase with generous tracking on small settings (0.12–0.2em on folios and furniture); the body voice never shouts. Numerals and date strings sit in the display face in sentence case, never tracked into a label.

Implementation note (binding debt, now the whole site's convention rather than a rule): the shared stylesheet's variable names persist — `styles.css` `:root` itself carries `--serif` as Barlow Condensed and `--mono` as Work Sans, keeping the legacy names for chrome compatibility. Do not propagate the misleading names into new selectors' mental model: this site has a condensed grotesque and a text grotesque, no serif, and no mono — DM Mono is gone from every page.

The ladder tokens are exactly four steps — `--t-folio` 0.72rem, `--t-body` 1.02rem, `--t-entry` 1.6rem, `--t-name` clamp(3.2rem, 10vw, 6rem) — declared on `:root` in `public/styles.css`, so every page gets them. Supporting furniture uses single-step variants around them (masthead season line clamp(1rem, 2.4vw, 1.5rem); shared `.section-heading h2` clamp(1.7rem, 3.5vw, 2.35rem) ls 0.08em, which home overrides to clamp(1.5rem, 3.4vw, 2.1rem) ls 0.04em; `.project-name` clamp(1.65rem, 3.2vw, 2.2rem) ls 0.04em; admin group h3s 1.4–1.45rem 700 ls 0.04em; overture copy clamp(1.05rem, 1.9vw, 1.2rem); notice titles 1.1rem Work Sans 500; news times 0.85rem; folios 0.95rem 700). The news digest tunes its furniture to the ladder: h1 clamp(2rem, 5vw, 2.8rem) ls 0.01em, h2 1.35rem ls 0.08em, h3 700 ls 0.02em, and the updated/time lines sit at the 0.85rem folio-time variant with 0.12em tracking, matching the home notice rows.

### Hierarchy
- **Display / name** (700, --t-name, lh 0.95, ls 0.01em, uppercase): every page's h1 via `styles.css`; home's masthead-name tightens lh to 0.92. One per page.
- **Secondary display / season line** (400, clamp(1rem,2.4vw,1.5rem), ls 0.2em, uppercase, box-office olive): rides beneath the name as one block.
- **Headline** (700, clamp(1.7rem,3.5vw,2.35rem), ls 0.08em, uppercase): section titles via `.section-heading h2`, site-wide; home overrides its h2s to clamp(1.5rem,3.4vw,2.1rem) ls 0.04em — Overture, The Season's Works, Notices, Box Office.
- **Title / entry** (700, --t-entry 1.6rem, lh 1.05, ls 0.02em, uppercase): running-order work names; underlined with a hairline that thickens on hover.
- **Body** (400, --t-body 1.02rem, lh 1.7): notes and copy, capped 46–62ch. Overture reads one step larger (lh 1.75).
- **Label / folio** (400, --t-folio 0.72rem, ls 0.16em, uppercase): stamps, the fold control, fallback status line; folio numerals and times use 0.85–0.95rem at ls 0.12em.

### Named Rules
**The Fixed Ladder Rule.** Hierarchy comes from the four-step ladder (folio, body, entry, name) before any invented size. One-off variants exist only as documented furniture steps; a new surface reaches for the ladder first.
**The Set-Caps Rule.** Programme words in the display face are uppercase and tracked; only the δ glyph and real date strings break caps. Never set body prose in Barlow.
**The Self-Hosted Faces Rule.** Barlow Condensed (400/700) and Work Sans (400/700) ship as woff2 files under `public/assets/fonts`, declared once in `@font-face` at the top of `styles.css` for every page. No page links an external font service and no page gets a private face. The one vestigial Google Fonts link inside `admin.js`'s preview iframe binds to nothing — delete it, don't imitate it.

## Layout

The page is a single programme column: `main` is min(100% − 15%, 1000px), header and footer sit on a 7.5% inline gutter, and sections breathe with clamp(2.6rem, 7vh, 4.2rem) block padding. The masthead is a two-column grid (name stack | right-edge furniture) closed by a 4px ink rule; below the rule, masthead furniture (works anchor, latest notice) spans both columns.

Running-order rows are a three-column grid: 3.4rem folio column, elastic name/gloss column, auto arrow column, aligned on baseline with 1.2rem block padding and a hairline between rows. Notice rows are one column of date/title/source at 1.1rem block padding. Copy blocks cap at 46ch (masthead note), 62ch (overture), 52ch (box-office copy).

Responsive: at ≤860px the masthead side furniture drops below the name as a row and news dates go full-width; at ≤560px the folio column narrows to 2.4rem and entry arrows disappear (the arrow is decoration at small size; the underline already says "link"). Shared chrome (styles.css) restructures the header at ≤700px and again at ≤420px. Floor width is 320px. The box-office band bleeds from the column to full viewport width with exactly margin-inline: −7.5% / padding-inline: 7.5%.

**The Bleed Rule.** Full-bleed elements reach the viewport edge only via the −7.5% counter-offset of the column gutter, so the band's content realigns with the page column.

## Elevation & Depth

This system does not use an elevation ladder. Depth is letterpress: the page is flat paper, and anything that "sits on it" is announced by printed structure — a 1px hairline rule, a 2px border plus a 1px outline offset 3px (the stamp's double border), a 4px structural rule under the masthead, or a 45° hatch band clipped to 10px at the band's top edge. There is exactly one drop shadow in the shipped world, and it is tiny and singular. No gradients, no backdrop-filter, no glass, anywhere in the home stylesheet.

### Shadow Vocabulary
- **Stamp lift** (`box-shadow: 0 8px 18px -12px rgba(29,31,27,0.5)`): only under the issued stamp, to hold it off the paper as if rubber-stamped. It is the world's one colour literal — an unlit near-black wash, kept because it reads on both presses. Not reused elsewhere, and deliberately not theme-mirrored.

### Named Rules
**The Pressed, Not Lit Rule.** Convey depth with rules, double borders, hatch texture, and the one stamp lift — never with shadows-as-lighting, gradients, or blur. If a new surface needs to feel raised, give it the stamp's paper (#fffdf8 / #1d1d1c) and a border, not a shadow.

## Shapes

The form language is letterpress-rectangular: corners are square everywhere in the world (0px; the status dot is explicitly radius 0). Borders are the shape language — 1px hairlines, 2px control borders, 4px structural rules, and the stamp's border+outline double. Clipping is used once: the box-office band clips a hatch SVG to a 10px strip. The only non-rectangle geometry in the world is the hatch's 45° lines, the stamp's −1.6° rotation, and typographic furniture (δ, ↗, ↓, ·) set in the same faces as text. Shared chrome keeps a 2px micro-radius on the theme-toggle and admin buttons — inherited, at the edge of invisibility; new world surfaces use sharp corners.

## Components

### Buttons
- **Shape:** square (0px) for world controls; micro 2px only on inherited chrome controls.
- **Fold control (At a glance / Full programme):** transparent on paper, 1px binding-brown border (#8a5a3c / #b3a691), folio label type (0.72rem, ls 0.16em, uppercase), padding 0.55rem 0.9rem. Hover inverts to ink fill with paper text (border included); one named control, both states named aloud via aria.
- **Invert CTA (Services & booking):** sits on the olive band; 2px paper border, paper text, Barlow 700 1rem ls 0.16em, padding 0.85rem 1.4rem. Hover fills paper, text turns olive.
- **Chrome controls (theme toggle, admin entry):** inherited unchanged from shared chrome — 40px min-height, 1px hairline border, the admin entry set in olive and the toggle glyph in margin grey; hover border goes olive on a Pressed Paper fill; focus is a 2px olive outline, offset 3px.
- All state transitions are 160ms ease-out on colour properties only.

### Navigation
Shared chrome (styles.css) on the home page: centred flex row, Work Sans 0.76rem in Margin Grey; hover and current-page go olive, current page underlined with a hairline at 0.35rem offset. Header 82px min-height with a 1px rule below. The wordmark δ and nav labels pick up the world through the `:root` type bindings and the shared tokens, not page CSS — on every page now.

### Stamp / "Programme issued" (signature)
Fresh-sheet block, 2px olive border plus 1px olive outline at 3px offset (double ticket border), folio label line with a square status dot, the real timestamp in ink at 0.95rem ls 0.08em, rotated −1.6° and carrying the system's only shadow. Rotation is removed under reduced motion. It is an identity element: it always renders live content, never a decorative date.

### Programme entry (signature)
The running-order row: olive folio numeral (01–04), uppercase entry name at --t-entry underlined in hairline, a gloss line in Margin Grey, an olive ↗ arrow. Hover turns the name olive and thickens its underline to 2px. The fold ("At a glance") collapses each gloss to zero height via a grid-rows transition — the row never jumps, the name always stays.

### Notices (dated rows)
Date line in Barlow 0.85rem ls 0.12em uppercase margin grey, title in Work Sans 500 1.1rem ink, source link in olive. Masthead's latest-notice line mirrors this: olive "Latest notice" folio, short date, headline link — fed by the news API, hidden when there is nothing real to show.

### Box-office band (signature)
Full-bleed olive section, paper-coloured heading and copy (copy is full `--paper`, never softened — contrast ≥4.5:1 on both presses), the invert CTA, and the 10px hatch strip along its top edge in translucent paper lines: the SVG is painted with `color: var(--paper)` at 0.5 opacity, so the light press hatches cream on deep olive and the night press hatches near-black on sage — one declaration, no theme branch. Exactly one per page.

### Reveal motion (world-wide behaviour)
Rows rise translateY(1.15rem) → none over 550ms cubic-bezier(0.22,0.61,0.36,1), staggered 80ms per item (max 5). Elements are visible by default: motion classes attach only when JS runs and reduced-motion is off; transform is the only animated property. Never fade or hide content that carries information.

### Inputs / Fields
Type here is now uniform with the rest of the site — fields read sub-1rem Work Sans and admin group h3s are Barlow Condensed 700 uppercase ls 0.04em, like every other heading — but the furniture itself is still not letterpress-styled: 2px micro-radius, hairline `--line` strokes, 40px min-height inputs. That chrome is the remaining adoption boundary. New world-side inputs should follow the letterpress language: sharp corners, 1px binding-brown stroke, raised-paper fill, olive focus ring.

## Do's and Don'ts

### Do:
- **Do** let `styles.css` do the adoption: `:root` already carries the faces, the four-step ladder, the olive caret and scrollbar, and the global selection on every page, so a new page's own stylesheet adds structure only, exactly as `home.css` does. Any new face gets self-hosted from `public/assets/fonts`.
- **Do** paint every world surface with the shared tokens — `var(--paper)`, `var(--paper-deep)`, `var(--surface)`, `var(--ink)`, `var(--muted)`, `var(--olive)`, `var(--line)`, `var(--brown)` — so the press flips itself; `public/styles.css` is the shared source of truth, and page CSS consumes its tokens, never re-mirrors them.
- **Do** set display type uppercase Barlow Condensed from the fixed ladder; track small settings (0.12–0.2em) and leave large settings near 0.
- **Do** render the issued stamp, notice dates, and nav labels from the live APIs; hide furniture that has no real data.
- **Do** use the stamp lift only on the stamp; use borders, hairlines, and hatch for everything else.
- **Do** keep reveal transforms and 160ms colour state swaps; ship content visible without JS.
- **Do** put copy blocks at 46–62ch.

### Don't:
- **Don't** re-split the site's typography: no page-scoped font remap, no external webfont link, no Playfair Display / DM Sans / DM Mono revival — those bindings are gone repo-wide and the world's faces already sit on `:root` for every page. The vestigial Google Fonts link in `admin.js`'s preview iframe is drift to delete, not a precedent.
- **Don't** set negative letter-spacing on display type: every shipped tracking value is non-negative, from 0.01em at name scale up to 0.16–0.2em on small caps.
- **Don't** give the home world a private colour or a colour literal on a surface: the shipped stylesheet proves the world needs none, and the owner's decision is binding. The admin/form reds in `styles.css` (`--danger` and friends) stay in admin and forms.
- **Don't** add a second accent, a gradient, or a glass/blur surface; this world is paper, ink, rules, and one olive.
- **Don't** invent kickers, eyebrows, boxed glyph icons, or hard offset shadows; the only glyph furniture is text itself (δ, ↗, ↓) set in the system's own faces.
- **Don't** fabricate dates, issue stamps, or programme data — the stamp's credibility is the whole world's credibility.
- **Don't** round world surfaces: 0px corners on new components; the 2px chrome micro-radius is inherited legacy, not invitation.
- **Don't** soften box-office copy below full `var(--paper)` on the olive band; that was a shipped fix, keep it.
- **Don't** write a theme branch or a dark block in world CSS; the shared sheet already mirrors every token.
- **Don't** animate opacity of informative content; reveal is transform-only.
