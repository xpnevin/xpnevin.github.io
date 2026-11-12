# NEVIN — Every frame. A feeling.

The portfolio of **Nevin Manoj**: video editing, videography and photography.
A fully static website, deployed directly to GitHub Pages. **No build step,
framework, runtime packages or third-party font requests.**

## The identity

An image-led, independent editorial direction rather than a conventional
portfolio template: oversized condensed headlines, warm paper, electric blue,
asymmetric image layouts, numbered section rules and a typographic creator card.
The studio assistant uses the same design system.

| Token              | Light     | Dark      |
| ------------------ | --------- | --------- |
| Paper / background | `#f5f3ee` | `#171915` |
| Ink / foreground   | `#20211e` | `#f5f3ee` |
| Accent             | `#2949ed` | `#a3b0ff` |
| Brand blue         | `#2949ed` | `#2949ed` |

**Type:** Anton for display, DM Sans for reading and interface, IBM Plex Mono for
small editorial labels. Latin WOFF2 fonts are self-hosted in `assets/fonts/`, with
their SIL Open Font License notices alongside them. The first visit opens in
light mode; a visitor’s explicit theme choice is remembered across both pages.

## Pages & interactions

### Portfolio (`index.html`)

- A photographic opening frame and a three-image **visual notebook**. Native
  dialog, previous/next controls, arrow keys, Escape and restored trigger focus.
- Two **Instagram account links**, preserving the original work destinations.
- Three native **service accordions**, with links that preselect the enquiry.
- A typographic introduction to Nevin and a simple three-step process.
- The **Colour Lab**: four looks (Cinema, Golden, Cobalt, Mono), strength control,
  original/graded comparison slider, pointer dragging, keyboard controls and reset.
- A **project enquiry** with service, date, optional name and project notes.
  Submitting prepares an on-page draft and a mailto link; **nothing is sent
  automatically**. The visitor can review, copy or open it in their email app.
  Editing a field invalidates the old draft. The existing Google Form remains
  available as an alternative.
- Copy-email control, saved light/dark preference, scroll progress, section-aware
  navigation, responsive mobile menu and restrained entrance animations.

### Studio assistant (`chat.html`)

- Bring-your-own-key chat with OpenAI, OpenRouter, Groq or a custom,
  browser-accessible, OpenAI-compatible HTTPS endpoint.
- Prompt starters, streaming or JSON replies, safe basic Markdown, stop, new chat,
  connection settings and forget-key controls.
- Provider settings and the key are stored in this browser’s localStorage only.
  Requests go directly to the selected provider, which must permit browser
  requests (CORS). **Provider usage may cost money.**
- Transcripts are held in memory, not persisted or sent to this static site.
  “New chat” resets them; “Forget key” removes the saved key.
- Missing-key and provider-error states preserve the message for retry. No real
  provider keys or live provider calls are needed for the test suite.

## Image provenance

The coast, night-street and architecture images are **AI-generated art-direction
studies**, not claimed client commissions or photographs taken by Nevin. This is
stated in the interface, visual notebook and Colour Lab. The Instagram links lead
to Nevin’s original work. Replace the studies with owner-supplied imagery when
available, updating their alt text and provenance labels at the same time.

All imagery is served locally as optimised WebP. The hero has an 800px alternative
for smaller screens. The matching 1200×630 JPEG is the social share card.

## Accessibility & progressive enhancement

Semantic headings and landmarks, a skip link, named controls, visible focus,
pressed states, live status messages, native validation, accessible sliders,
focus-managed mobile navigation and dialog. Reduced-motion preferences disable
continuous movement, smooth scrolling and entrance animations.

Content remains readable without JavaScript, including native service details,
Instagram links, email and the alternative commission form. Controls requiring
JavaScript are hidden or accompanied by an explanatory fallback. The assistant
provides a direct contact link when JavaScript is disabled.

Automated axe checks target WCAG 2 A/AA and 2.1 AA on both pages, both themes and
mobile/desktop. These checks supplement, rather than replace, manual review.

## Project contents

```text
index.html                    Portfolio and enquiry
chat.html                     Bring-your-own-key studio assistant
assets/css/style.css          Shared tokens, layout and responsive components
assets/css/chat.css           Assistant-specific layout
assets/js/theme.js            Early shared theme restoration and toggle
assets/js/main.js             Portfolio interactions
assets/js/chat.js             Existing chat client, refreshed and hardened
assets/fonts/                 Local fonts and licence notices
assets/img/                   WebP studies, favicon and social card
tests/                        Static validation and browser/accessibility tests
playwright.config.js          Desktop/mobile test setup
.github/workflows/static.yml  GitHub Pages deployment
```

## Local preview

Python 3 is enough; there is no installation or build step:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Open `http://localhost:3000`. Alternatively, `npm run dev` runs the same server.
All browser asset paths are relative, so the static site also works in a hosted
preview or at a GitHub Pages subpath.

## Tests (development only)

Static links, assets, anchors, form labels, JSON-LD and JavaScript syntax:

```sh
npm run test:static
```

Full browser tests require Node 22.12+ and Chromium:

```sh
npm ci
npx playwright install chromium
npm test
```

Playwright starts its own temporary static server on port 4173. Tests cover
responsive layouts (320–1440px), navigation, themes, the gallery, service choices,
Colour Lab keyboard/pointer interactions, enquiry validation and copying,
no-JavaScript fallbacks, mocked chat streaming/errors and axe accessibility.
Set `CHROMIUM_PATH` if your CI already supplies a Chromium executable.
Test reports, downloaded packages and browser traces are ignored by Git.

## Editing & deployment

- **Content / links:** edit `index.html` or `chat.html`.
- **Colours / type / spacing:** tokens at the top of `assets/css/style.css`.
- **Visual notebook:** update the `studies` array in `assets/js/main.js`, plus the
  corresponding HTML images and labels.
- **Colour looks:** `--grade` filters under `.colourlab[data-look]` in the CSS.
- **Email destination:** update the contact links, `data-email`, form action and
  generated mailto in `main.js`, plus the assistant’s studio information.
- **Social card:** replace `assets/img/og.jpg`, keeping its 1200×630 dimensions.

The existing Pages workflow publishes the repository on pushes to `main`.
The site does not need npm or any build service in production.

### Original contact destinations

- Email: **xpnevin@gmail.com**
- Instagram: [@nevin.xp](https://www.instagram.com/nevin.xp) ·
  [@nevin_manoj\_\_](https://www.instagram.com/nevin_manoj__)
- [Commission form](https://docs.google.com/forms/d/e/1FAIpQLScMMtdlPvcL6o0XBwXqrJbJ3QDt0xGXV8yw5osTftCmaxq7Mw/viewform)
