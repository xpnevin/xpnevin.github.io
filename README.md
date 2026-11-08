# NEVIN — Video Editing, Recording & Photography

Single-page portfolio for Nevin's video editing, recording and photography
services. Static HTML, CSS and JavaScript — no build step, no dependencies, no
framework. Deploys to GitHub Pages as-is.

## Project contents

```text
index.html              # The whole page
assets/css/style.css    # Theme, layout, responsive rules
assets/js/main.js       # All interactions (dependency-free)
assets/img/og.jpg       # 1200×630 social share card
robots.txt, sitemap.xml # Crawler hints
.github/workflows/      # GitHub Pages deployment
```

## Design

The page is built like an editing application: numbered sections, monospace
technical labels, a timeline panel in the hero, plate covers for the work grid
and a red playhead as the only warm colour on screen.

| Token | Value |
| --- | --- |
| Background | `#08090b` |
| Panel | `#0e1014` |
| Text / dim / faint | `#f4f5f7` · `#a9abb4` · `#8a8c95` |
| Accent | `#4f8cff` → `#8fb8ff` |
| Record red | `#ff4d3d` (playhead, REC dot only) |
| Type | Inter (UI + display), JetBrains Mono (technical labels) |

## Sections

Hero with live timecode and an animated sequence panel · services ticker ·
at-a-glance counters · 01 Services · 02 Work (filterable) · 03 Accounts ·
04 About · 05 Process · 06 Contact · footer.

## Features

Numbered section headers · timeline/sequence panel · animated playhead ·
scrolling ticker · count-up stats · filterable work grid · hover light sweep on
cards · magnetic primary button · ripple clicks · copy-email button · scroll
progress bar · active nav link · scroll reveal with stagger · back-to-top ·
responsive layout · SEO metadata, Open Graph image and JSON-LD.

## Implementation notes

- **No third-party JS.** Every effect is a small purpose-built module. The page
  loads no external scripts; only Google Fonts is fetched externally.
- **Nothing is hidden behind JavaScript.** The `<html>` element only gets the
  `.js` class from a one-line inline script, and the reveal animation, mobile
  menu, filter chips and copy button are all gated on that class. With JS
  disabled the page is fully readable, the nav stays inline and every section is
  visible — there is no loader to get stuck behind.
- **No scroll hijacking.** Native scrolling and `scroll-behavior: smooth` are
  left alone, so nested scrollers, keyboards, trackpads and the scrollbar all
  behave normally.
- **One scroll listener, one rAF per frame.** The progress bar, sticky header
  and back-to-top button share a single throttled pipeline; reveals and counters
  use `IntersectionObserver`; the only timer is a 4 Hz clock that pauses when
  the tab is hidden.
- **Cheap by default.** No canvas, no particles, no custom cursor, no large
  blurred layers. The background is a static dot grid plus two radial glows, and
  plate art is pure CSS — there are no photographic assets to download.
- **Motion is optional.** `prefers-reduced-motion` stops the ticker, the
  playhead, the counters and all reveals, and shows every element immediately.
- **Accessibility.** Skip link to a focusable `<main>`, visible focus rings,
  AA-contrast text tokens, `aria-pressed` filter chips, `aria-expanded` menu with
  Escape and focus wrap, decorative art hidden from screen readers.

## Editing

- **Text, links, section copy** — edit `index.html` directly.
- **Colours and spacing** — edit the custom properties in `:root` at the top of
  `assets/css/style.css`.
- **Work tiles** — each `<article class="tile" data-cat="…">` sets its filter
  category (`edit`, `record`, `photo`). Plate colours live in `.plate--1` …
  `.plate--6`.
- **Service cards** — the three `<article class="card">` blocks in the Services
  section.
- **Social share card** — replace `assets/img/og.jpg` (1200×630).
- **Ticker words** — the `.ticker__item` spans; keep the list doubled so the
  loop stays seamless.

## Deployment

`.github/workflows/static.yml` publishes the repository root to GitHub Pages on
every push to `main`. The live site is <https://xpnevin.github.io/>.

## Links

- Email — xpnevin@gmail.com
- Instagram — [@nevin.xp](https://www.instagram.com/nevin.xp) · [@nevin_manoj__](https://www.instagram.com/nevin_manoj__)
- Commission form — [Google Form](https://docs.google.com/forms/d/e/1FAIpQLScMMtdlPvcL6o0XBwXqrJbJ3QDt0xGXV8yw5osTftCmaxq7Mw/viewform)
