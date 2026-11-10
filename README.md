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

The page takes cues from a video-editing interface: numbered sections,
monospace technical labels, a glass timeline panel and a CSS-built 3D camera
lens in the hero. The visual system uses Cloud White space, Sand Dune structure
and precise Cobalt Flash actions without adding heavy images, libraries or stock
portfolio work.

| Token | Value |
| --- | --- |
| Cloud White — 60% | `#f7f5f0` canvas · `#fffdf9` paper surfaces |
| Sand Dune — 30% | `#8a7966` structure · `#493e34` deep ink |
| Cobalt Flash — 10% | `#064fca` actions, active states and focus |
| Record red | `#bd5048` (playhead, REC dot only) |
| Type | Inter (UI + display), JetBrains Mono (technical labels) |

## Sections

Hero with live timecode, a glass sequence panel and CSS 3D lens · services ticker ·
interactive Colour Lab · working-together facts · 01 Services · 02 Work (the two
Instagram feeds) · 03 About · 04 Process · 05 Contact with a service/date enquiry form · footer.

## Features

Numbered section headers · glass timeline panel · CSS 3D lens · interactive
Colour Lab with four looks and a glow slider · pointer tilt on desktop · animated
playhead · scrolling ticker · useful working-together facts · service/date email
enquiry form · feed cards · hover light sweep and 3D lift · magnetic primary
button · ripple clicks · copy-email button · scroll progress bar · active nav
link · staggered reveals · back-to-top · responsive layout · SEO metadata, Open
Graph image and JSON-LD.

## Implementation notes

- **No third-party JS.** Every effect is a small purpose-built module. The page
  loads no external scripts; only Google Fonts is fetched externally.
- **Nothing is hidden behind JavaScript.** The `<html>` element only gets the
  `.js` class from a one-line inline script, and the reveal animation, mobile
  menu and copy button are all gated on that class. With JS
  disabled the page is fully readable, the nav stays inline and every section is
  visible — there is no loader to get stuck behind.
- **No scroll hijacking.** Native scrolling and `scroll-behavior: smooth` are
  left alone, so nested scrollers, keyboards, trackpads and the scrollbar all
  behave normally.
- **One scroll listener, one rAF per frame.** The progress bar, sticky header
  and back-to-top button share a single throttled pipeline; reveals use
  `IntersectionObserver`; the only JavaScript timer is a 4 Hz clock that pauses
  when the tab is hidden.
- **Cheap by default.** No canvas, particles or custom cursor. Glass blur is
  limited to interface surfaces; the background is static and the 3D lens is
  CSS-only. The page ships exactly one image — the social share card.
- **Motion is optional.** `prefers-reduced-motion` stops the ticker, lens,
  playhead and reveals, and shows every element immediately.
- **No form backend required.** The service/date enquiry form opens a
  pre-filled email draft; a Google Form remains available as a fallback.
- **Kid-friendly play without tracking.** The Colour Lab changes only local CSS
  state; it asks for no personal details and does not save the selected look.
- **Accessibility.** Skip link to a focusable `<main>`, visible focus rings,
  AA-contrast text tokens, `aria-expanded` menu with Escape and focus wrap, and
  decorative art hidden from screen readers.

## Editing

- **Text, links, section copy** — edit `index.html` directly.
- **Colours and spacing** — edit the custom properties in `:root` at the top of
  `assets/css/style.css`.
- **Work section** — section 02 is just the two `<article class="account">`
  feed cards; update the `href`, handle and description if an account changes.
  There is no gallery to maintain and no thumbnails to keep in sync.
- **Service cards** — the three `<article class="card">` blocks in the Services
  section.
- **Colour Lab** — change the buttons in `index.html`, palette variables in
  `assets/css/style.css` (`.colourlab[data-look]`) and behaviour in
  `assets/js/main.js` (`colourLab`).
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
