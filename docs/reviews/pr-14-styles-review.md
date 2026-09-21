# Review record — PR #14 "update styles.css"

Shared source of truth for this review. Anyone (human or agent) picking this
up should read and update this file rather than relying on chat history.

- **PR:** [ToonRz/Automatic-Panorama#14](https://github.com/ToonRz/Automatic-Panorama/pull/14)
- **Author:** @thikamporntuamkaew
- **Head:** `thikamporntuamkaew:P.noon` @ `cb55920`
- **Base:** `main` @ `da74378`
- **Size:** 2 files, +93 / −3
- **Reviewed:** 2026-09-21
- **Verdict:** do not merge — closed, rework requested

## Objective, scope, acceptance criteria

Decide whether PR #14 should be merged into `main`. Merge it if it is a net
improvement; otherwise close it with an explanation the author can act on.

A CSS-only PR is acceptable when:

1. Every selector it adds matches markup that exists in `frontend/src`.
2. It does not regress the layout described in `docs/ui-spec.md`.
3. Visual order stays consistent with DOM order (focus/tab order).
4. It carries no unrelated or generated files (`CLAUDE.md` rule 10).
5. It targets the branch `CONTRIBUTING.md` prescribes.

## What the PR changes

`frontend/src/styles.css`

- Adds a `.panel-head:has(.stage-head-content)` block and a
  `.stage-head-content` grid/flex layout, plus a mobile variant.
- Adds `.tool-stack` (column flex) and ordering rules
  (`.tools .tool.primary { order: 1 }`, `.tools > .tool[aria-pressed] { order: 2 }`).
- Rewrites the base `.tools` rule: removes `margin-left: auto`, sets
  `align-items: flex-end`, narrows `gap` from `8px` to `4px`.
- Mobile: `.tools .tool` changes from `flex: 1` to `width: auto`, and
  `.tools .tool.primary` gets `grid-column: 1 / -1; width: 100%`.

`package-lock.json` (new, repository root)

- A 6-line stub lockfile with an empty `packages` object.

## Findings

### 1. Blocking — the new selectors match no markup in this repository

`.stage-head-content` and `.tool-stack` do not appear anywhere in
`frontend/src`, and never have in this repository's history:

```
$ grep -rn "stage-head-content\|tool-stack" frontend/src   # no matches
$ git log --all -S"stage-head-content"                     # no commits
$ git log --all -S"tool-stack"                             # no commits
```

The actual output-stage head is rendered by
`frontend/src/components/PanelHead.tsx` and
`frontend/src/components/OutputCanvas/OutputCanvas.tsx:140`:

```
.panel-head
  .panel-head-title
  .chips
  .tools
    button.tool[aria-pressed]   (Seams & inliers)
    button.tool.primary         (Download PNG)
```

There is no wrapper element and no stack element, so roughly 60 of the 87
added lines are dead rules. The PR appears to have been written against a
different (planned or local) markup that was not included in the diff.

### 2. Blocking — the output toolbar loses its right alignment

`frontend/src/styles.css:892` currently carries `.tools { margin-left: auto }`,
which is what pushes the toolbar to the right edge of the panel head. The PR
deletes it and replaces it with `.stage-head-content .chips { flex: 1 }` —
a rule that never matches (finding 1).

`.panel-head` is `display: flex`, `.chips` has no `flex: 1`
(`frontend/src/styles.css:858`), and `OutputCanvas` passes no `aside`, so
nothing else supplies the spacing. The result is that "Seams & inliers" and
"Download PNG" collapse left against the chips. `PanelHead.tsx` documents
`margin-left: auto` on `.tools` as the mechanism for this, and
`docs/ui-spec.md` section 3.1 describes the right-edge placement.

### 3. Blocking — visual order no longer matches DOM order

`.tools .tool.primary { order: 1 }` and `.tools > .tool[aria-pressed] { order: 2 }`
render "Download PNG" before "Seams & inliers" while the DOM order stays
unchanged. Keyboard focus would still reach the toggle first, so tab order
and reading order disagree (WCAG 2.1 SC 1.3.2 / 2.4.3). If the reordering is
intentional, it belongs in the JSX, not in `order`.

### 4. Blocking — the mobile toolbar regresses

In the mobile block, `.tools` stays `display: flex` (the grid variant is
scoped to the non-existent `.stage-head-content`). So:

- `grid-column: 1 / -1` on `.tools .tool.primary` is inert.
- `.tools .tool` losing `flex: 1` in favour of `width: auto`, combined with
  `width: 100%` on the primary button, means the two buttons no longer share
  the row; they overflow and are shrunk by flex instead of sized deliberately.

### 5. Blocking — stray root `package-lock.json`

The repository has no root npm project; the frontend owns
`frontend/package.json`. The added root lockfile is empty generated output and
is excluded by `CLAUDE.md` rule 10 ("Do not commit … generated build output").

### 6. Process — wrong base branch and missing PR body

`CONTRIBUTING.md` line 39: short-lived branches are cut from `develop` and
merge into `develop`; `develop` then promotes to `test` and `test` to `main`.
This PR targets `main` directly. The PR body is the single line
"update styles.css"; `CLAUDE.md` requires owner, affected stage, tests, and
visual evidence for UI changes.

### 7. Context — CI and Vercel preview

No check runs are attached to the head commit (`get_check_runs` → 0), and the
Vercel bot reports it cannot build a preview because the fork author is not a
member of the `toonrz's projects` team. So there is no automated signal for or
against this PR either way; the review above is the only evidence.

## Decision

Do not merge. Every layout rule that would have made the new structure work
depends on markup that is not in the repository, while the one rule that is
load-bearing today (`margin-left: auto`) is removed. Merging as-is is a
straight visual regression on both desktop and mobile.

PR #14 was closed with a comment summarising findings 1–6 and the rework path
below. Nothing from the branch was merged.

## Rework path for the author

1. Cut a branch from `develop`, e.g. `feat/stage-head-toolbar`.
2. Include the JSX change in the same PR: add the `.stage-head-content`
   wrapper and `.tool-stack` in `PanelHead.tsx` / `OutputCanvas.tsx` so the
   new selectors have something to match.
3. Keep `.tools { margin-left: auto }` (or give the new wrapper an explicit
   equivalent) so the toolbar stays right-aligned.
4. Reorder buttons in the JSX rather than with CSS `order`.
5. Do not commit a root `package-lock.json`.
6. Attach before/after screenshots at desktop and mobile widths, and run
   `make frontend-build` plus the frontend tests.

## Status

| Item | State |
| --- | --- |
| PR #14 reviewed | Done |
| Verdict | Do not merge |
| PR closed with explanation | Done |
| Review record committed | This file |
| Follow-up PR from author | Not started (author's to open) |

## Known issues / open questions

- The intended `.stage-head-content` markup was never shared; the reviewed
  design intent is inferred from the CSS alone.
- Fork PRs cannot produce a Vercel preview under the current plan, so UI
  changes from outside collaborators need manually attached screenshots.
