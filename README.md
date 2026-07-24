# Daily English Data

This repository stores the sentence data used by the Daily English Tab browser extension.

## What this repo is for

- Keep sentence content in one place
- Publish updates without changing the extension code
- Serve a raw JSON file that the extension can fetch automatically

## Main files

- `data/sentences.json` - bundled fallback dataset used by the extension
- `examples/github-raw/sentences.json` - recommended public raw file for publishing
- `examples/github-raw/sentences.meta.json` - optional metadata companion

## Recommended update flow

1. Edit `examples/github-raw/sentences.json`
2. Update `version` and `updatedAt`
3. Push to `main`
4. The extension uses the built-in raw URL by default, so no user setup is needed

## Raw URL example

```text
https://raw.githubusercontent.com/bangcepslabs/daily-english-data/main/examples/github-raw/sentences.json
```

## Sentence format

Each sentence should include:

- `id`
- `english`
- `korean`
- `category`
- `level`
- `situation`

The raw file can be either:

- A plain array of sentence objects
- Or an object with a `sentences` array plus optional metadata

## Difficulty guide

- `Beginner`: short and direct sentences with common vocabulary and one clear idea
- `Intermediate`: natural everyday sentences with slightly longer structure, comparison, reason, or polite phrasing
- `Advanced`: nuanced sentences with layered meaning, abstract wording, or multi-clause structure
- Keep the level aligned with actual sentence difficulty, not just topic formality
- Avoid repetitive templates that only swap nouns while keeping the same difficulty pattern

## Good publishing habits

- Keep `id` values unique and stable
- Keep `english` and `korean` non-empty
- Use the same category and level labels consistently
- Bump `version` whenever you publish a meaningful update
- Leave the app to read the latest cached dataset automatically

## User-facing behavior

- Users do not need to open any settings page
- The extension ships with automatic GitHub sync enabled by default
- The popup shows a short sync status and falls back to cached data if needed
- Repository updates become visible in the extension after the next refresh cycle

## Project site

If you publish this repository with GitHub Pages from the `docs/` folder, the recommended store URLs are:

- Site: `https://bangcepslabs.github.io/daily-english-data/`
- Privacy policy: `https://bangcepslabs.github.io/daily-english-data/privacy.html`
- Support: `https://bangcepslabs.github.io/daily-english-data/support.html`

## Local testing

If you want to test the extension with this repo:

1. Open the browser extension page
2. Load the extension unpacked from this folder
3. The extension will use the built-in raw JSON URL automatically
4. Auto update is enabled by default
5. Click `Sync now` only if you want to force an immediate refresh during development

## Notes

- The extension falls back to the last cached dataset if the remote file is unavailable.
- The repository can keep growing as you add more sentence packs later.
