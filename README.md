# Daily English Tab

Daily English Tab is a Manifest V3 browser extension for Chrome, Edge, and Whale. Clicking the extension icon opens a compact popup with one sentence at a time, review actions, filter controls, and pronunciation playback. Settings and auto-sync live in a separate options page.

## Features

- Daily English sentence card with Korean translation
- Category and level filters
- Review queue and review-only mode
- Text-to-speech pronunciation using the browser's built-in speech engine
- Theme selection with system, light, and dark modes
- Daily learning count stored in `chrome.storage.local`
- Keyboard shortcuts for quick study
- Optional automatic dataset sync from a hosted JSON URL

## File Layout

- `manifest.json`
- `background.js`
- `popup.html`
- `popup.css`
- `popup.js`
- `shared.css`
- `options.html`
- `options.css`
- `options.js`
- `data/sentences.json`
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`
- `examples/github-raw/README.md`
- `examples/github-raw/sentences.json`
- `examples/github-raw/sentences.meta.json`

## Install

### Chrome

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click Load unpacked
4. Select this project folder
5. Click the extension icon to open the popup

### Edge

1. Open `edge://extensions`
2. Turn on Developer mode
3. Click Load unpacked
4. Select this project folder
5. Click the extension icon to open the popup

### Whale

1. Open `whale://extensions`
2. Turn on Developer mode
3. Click Load unpacked
4. Select this project folder
5. Click the extension icon to open the popup

## What to Test

- The popup opens immediately when you click the extension icon
- A sentence appears immediately in the popup
- Category and level filters change the active sentence pool
- The next sentence button does not repeat the same item back to back
- The review button adds and removes the current sentence
- Translation toggle hides and shows Korean text
- Speech playback uses the browser voice when available
- Theme selection persists in the options page
- Daily count resets when the date changes

## Icons

This project is set up to use PNG icons in `icons/`.

If you want to replace them:

1. Keep the same file names and sizes
2. Use 16x16, 48x48, and 128x128 PNG files
3. Repack or reload the extension after updating the files

If you prefer SVG-based development icons during prototyping, you can swap the paths in `manifest.json`, but PNG is the safest format for broad browser compatibility.

## Automatic Data Sync

The extension can keep its sentence set updated from a hosted JSON file.

1. Open the extension `Settings` page
2. Paste a public JSON URL in `Remote JSON URL`
3. Turn on `Auto update`
4. Choose how often the app should check for updates
5. Click `Sync now` once to verify the URL

When auto update is enabled, the extension also checks in the background on the interval you choose and keeps using the latest cached dataset in the popup.

Supported remote payloads:

- An array of sentence objects
- Or an object with a `sentences` array plus optional `version` and `updatedAt`

Each sentence should keep the same fields used by the bundled data:

- `id`
- `english`
- `korean`
- `category`
- `level`
- `situation`

If the remote fetch fails, the extension keeps using the local cached data.

The remote URL should be publicly reachable and CORS-enabled so the extension can fetch it directly.

## Example GitHub Raw Layout

The `examples/github-raw/` folder shows a simple structure you can copy into a public repository.

- `sentences.json` is the file you paste as the raw URL
- `sentences.meta.json` is optional metadata for your own publishing workflow
- The raw `sentences.json` file can contain either a plain array or a `{ "sentences": [...] }` object

## Notes

- All logic runs locally in the extension page.
- No external libraries or CDN assets are used.
- No unnecessary host permissions are requested.
- The app stores settings and study progress in `chrome.storage.local`.
