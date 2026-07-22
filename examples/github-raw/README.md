# GitHub Raw Example

This folder shows the simplest public-repo layout for sentence data.

## Files

- `sentences.json` - the raw file the extension fetches
- `sentences.meta.json` - optional metadata for your own publishing flow

## Recommended flow

1. Put this folder into a public GitHub repository.
2. Copy the raw URL for `sentences.json`.
3. Paste that URL into the extension settings.
4. Turn on auto update.
5. Click `Sync now` once to verify the source.

## Supported shapes

The raw JSON can be either:

- A plain array of sentence objects
- Or an object with a `sentences` array and optional metadata

## Keep these fields stable

- `id`
- `english`
- `korean`
- `category`
- `level`
- `situation`

## Example raw URL

```text
https://raw.githubusercontent.com/your-name/daily-english-data/main/examples/github-raw/sentences.json
```

## Notes

- The raw file must be publicly reachable.
- The browser must be allowed to fetch it with CORS.
- Bump `version` and `updatedAt` when you publish new content.
