# NEVIN — Creative Video Editor & Motion Designer

Corrra-inspired single-page portfolio for Nevin. Static HTML, CSS and JavaScript — no build step, no dependencies, no framework. Deploys to GitHub Pages as-is.

Rebuilt to match the clean editorial style of https://corrra.com/@Nikhil%20Gite — warm paper, brutalist typography, pill buttons and rounded media.

## Project contents

```text
index.html              # The whole page
assets/css/style.css    # Theme, layout, responsive rules
assets/js/main.js       # All interactions (dependency-free)
assets/photos/          # Photography gallery images
assets/videos/          # Portfolio motion reels
.github/workflows/      # GitHub Pages deployment
```

## Design

Warm paper editorial inspired by Corrra:

| Token | Value |
| --- | --- |
| Background | `#FFFBF5` (warm paper) |
| Warm panel | `#F5EFE3` |
| Surface | `#FFFFFF` |
| Line | `#E8DDC7` |
| Text | `#0E0E11` |
| Display font | Space Grotesk |
| Body font | Inter |
| Serif accent | Instrument Serif |

## Features

Minimal top bar · massive Corrra-style logotype (NEVIN*) · visual profile hero · brutalist manifesto (“I am Nevin, motion graphics designer”) · selected work reels & gallery · toolkit with progress bars · accounts cards · India connect CTA · commission form embed · scroll reveal · copy-email · video autoplay on view · responsive · SEO metadata and JSON-LD.

### Implementation notes

- **No third-party JS.** Only Google Fonts is fetched externally. All interactions are vanilla.
- **Every module is isolated.** `main.js` is defensive; one failure cannot break the rest.
- **Graceful degradation.** All content is in HTML and readable without JavaScript. `prefers-reduced-motion` disables animations.

## Editing

- **Text, links, section copy** — edit `index.html` directly.
- **Hero name** — edit `.hero__name-row` in `index.html`.
- **Toolkit percentages** — change the `width:XX%` inline style on `.tool-bar span`.
- **Colours** — edit the custom properties in the `:root` block at the top of `assets/css/style.css`.
- **Photos / videos** — drop replacements into `assets/photos` or `assets/videos` and update the matching `src` in `index.html`.

## Deployment

`.github/workflows/static.yml` publishes the repository root to GitHub Pages on every push to `main`. The live site is <https://xpnevin.github.io/>.

## Links

- Email — xpnevin@gmail.com
- Instagram — [@nevin.xp](https://www.instagram.com/nevin.xp) · [@nevin_manoj__](https://www.instagram.com/nevin_manoj__)
- Commission form — [Google Form](https://docs.google.com/forms/d/e/1FAIpQLScMMtdlPvcL6o0XBwXqrJbJ3QDt0xGXV8yw5osTftCmaxq7Mw/viewform)
