# NEVIN — Creative Video Editor & Motion Designer

Premium single-page portfolio for Nevin. Static HTML, CSS and JavaScript — no build step, no dependencies, no framework. Deploys to GitHub Pages as-is.

## Project contents

```text
index.html               # The whole page
admin.html               # Content admin panel (noindex)
assets/data/content.json # All site copy — the single source of truth
assets/css/style.css     # Theme, glassmorphism, layout, responsive rules
assets/css/admin.css     # Admin panel styling
assets/js/content.js     # Hydrates index.html from content.json
assets/js/main.js        # All interactions (dependency-free)
assets/js/admin.js       # Admin panel — reads/writes via the GitHub API
assets/photos/           # Photography gallery images
assets/videos/           # Portfolio motion reels
scripts/                 # Node test suites
.github/workflows/       # GitHub Pages deployment
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

Plus a serverless content admin — see below.

### Implementation notes

- **The site is data-driven but stays static.** `content.js` fetches `content.json` and rewrites the page before `main.js` boots. If the fetch fails, times out (2.5 s) or returns malformed JSON, the hard-coded markup in `index.html` is left untouched and the interaction layer still starts — so a bad deploy degrades to the previous copy rather than a blank page.
- **Content is escaped, never injected.** Values are written with `textContent`; only `**bold**` and `*emphasis*` are converted to markup, after escaping.

- **No third-party JS.** GSAP, Lenis, ScrollReveal, Vanilla Tilt and Typed.js were each replaced with a small purpose-built module. The page loads no external scripts, so there is no render-blocking CDN request and nothing to break if a CDN goes down. Only Google Fonts is fetched externally.
- **Every module is isolated.** `main.js` boots each feature in its own `try/catch`; one failure cannot take down the rest of the page.
- **The loader can never trap a visitor** — it force-completes after 3.6 s even if an asset stalls.
- **Graceful degradation.** All content is in the HTML and readable without JavaScript. Cursor, spotlight, trail and inertial scroll activate only for fine pointers, and `prefers-reduced-motion` disables animation while revealing all content.

## Admin panel

Visit **[/admin.html](https://xpnevin.github.io/admin.html)** to edit the site from a browser — no code, no local setup.

There is no server. The panel talks straight to the GitHub REST API from the
browser: it reads `assets/data/content.json`, renders a form over it, and
commits the result back. That push triggers the Pages workflow, so saving
publishes. GitHub is the database, the API and the deploy pipeline.

### Signing in

The panel needs a token with permission to write to this repository.

1. Open [GitHub → fine-grained tokens](https://github.com/settings/personal-access-tokens/new).
2. **Repository access** → *Only select repositories* → `xpnevin.github.io`.
3. **Permissions** → Repository → **Contents** → *Read and write*.
4. Generate, copy, paste into the panel.

The token is held in `localStorage` on that device and sent only to
`api.github.com` in an `Authorization` header. It is never written into the
repository and never reaches any third party. Sign out clears it. Set an
expiry when you create it, and revoke it from the same settings page if a
device is lost.

> Because the token belongs to you and lives in your browser, no visitor can
> reach the panel's write path — `admin.html` is a public file, but without a
> valid token it can do nothing except sit at the sign-in screen. It is
> `noindex` so it stays out of search results.

### What you can edit

Hero copy, the typing headline, stat strip, about paragraphs and tags, skill
rings (name, percentage, gradient colours), reels, gallery photos with alt
text, Instagram accounts, contact details, the commission form URL and the
footer. Lists support reorder, add and delete.

The **Media** tab uploads images and video straight into `assets/photos` or
`assets/videos` and hands back the path to paste into a reel or gallery item.
Keep uploads under ~20 MB — the Contents API rejects large payloads.

`Ctrl`/`Cmd`+`S` publishes. An "Unsaved" badge tracks pending edits, and the
tab warns before you close it with unpublished changes.

## Editing by hand

- **All site copy** — edit `assets/data/content.json`.
- **Titles** — wrap a phrase in `*asterisks*` for the gradient highlight; use `**double**` for bold inside paragraphs.
- **Colours** — edit the custom properties in the `:root` block at the top of `assets/css/style.css`.
- **Structure / new sections** — edit `index.html`, then extend `assets/js/content.js` to bind the new markup.

`index.html` still contains the full rendered content as static markup. It is
the no-JavaScript fallback and what crawlers see first, so if you change the
shape of a section there, keep `content.json` in step.

## Tests

```bash
npm install jsdom --no-save
node scripts/test-hydration.js   # content.json → DOM bindings, XSS escaping
node scripts/test-admin.js       # sign-in, form rendering, repeaters, publish
node scripts/test-selectors.js   # selector/CSS/asset cross-references
```

## Deployment

`.github/workflows/static.yml` publishes the repository root to GitHub Pages on every push to `main`. The live site is <https://xpnevin.github.io/>.

Publishing from the admin panel commits to `main`, which triggers that same
workflow — changes appear in roughly a minute.

## Links

- Email — xpnevin@gmail.com
- Instagram — [@nevin.xp](https://www.instagram.com/nevin.xp) · [@NEXR1.ae](https://www.instagram.com/nexr1.ae) · [@ZEDEX.MOV](https://www.instagram.com/zedex.mov) · [@nevin_manoj__](https://www.instagram.com/nevin_manoj__)
- Commission form — [Google Form](https://docs.google.com/forms/d/e/1FAIpQLScMMtdlPvcL6o0XBwXqrJbJ3QDt0xGXV8yw5osTftCmaxq7Mw/viewform)
