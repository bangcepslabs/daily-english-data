# Dataset Update Guide

This guide is for ongoing sentence updates after the extension has already been published.

## When you need a store update

You do not need to resubmit the extension when only the sentence data changes.

Store resubmission is needed only when extension code changes, such as:

- `manifest.json`
- `background.js`
- `popup.js`
- `options.js`
- popup or option page UI
- permissions
- icons

If you only change sentence data and push the JSON files, the published extension can fetch the new data automatically.

## Files to update

- `data/sentences.json`
- `examples/github-raw/sentences.json`
- `examples/github-raw/sentences.meta.json`

## Recommended workflow

1. Edit `data/sentences.json` first.
2. Review nearby entries together so the same pattern is not repeated too often.
3. Copy the same sentence content into `examples/github-raw/sentences.json`.
4. Update `version` and `updatedAt` in:
   - `examples/github-raw/sentences.json`
   - `examples/github-raw/sentences.meta.json`
5. Validate the JSON files.
6. Commit the changes.
7. Push to `main`.
8. Open the extension popup and confirm that the new remote data is visible.

## Dataset quality checklist

Check every update for the following:

- IDs are still unique
- No sentence was removed by accident
- No entry was duplicated
- `english`, `korean`, `category`, `level`, and `situation` are all present
- `level` uses only `Beginner`, `Intermediate`, or `Advanced`
- `situation` starts with `Use when...`
- English sounds natural in real conversation
- Korean sounds like natural spoken Korean, not a literal translation
- Nearby entries do not repeat the same sentence frame too often
- There are no broken quotes or malformed JSON escapes

## Difficulty rule

`Beginner`

- short and clear
- common daily words
- usually one idea

`Intermediate`

- natural everyday phrasing
- may include reasons, comparisons, and polite requests
- still concise

`Advanced`

- natural but more nuanced
- can include contrast, reflection, uncertainty, or softer negotiation
- should still sound like real spoken English

## Version rule

Use this format for dataset publishing:

- `YYYY.MM.DD.N`

Examples:

- `2026.07.24.1`
- `2026.07.24.2`
- `2026.07.24.3`

Meaning:

- `YYYY.MM.DD`: publishing date
- `N`: the number of dataset publishes on that date

## What to check after push

After pushing new data, confirm these points in the extension:

1. The popup loads normally.
2. The remote sentence count matches the JSON file.
3. The displayed update date changed.
4. A few recently changed sentences actually appear.
5. If needed, close and reopen the popup to force a fresh fetch.

## Practical release rule

- Data update only: update JSON, commit, and push
- Extension feature or UI update: build a new package and resubmit to the store
