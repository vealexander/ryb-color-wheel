# RYB Color Wheel

Interactive traditional artist's color wheel (red-yellow-blue) with rotatable harmony schemes — complementary, analogous, triadic, split-complementary, square, rectangle, and monochromatic. Installable as an offline-capable PWA on iPhone, Android, and desktop.

100% client-side. No backend, no accounts, no data collection.

## Develop

```
npm install
npm run dev
```

## Build & test the production bundle locally

```
npm run build
npm run preview
```

Open the printed URL and confirm the manifest (DevTools → Application → Manifest) and service worker (DevTools → Application → Service Workers) both look correct, then check "Offline" in DevTools → Network and reload to confirm it still loads.

## Regenerate icons

If `public/logo.svg` ever changes, regenerate the icon set with:

```
npm run generate-pwa-assets
```

This overwrites the PNG/ICO files in `public/`. If it prints different filenames than what's referenced in `vite.config.js`'s manifest `icons` array or in `index.html`'s `<link>` tags, update those to match its output.

## Deploy

Push to `main` — `.github/workflows/deploy.yml` builds and publishes to GitHub Pages automatically. The one-time setup step (already done for this repo, if you followed the handoff instructions) is enabling **Settings → Pages → Source → GitHub Actions**.

**If you ever rename this repo**, update `base` in `vite.config.js` to match — it must always equal `/<repo-name>/`, or every asset will 404 on deploy.

## Install on a device

- **iPhone:** open the URL in Safari → Share icon → Add to Home Screen.
- **Android:** open the URL in Chrome → ⋮ menu → Install app.
- **PC:** open the URL in Chrome or Edge → install icon in the address bar.
