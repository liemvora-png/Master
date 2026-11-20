---
name: Master-Portfolio
world: "season-programme"
description: One working practice printed as a season programme — bone paper, printer ink, and exactly one ticket red.
colors:
  bone-paper: "#eae7de"
  bone-deep: "#e0dcd0"
  raised-paper: "#f1eee5"
  printer-ink: "#1d1f1b"
  folio-grey: "#5c574c"
  furniture-brown: "#6f6a5e"
  rule-ink: "rgba(29, 31, 27, 0.22)"
  rule-brown: "rgba(111, 106, 94, 0.35)"
  ticket-red: "#c22a1f"
  red-rule: "rgba(194, 42, 31, 0.35)"
  red-wash: "rgba(194, 42, 31, 0.07)"
  night-paper: "#191b16"
  night-raised: "#1f221b"
  night-ink: "#e8e5da"
  night-folio: "#a49e8f"
  night-red: "#e0563f"
  night-rule: "rgba(232, 229, 218, 0.2)"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.2rem, 10vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(1.5rem, 3.4vw, 2.1rem)"
    fontWeight: 700
    letterSpacing: "0.04em"
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
    textColor: "{colors.printer-ink}"
    rounded: "{rounded.sharp}"
    padding: "0.7rem 0.9rem"
  button-fold:
    backgroundColor: "transparent"
    textColor: "{colors.printer-ink}"
    rounded: "{rounded.sharp}"
    padding: "0.55rem 0.9rem"
  button-fold-hover:
    backgroundColor: "{colors.printer-ink}"
    textColor: "{colors.bone-paper}"
  button-invert:
    backgroundColor: "transparent"
    textColor: "{colors.bone-paper}"
    rounded: "{rounded.sharp}"
    padding: "0.85rem 1.4rem"
  button-invert-hover:
    backgroundColor: "{colors.bone-paper}"
    textColor: "{colors.ticket-red}"
  button-chrome:
    backgroundColor: "transparent"
    textColor: "{colors.printer-ink}"
    rounded: "{rounded.micro}"
    padding: "0.55rem 0.8rem"
    height: "40px"
  button-chrome-hover:
    backgroundColor: "{colors.bone-deep}"
    textColor: "{colors.ticket-red}"
  entry-link:
    textColor: "{colors.printer-ink}"
  entry-link-hover:
    textColor: "{colors.ticket-red}"
  band-boxoffice:
    backgroundColor: "{colors.ticket-red}"
    textColor: "{colors.bone-paper}"
---

# Design System: Master-Portfolio

## Overview

**Creative North Star: "The Season Programme"**

The home page is the programme document of one working practice — the printed booklet itself, not a poster about it. Everything on the surface speaks that world's native material: rules and folios, a numbered running order of works, dated notices, a rubber-stamped issue line, a full-bleed box-office band with hatch texture. The paper is cool bone, the ink is near-black printer ink, and exactly one saturated colour — ticket red — carries every mark that matters. The visitor reads identity first (the name set as the season title), then proof of liveness (a real "Programme issued" timestamp fed by the content API), then the running order, then the notices, then the booking window. Nothing is centered-trio hero furniture; nothing is a row of equal cards.

Depth is letterpress, never lighting: rules from 1px hairlines to a 4px masthead underline, a double red border+outline on the issued stamp, a diagonal hatch band, and one small shadow under the stamp. There are no gradients, no glass, no rounded surfaces. Motion is the programme unfolding as you scroll — dated rows rise into place, one named control ("At a glance" / "Full programme") opens or closes the running order — and all content is visible by default without JS or under reduced motion.

The system currently ships on the **home page only**. Home remaps the shared stylesheet's token names (paper, ink, olive, line, serif…) in a `body[data-page="home"]` block, so shared chrome (header, nav, footer) inherits the new world on that page. The other pages — projects, gallery, services, arrangements, accomplishments, admin — still render the previous cream+Playfair binding until adopted. This document describes the Season Programme world as the project's design system with that adoption boundary stated; it does not describe the legacy pages, and the legacy palette is not part of this world.

**Key Characteristics:**
- Bone paper ground, printer-ink text, one ticket-red accent at folio scale plus (at most) one full-bleed red band.
- Fixed typographic scale ladder — folio, body, entry, name — with all display type set uppercase in condensed Barlow.
- Letterpress structure: rules, double borders, hatch texture, one stamp shadow; zero gradients, zero glass, zero rounded surfaces.
- Live data as identity furniture: the issued stamp and dated notices render real timestamps; the world never fabricates a date.
- Two presses of one ink: every light token has a dark mirror; switching theme is switching print run, not switching design.

## Colors

The palette is print-shop: one paper with two deeper steps, one ink with two grey furniture steps, hairline rules, and a single saturated ticket red inherited from poster-print and ticket stock.

### Primary
- **Ticket Red** (#c22a1f / dark mirror #e0563f): the only saturated hue in the world. It sets folio numerals (01–04), the season line, the δ marks, the issued-stamp border and stamp folio, entry hover states, notice source links, the scrollbar thumb, text selection, and the caret. It also fills the one box-office band, where text is always full bone paper (verified ≥4.5:1).

### Neutral
- **Bone Paper** (#eae7de): the page ground; text colour on red band and red buttons.
- **Pressed Bone** (#e0dcd0): hover fill on chrome controls; scrollbar track.
- **Raised Paper** (#f1eee5): the one raised surface — the issued stamp's paper.
- **Printer Ink** (#1d1f1b): body text, masthead rule (4px), fold-control hover fill.
- **Folio Grey** (#5c574c): secondary text — gloss lines, notice dates, nav links, masthead note.
- **Furniture Brown** (#6f6a5e): hairline furniture — the fold control's border.
- **Hairline Ink** (rgba(29,31,27,0.22)) and **Hairline Brown** (rgba(111,106,94,0.35)): entry-row rules, underline colours. **Red Hairline** (rgba(194,42,31,0.35)) and **Red Wash** (rgba(194,42,31,0.07)) are the red's rule and tint steps for state and validation furniture.

The dark theme is the same world pressed on night paper (#191b16 ground, #1f221b raised, #e8e5da ink, #a49e8f folio, #e0563f red, rgba(232,229,218,0.2) rules; full mirror in the sidecar). `meta theme-color` tracks the press: #eae7de light, #191b16 dark.

### Named Rules
**The Ticket Red Rule.** Ticket red is the system's only voice of emphasis — no second accent, no gradient to fake a second one. At rest it appears only as folio-scale marks; exactly one full-bleed band per page may invert it into a surface. Its rarity is the point: when red appears on a new surface, it must mean something (a folio, a live mark, a booking action).
**The Two Presses Rule.** Light and dark are one system printed twice: every token has a mirror value, set together in the same scoped block. Never hardcode one press.

## Typography

**Display Font:** Barlow Condensed, 400 + 700, self-hosted woff2 (fallback: Arial Narrow, sans-serif)
**Body Font:** Work Sans variable, 400/500/700, self-hosted woff2 (fallback: Helvetica Neue, Arial, sans-serif)
**Label/Mono Font:** none distinct — Work Sans stands in for the legacy mono binding.

**Character:** A condensed newsstand grotesque set tall and loud against a calm text grotesque. The display voice is always uppercase with generous tracking on small settings (0.12–0.2em on folios and furniture); the body voice never shouts. Numerals and date strings sit in the display face in sentence case, never tracked into a label.

Implementation note (binding debt, not a rule): the shared stylesheet's variable names persist — `--serif` now carries Barlow Condensed and `--mono` carries Work Sans, because the remap keeps legacy names for chrome compatibility. Do not propagate the misleading names into new selectors' mental model: this world has a condensed grotesque and a text grotesque, no serif, no mono.

The ladder tokens are exactly four steps: `--t-folio` 0.72rem, `--t-body` 1.02rem, `--t-entry` 1.6rem, `--t-name` clamp(3.2rem, 10vw, 6rem). Supporting furniture uses single-step variants around them (masthead season line clamp(1rem, 2.4vw, 1.5rem); section headings clamp(1.5rem, 3.4vw, 2.1rem); overture copy clamp(1.05rem, 1.9vw, 1.2rem); notice titles 1.1rem Work Sans 500; news times 0.85rem; folios 0.95rem 700).

### Hierarchy
- **Display / name** (700, --t-name, lh 0.92, ls 0.01em, uppercase): the masthead season title only. One per page.
- **Secondary display / season line** (400, clamp(1rem,2.4vw,1.5rem), ls 0.2em, uppercase, ticket red): rides beneath the name as one block.
- **Headline** (700, clamp(1.5rem,3.4vw,2.1rem), ls 0.04em, uppercase): section titles — Overture, The Season's Works, Notices, Box Office.
- **Title / entry** (700, --t-entry 1.6rem, lh 1.05, ls 0.02em, uppercase): running-order work names; underlined with a hairline that thickens on hover.
- **Body** (400, --t-body 1.02rem, lh 1.7): notes and copy, capped 46–62ch. Overture reads one step larger (lh 1.75).
- **Label / folio** (400, --t-folio 0.72rem, ls 0.16em, uppercase): stamps, the fold control, fallback status line; folio numerals and times use 0.85–0.95rem at ls 0.12em.

### Named Rules
**The Fixed Ladder Rule.** Hierarchy comes from the four-step ladder (folio, body, entry, name) before any invented size. One-off variants exist only as documented furniture steps; a new surface reaches for the ladder first.
**The Set-Caps Rule.** Programme words in the display face are uppercase and tracked; only the δ glyph and real date strings break caps. Never set body prose in Barlow.

## Layout

The page is a single programme column: `main` is min(100% − 15%, 1000px), header and footer sit on a 7.5% inline gutter, and sections breathe with clamp(2.6rem, 7vh, 4.2rem) block padding. The masthead is a two-column grid (name stack | right-edge furniture) closed by a 4px ink rule; below the rule, masthead furniture (works anchor, latest notice) spans both columns.

Running-order rows are a three-column grid: 3.4rem folio column, elastic name/gloss column, auto arrow column, aligned on baseline with 1.2rem block padding and a hairline between rows. Notice rows are one column of date/title/source at 1.1rem block padding. Copy blocks cap at 46ch (masthead note), 62ch (overture), 52ch (box-office copy).

Responsive: at ≤860px the masthead side furniture drops below the name as a row and news dates go full-width; at ≤560px the folio column narrows to 2.4rem and entry arrows disappear (the arrow is decoration at small size; the underline already says "link"). Shared chrome (from the untouched styles.css) restructures the header at ≤700px and again at ≤420px. Floor width is 320px. The box-office band bleeds from the column to full viewport width with exactly margin-inline: −7.5% / padding-inline: 7.5%.

**The Bleed Rule.** Full-bleed elements reach the viewport edge only via the −7.5% counter-offset of the column gutter, so the band's content realigns with the page column.

## Elevation & Depth

This system does not use an elevation ladder. Depth is letterpress: the page is flat paper, and anything that "sits on it" is announced by printed structure — a 1px hairline rule, a 2px border plus a 1px outline offset 3px (the stamp's double border), a 4px structural rule under the masthead, or a 45° hatch band clipped to 10px at the band's top edge. There is exactly one drop shadow in the shipped world, and it is tiny and singular. No gradients, no backdrop-filter, no glass, anywhere in the home stylesheet.

### Shadow Vocabulary
- **Stamp lift** (`box-shadow: 0 8px 18px -12px rgba(29,31,27,0.5)`): only under the issued stamp, to hold it off the paper as if rubber-stamped. Not reused elsewhere; not dark-theme-mirrored (deliberate, it reads on both presses).

### Named Rules
**The Pressed, Not Lit Rule.** Convey depth with rules, double borders, hatch texture, and the one stamp lift — never with shadows-as-lighting, gradients, or blur. If a new surface needs to feel raised, give it the stamp's paper (#f1eee5 / #1f221b) and a border, not a shadow.

## Shapes

The form language is letterpress-rectangular: corners are square everywhere in the world (0px; the status dot is explicitly radius 0). Borders are the shape language — 1px hairlines, 2px control borders, 4px structural rules, and the stamp's border+outline double. Clipping is used once: the box-office band clips a hatch SVG to a 10px strip. The only non-rectangle geometry in the world is the hatch's 45° lines, the stamp's −1.6° rotation, and typographic furniture (δ, ↗, ↓, ·) set in the same faces as text. Shared chrome keeps a 2px micro-radius on the theme-toggle and admin buttons — inherited, at the edge of invisibility; new world surfaces use sharp corners.

## Components

### Buttons
- **Shape:** square (0px) for world controls; micro 2px only on inherited chrome controls.
- **Fold control (At a glance / Full programme):** transparent on paper, 1px furniture-brown border, folio label type (0.72rem, ls 0.16em, uppercase), padding 0.55rem 0.9rem. Hover inverts to ink fill with paper text (border included); one named control, both states named aloud via aria.
- **Invert CTA (Services & booking):** sits on the red band; 2px bone-paper border, paper text, Barlow 700 1rem ls 0.16em, padding 0.85rem 1.4rem. Hover fills paper, text turns ticket red.
- **Chrome controls (theme toggle, admin entry):** inherited from shared chrome but re-inked by the remap — 40px min-height, 1px hairline border, hover border goes ticket red on Pressed Bone fill; focus is a 2px red outline, offset 3px.
- All state transitions are 160ms ease-out on colour properties only.

### Navigation
Shared chrome (styles.css) inheriting the remap: centred flex row, Work Sans 0.76rem in Folio Grey; hover and current-page go ticket red, current page underlined with a hairline at 0.35rem offset. Header 82px min-height with a 1px rule below. On home the wordmark δ and nav labels pick up the world through tokens, not new CSS.

### Stamp / "Programme issued" (signature)
Raised-paper block, 2px ticket-red border plus 1px ticket-red outline at 3px offset (double ticket border), folio label line with a square status dot, the real timestamp in ink at 0.95rem ls 0.08em, rotated −1.6° and carrying the system's only shadow. Rotation is removed under reduced motion. It is an identity element: it always renders live content, never a decorative date.

### Programme entry (signature)
The running-order row: red folio numeral (01–04), uppercase entry name at --t-entry underlined in hairline, a gloss line in Folio Grey, a red ↗ arrow. Hover turns the name red and thickens its underline to 2px. The fold ("At a glance") collapses each gloss to zero height via a grid-rows transition — the row never jumps, the name always stays.

### Notices (dated rows)
Date line in Barlow 0.85rem ls 0.12em uppercase grey, title in Work Sans 500 1.1rem ink, source link in ticket red. Masthead's latest-notice line mirrors this: red "Latest notice" folio, short date, headline link — fed by the news API, hidden when there is nothing real to show.

### Box-office band (signature)
Full-bleed ticket-red section, paper-coloured heading and copy (copy is full paper, never softened — contrast ≥4.5:1), the invert CTA, and the 10px hatch strip along its top edge in translucent paper lines (night press uses translucent ink lines). Exactly one per page.

### Reveal motion (world-wide behaviour)
Rows rise translateY(1.15rem) → none over 550ms cubic-bezier(0.22,0.61,0.36,1), staggered 80ms per item (max 5). Elements are visible by default: motion classes attach only when JS runs and reduced-motion is off; transform is the only animated property. Never fade or hide content that carries information.

### Inputs / Fields
Not yet in this world — form furniture (admin, booking) still carries the legacy binding. New world-side inputs should follow the letterpress language: sharp corners, 1px furniture-brown stroke, paper fill, ticket-red focus.

## Do's and Don'ts

### Do:
- **Do** adopt the world on a new page by remapping the shared token names in one scoped block (as `body[data-page="home"]` does), light and dark together — the shared chrome then inherits the world for free.
- **Do** keep every token pair dual-press: light value plus dark mirror, written in the same block.
- **Do** set display type uppercase Barlow Condensed from the fixed ladder; track small settings (0.12–0.2em) and leave large settings near 0.
- **Do** render the issued stamp, notice dates, and nav labels from the live APIs; hide furniture that has no real data.
- **Do** use the stamp lift only on the stamp; use borders, hairlines, and hatch for everything else.
- **Do** keep reveal transforms and 160ms colour state swaps; ship content visible without JS.
- **Do** put copy blocks at 46–62ch.

### Don't:
- **Don't** mix worlds inside one page: a page either carries the Season Programme remap or stays explicitly legacy — never a legacy cream/Playfair element beside this world's bone/Barlow.
- **Don't** add a second saturated accent, a gradient, or a glass/blur surface; this world is paper, ink, rules, and one red.
- **Don't** invent kickers, eyebrows, boxed glyph icons, or hard offset shadows; the only glyph furniture is text itself (δ, ↗, ↓) set in the system's own faces.
- **Don't** fabricate dates, issue stamps, or programme data — the stamp's credibility is the whole world's credibility.
- **Don't** round world surfaces: 0px corners on new components; the 2px chrome micro-radius is inherited legacy, not invitation.
- **Don't** soften box-office copy below full paper (#eae7de / #191b16 ink equivalent) on red; that was a shipped fix, keep it.
- **Don't** animate opacity of informative content; reveal is transform-only.
