# NEVIN — Creative Video Editor & Motion Designer

Premium single-page portfolio for Nevin. Static HTML, CSS and JavaScript — no build step, no dependencies, no framework. Deploys to GitHub Pages as-is.

## Project contents

```text
index.html              # The whole page
assets/css/style.css    # Theme, glassmorphism, layout, responsive rules
assets/js/main.js       # All interactions (dependency-free)
assets/photos/          # Photography gallery images
assets/videos/          # Portfolio motion reels
.github/workflows/      # GitHub Pages deployment
```

## Design

Black and dark-grey glassmorphism with electric blue and purple neon glow, over an animated aurora gradient background.

| Token | Value |
| --- | --- |
| Background | `#05060a` |
| Electric blue | `#3b82f6` → `#22d3ee` |
| Purple | `#a855f7` → `#7c3aed` |
| Display font | Space Grotesk |
| Body font | Poppins |

## Features

Animated loading screen · mouse spotlight · glassmorphism UI · aurora animated background · floating particles (canvas) · inertial smooth scrolling · animated typing text · hover glow cards · animated skill rings · scroll progress bar · custom cursor with trail · neon buttons · magnetic hover · ripple clicks · scroll reveal · 3D tilt cards · gradient borders · responsive layout · SEO metadata and JSON-LD · copy-email button · back-to-top · animated footer.

### Implementation notes

- **No third-party JS.** GSAP, Lenis, ScrollReveal, Vanilla Tilt and Typed.js were each replaced with a small purpose-built module. The page loads no external scripts, so there is no render-blocking CDN request and nothing to break if a CDN goes down. Only Google Fonts is fetched externally.
- **Every module is isolated.** `main.js` boots each feature in its own `try/catch`; one failure cannot take down the rest of the page.
- **The loader can never trap a visitor** — it force-completes after 3.6 s even if an asset stalls.
- **Graceful degradation.** All content is in the HTML and readable without JavaScript. Cursor, spotlight, trail and inertial scroll activate only for fine pointers, and `prefers-reduced-motion` disables animation while revealing all content.

## Editing

- **Text, links, section copy** — edit `index.html` directly.
- **Skill percentages** — change the `data-ring="52"` attribute on a `.ring`; the label and arc both follow automatically.
- **Typing headline** — edit the `data-words='[...]'` JSON array on `#typed`.
- **Colours** — edit the custom properties in the `:root` block at the top of `assets/css/style.css`.
- **Photos / videos** — drop replacements into `assets/photos` or `assets/videos` and update the matching `src` in `index.html`.

## Deployment

`.github/workflows/static.yml` publishes the repository root to GitHub Pages on every push to `main`. The live site is <https://xpnevin.github.io/>.

## Links

- Email — xpnevin@gmail.com
- Instagram — [@nevin.xp](https://www.instagram.com/nevin.xp) · [@nevin_manoj__](https://www.instagram.com/nevin_manoj__)
- Commission form — [Google Form](https://docs.google.com/forms/d/e/1FAIpQLScMMtdlPvcL6o0XBwXqrJbJ3QDt0xGXV8yw5osTftCmaxq7Mw/viewform)
