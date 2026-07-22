# GitHub Raw Example

This folder shows the simplest layout for hosting sentence data on GitHub so the extension can fetch it through a raw URL.

## Suggested structure

- `sentences.json`
- `sentences.meta.json`

## How to use

1. Put the files in a public GitHub repository.
2. Open `sentences.json` through the raw file URL.
3. Paste that raw URL into the extension's `Data sync` settings.
4. Turn on `Auto update`.

The raw JSON file can be either:

- A plain array of sentence objects
- Or an object with a `sentences` array

## Notes

- The URL must be publicly reachable.
- The raw response should allow cross-origin fetching.
- Keep the sentence fields consistent with the bundled data shape.

