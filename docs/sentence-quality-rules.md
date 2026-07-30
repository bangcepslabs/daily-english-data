# Sentence Quality Rules

Use this guide before and after adding new sentence batches.

## Goal

Keep the dataset natural, varied, and safe to publish without manually re-reading every line from scratch.

## Before you generate or add sentences

- Keep each batch focused on a small set of categories.
- Decide the target level first:
  - `Beginner`: short, direct, one clear idea
  - `Intermediate`: natural daily phrasing with condition, reason, comparison, or polite request
  - `Advanced`: nuanced judgment, softer negotiation, reflection, or multi-clause structure
- Avoid generating huge groups with the exact same sentence frame.
- Mix verbs, time phrases, and situations so nearby entries do not feel cloned.

## Hard fail rules

These should block a publish:

- duplicate `id`
- duplicate English sentence
- empty `english`, `korean`, `category`, `level`, or `situation`
- invalid `level`
- `data/sentences.json` and `examples/github-raw/sentences.json` not matching
- metadata `count`, `version`, or `updatedAt` not matching the raw file
- repeated-word mistakes like `before before` or `after after`
- known awkward patterns such as `feels more better` or `seems missing`

## Warning rules

These should be reviewed before push:

- article mismatch like `a umbrella`
- missing ending punctuation
- `situation` text not starting with `Use when` or `Useful when`
- one English opening repeated too many times in the same dataset

## Manual review checklist

Check a sample from every updated category:

- English sounds like something a real person would say
- Korean sounds like natural Korean, not a literal machine translation
- The difficulty label matches the actual sentence difficulty
- Nearby sentences are not just noun swaps
- Technology and shopping lines describe realistic situations
- Health lines do not combine awkward time phrases with habits in unnatural ways

## Recommended local command

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-sentences.ps1
```

If you want warnings to fail the run too:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-sentences.ps1 -FailOnWarning
```

## Suggested update flow

1. Add or edit sentences with a TSV update file.
2. Apply the update with `scripts/apply-dataset-update.ps1`.
3. Run `scripts/validate-sentences.ps1`.
4. Fix every error.
5. Review warnings and decide whether to rewrite those lines.
6. Commit and push only after the validation output is clean.
