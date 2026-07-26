# Nevin XP — Motion Editor Portfolio

A static portfolio website for Nevin XP, built with plain HTML and CSS. It can be hosted directly on GitHub Pages with no build step or installation required.

## Project contents

```text
index.html                 # Website code
assets/photos/             # Photography gallery images
assets/videos/             # Playable portfolio videos
```

## Publish on GitHub Pages

1. Create a new repository on GitHub, for example `nevin-xp-portfolio`.
2. Upload **everything inside this folder** to the repository root:
   - `index.html`
   - `assets` folder
   - `README.md`
   - `.nojekyll`
3. In the GitHub repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and the `/ (root)` folder, then click **Save**.
6. GitHub will show your public website address after it finishes deploying.

## Editing the portfolio

- Change text, section titles, contact links, and colours directly in `index.html`.
- Add replacement photos to `assets/photos` and update the corresponding `src` values in `index.html`.
- Add replacement MP4 videos to `assets/videos` and update the video `source` values in `index.html`.

## Notes

- The contact buttons use the provided Google Form link.
- The social links use the provided `@nevin.xp` Instagram profile.
- No server, database, framework, or paid service is needed.
