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
4. Paste the raw URL into the extension settings

## Raw URL example

```text
https://raw.githubusercontent.com/jeongbyeongho/daily-english-data/main/examples/github-raw/sentences.json
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

## Good publishing habits

- Keep `id` values unique and stable
- Keep `english` and `korean` non-empty
- Use the same category and level labels consistently
- Bump `version` whenever you publish a meaningful update
- Leave the app to read the latest cached dataset automatically

## Local testing

If you want to test the extension with this repo:

1. Open the browser extension page
2. Load the extension unpacked from this folder
3. The default raw JSON URL is already prefilled in the options page
4. Auto update is enabled by default
5. Click `Sync now` once if you want to force an immediate refresh

## Notes

- The extension falls back to the last cached dataset if the remote file is unavailable.
- The repository can keep growing as you add more sentence packs later.
