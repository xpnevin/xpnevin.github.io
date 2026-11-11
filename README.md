# NEVIN — Video Editing, Recording & Photography

Single-page portfolio for Nevin's video editing, recording and photography
services. Static HTML, CSS and JavaScript — no build step, no dependencies, no
framework. Deploys to GitHub Pages as-is.

## Project contents

```text
index.html              # The whole page
assets/css/style.css    # Tokens, layout, components, responsive rules
assets/js/main.js       # All interactions (dependency-free)
assets/img/og.jpg       # 1200×630 social share card
robots.txt, sitemap.xml # Crawler hints
.github/workflows/      # GitHub Pages deployment
```

## Design — "cut room"

The page is built like an edit suite rather than a stack of cards: a film gate
in the hero, a ledger of services, hairline rules instead of glass panels, and
one warm accent cutting through a dark print-like canvas.

| Token | Value |
| --- | --- |
| Ink | `#0b0c0e` — the page in dark mode |
| Bone | `#f3eee4` — the page in light mode |
| Ember | `#f4743b` dark / `#c3481c` light — accent, links, active states |
| Record red | `#e5484d` — the REC dot only |
| Type | Instrument Serif (display), Inter Tight (UI), JetBrains Mono (labels) |

Both themes share one token set in `:root`; `[data-theme="light"]` overrides the
colours. The palette keeps an AA contrast ratio for body copy in both modes.

## Sections

Hero with live timecode and a film gate · scrolling service marquee · 01 Services
as a ledger · 02 Work (the two Instagram accounts) · 03 About with an ID slate ·
04 Process · 05 Colour Lab · 06 Contact with a service/date enquiry form ·
footer with an outlined wordmark.

## Features

Numbered section rules · film-gate hero · ledger services with hover states ·
interactive Colour Lab with four looks, a glow slider and pointer tilt · enormous
outlined wordmark · scrolling marquee · sticky header, scroll progress and back
to top · active nav link · staggered reveals · service/date enquiry email draft ·
copy-email button · live timecode · theme toggle that remembers the choice ·
responsive down to small phones · `prefers-reduced-motion` support.

## Implementation notes

- **No third-party JS.** Every effect is a small purpose-built module. Only
  Google Fonts is fetched externally.
- **Nothing is hidden behind JavaScript.** Content is visible without JS; the
  reveal animation, mobile menu and copy button are gated on the `.js` class.
- **No scroll hijacking.** Native scrolling and `scroll-behavior: smooth` are
  left alone. One throttled scroll pipeline drives the progress bar, sticky
  header and back-to-top button.
- **Semantic and accessible.** Skip link, visible focus rings, labelled controls,
  `aria-pressed` on the look choices, `aria-live` status messages, decorative art
  hidden from screen readers.
- **Cheap by default.** No canvas, particles or custom cursor; the only image is
  the social share card.
- **No form backend.** The enquiry form opens a pre-filled email draft; the
  Google Form stays available as a fallback.

## Editing

- **Text, links, section copy** — edit `index.html` directly.
- **Colours and spacing** — edit the custom properties in `:root` at the top of
  `assets/css/style.css`.
- **Work section** — the two `<a class="account">` blocks; update the `href`,
  handle and description if an account changes. There is no gallery to maintain.
- **Service ledger** — the three `<li class="ledger__row">` blocks.
- **Colour Lab** — buttons in `index.html`, palettes under
  `.colourlab[data-look]` in the stylesheet, behaviour in `main.js`.
- **Social share card** — replace `assets/img/og.jpg` (1200×630).
- **Marquee words** — the `.ticker__item` spans; keep the list doubled for a
  seamless loop.

## Deployment

`.github/workflows/static.yml` publishes the repository root to GitHub Pages on
every push to `main`. The live site is <https://xpnevin.github.io/>.

## Links

- Email — xpnevin@gmail.com
- Instagram — [@nevin.xp](https://www.instagram.com/nevin.xp) · [@nevin_manoj__](https://www.instagram.com/nevin_manoj__)
- Commission form — [Google Form](https://docs.google.com/forms/d/e/1FAIpQLScMMtdlPvcL6o0XBwXqrJbJ3QDt0xGXV8yw5osTftCmaxq7Mw/viewform)
