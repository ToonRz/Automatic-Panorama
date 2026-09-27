# Task 04a - design system and application shell

- Owner: Member D
- Reviewers: Member E, Member C
- Depends on: 04e
- Spec: `docs/ui-spec.md` sections 2, 3, 11

## Scope

Replace the current token set in `frontend/src/styles.css` with the mock's,
self-host the three font families, and lay out the shell: hero, two-column
workspace, diagnostics band, footer. Establish `frontend/src/components/` and
the constants modules. Existing behaviour keeps working throughout; this slice
moves markup, it does not change what the app does.

## Acceptance

> **Shipped, then superseded by `task-plans/10-graphite-redesign.md`.** This
> slice landed as `398fd3d` directly on `main`, with no pull request. Task 10
> replaced its tokens, fonts, and breakpoints. Boxes were checked on
> 2026-09-28 against `main` at `9ff021a`: a box is checked only where the
> requirement still holds today. An unchecked box names what replaced it.

- [ ] every token in the section 2 table is defined and used by name, with no
      raw hex left in components;
      **Superseded by 10a**, which moved every rule to the Graphite tokens.
      Broken again since: the intro cover and the survival funnel carry raw
      colours (`docs/ui-spec.md` section 13, G4).
- [ ] Fraunces, DM Sans, and JetBrains Mono are served as latin-subset `woff2`
      from the bundle, with their OFL licence files committed, and no request
      leaves the origin for a font;
      **Superseded by 10a**: Geist and Geist Mono replaced these three and
      are self-hosted under `frontend/public/fonts/` with their OFL licences
      (A16).
- [x] every family has the fallback stack named in the spec;
      Evidence: `styles.css` `--sans` and `--mono` match the fallback column
      of `docs/ui-spec.md` section 2.2 for Geist and Geist Mono.
- [x] all numbers, codes, and uppercase labels render in the mono family with
      tabular figures;
      Evidence: `.mono` and the numeric table, KPI, and chip rules set
      `font-variant-numeric: tabular-nums` in `styles.css`. The v1 uppercase
      kickers no longer exist (section 2.2).
- [ ] the layout stacks at 900px and the page never scrolls horizontally;
      **Superseded by 10b**: the workspace now stacks at 960px (A10).
- [x] focus is visible against the dark ground on every interactive element;
      Evidence: the global `:focus-visible` rule in `styles.css`, a 2px
      `--accent` outline (A11).
- [x] `npm run lint` and `npm test` pass, and the existing smoke test still
      passes unchanged;
      Evidence: CI run 36341167597 on `9ff021a` (lint, build, and 229 Vitest
      tests green). The smoke test has since been edited for later copy
      changes, and it passes.
- [ ] screenshot evidence at desktop and at 900px.
      **Not recorded.** The slice had no pull request to carry screenshots,
      and 900px is no longer a breakpoint.
