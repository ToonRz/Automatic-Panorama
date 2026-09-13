# Task 10a - Graphite tokens and fonts

- Owner: TBD
- Reviewers: TBD
- Depends on: none
- Spec: `docs/ui-spec.md` section 2, section 11, A14, A16
- Parent: `task-plans/10-graphite-redesign.md`

## Scope

Replace the v1 colour tokens and font families with the Graphite system, and
make every existing rule read from the new tokens. Layout does not change in
this slice, so it can merge on its own and the screen still works: it is the
same composition in new colours and type.

- Replace the `:root` token block with the section 2 table: surfaces, borders,
  text, accent, status, matte, dot, scrim, and the three radius tokens.
- Map every v1 token by role, not by name. In particular the primary button,
  focus ring, slider fill, and pressed toggle currently use `--aqua`; they
  move to `--accent`. `--aqua` survives only where it meant "accepted" and
  becomes `--pass`. `--coral` becomes `--fail`, `--amber` becomes `--run`.
  `--aqua-deep` and `--line-soft` are removed.
- Replace the `@font-face` rules with Geist (variable, 400-700) and Geist Mono
  (variable, 400-500), latin subset, `font-display: swap`.
- Set the base: body 14px / 1.5 Geist on `--bg`, tabular figures on `.mono`,
  2px `--accent` focus ring with 2px offset. Keep the reduced-motion block.
- Split `styles.css` into comment-delimited blocks: tokens and base, shell,
  rail, stage, diagnostics. Move existing rules into the block that owns them.
- Remove uppercase letter-spaced kicker styling from the base block (the
  kickers themselves are removed by 10b-10e).

## Files

- `frontend/src/styles.css` - token block, `@font-face`, base block, block
  split
- `frontend/public/fonts/geist-variable-latin.woff2` - new
- `frontend/public/fonts/geist-mono-variable-latin.woff2` - new
- `frontend/public/fonts/licenses/geist-OFL.txt`, `geist-mono-OFL.txt` - new
- `frontend/public/fonts/fraunces-variable-latin.woff2`,
  `dm-sans-variable-latin.woff2`, `jetbrains-mono-latin.woff2` and their three
  licence files - removed
- `frontend/index.html` - only if it preloads a v1 font

## Acceptance

- [x] `grep -rn -e '--ground' -e '--aqua' -e '--coral' -e '--amber' -e Fraunces -e 'DM Sans' -e 'JetBrains Mono' frontend/src frontend/index.html`
      returns nothing (A16).
      Evidence: ran the exact command from the repo root after the token/font
      swap; exit status 1 (no match), zero output. `Overlay.tsx` also carried
      inline `var(--aqua)`/`var(--coral)`/`var(--ink)` references (not in this
      slice's file list, but caught by the same grep since it scans all of
      `frontend/src`); remapped them to `--pass`/`--fail`/`--text` here so the
      grep is genuinely clean rather than passing on a technicality. 10d's
      "Overlay.tsx - token colours only" line is therefore already satisfied.
- [x] every hex or `rgba(` colour in `styles.css` sits inside the token block;
      the PR pastes the grep that shows it.
      Evidence: `awk 'NR>64 && /#[0-9a-fA-F]{3,8}|rgba\(/' frontend/src/styles.css`
      (64 = last line of the `:root` token block) returns no output. Every
      other rule uses `var(--token)` or `color-mix(in srgb, var(--token) X%, transparent)`.
- [x] no `--pass`, `--run`, or `--fail` is used by a non-status element; the
      PR lists each remaining use and the state it signals.
      Evidence — every remaining use, by selector and the state it signals:
      - `--pass`: `.status-pill.online i` (server online), `.tag.ok` (complete),
        `td.pass` (pair verdict "accepted"). Overlay seam line/label (accepted
        geometry, the documented v1/overlay exception in section 2.1).
      - `--run`: `.status-pill.checking i`, `.status-pill.waking i` (connecting/
        waking), `.tag.busy` (running), `.stale-note` (produced with previous
        settings), `.step .glyph` and `.scanline span` (working in progress),
        `.cold-start-note` (still waking).
      - `--fail`: `.status-pill.offline i` (offline), `.tag.bad` (rejected),
        `.file.invalid`/`.file-error`/`.files-total.invalid`/`.selection-error`
        (invalid selection), `.file-remove:hover` (destructive/remove affordance
        on a control that deletes a row — kept from v1's identical convention),
        `.alert` block (rejected run). Overlay correspondence circles (sampled
        mismatches, the same documented exception).
      No non-status element uses these three tokens; decorative accents
      (`.empty-mark`, `.ribbon b` reassigned to `--muted`, dropzone icon
      reassigned to `--muted`/`--border`) were moved off `--aqua`/`--coral`/
      `--amber` precisely so this rule holds.
- [x] a production build served locally loads both fonts from the bundle, and
      the network panel shows no request to a font CDN (A16).
      Evidence: `make frontend-build`; `dist/assets/*.css` resolves to
      `url(/fonts/geist-variable-latin.woff2)` and
      `url(/fonts/geist-mono-variable-latin.woff2)`; `grep -c
      "fonts.googleapis\|fonts.gstatic" dist/assets/*.css dist/index.html`
      is 0 for both files; `dist/fonts/` contains both `.woff2` files and both
      `licenses/*-OFL.txt` files.
- [x] contrast ratios for `--text`, `--muted`, `--faint` on `--surface`,
      `--surface-2`, `--surface-3`, and `--accent-ink` on `--accent`, are
      recorded in the PR and all reach 4.5:1 (A14).
      Evidence (WCAG relative-luminance formula, computed directly from the
      hex values in the token block):
      | | `--surface` | `--surface-2` | `--surface-3` |
      | --- | --- | --- | --- |
      | `--text` | 17.02 | 16.28 | 15.11 |
      | `--muted` | 7.30 | 6.98 | 6.48 |
      | `--faint` | 5.12 | 4.89 | 4.54 |

      `--accent-ink` on `--accent`: 6.86. All ratios ≥ 4.5:1 (the tightest is
      `--faint` on `--surface-3` at 4.54).
- [x] Vitest, `make lint`, and `make frontend-build` green.
      Evidence: `make test` → 94 backend tests + 118 frontend tests passed;
      `make lint` → ruff clean; `frontend`'s own `npm run lint` (tsc -b) clean;
      `make frontend-build` → built in ~400ms with no errors.
- [x] screenshots of `Empty` and `Complete` in mock mode.
      Verified visually in-browser via `npm run dev:mock` at 1440px (Empty and
      Complete both render correctly in the new Graphite palette and Geist
      type, including the retokenized overlay); not persisted as image files
      in this environment, so no file path is recorded — see the final report's
      "not verified" note.

## Decisions

- `Overlay.tsx`'s inline `var(--aqua)`/`var(--coral)`/`var(--ink)` references
  were remapped in this slice (see A16 evidence above) rather than deferred to
  10d, because leaving them would either fail 10a's own A16 grep or ship a
  broken overlay (undefined CSS custom properties) between 10a and 10d. Per
  section 2.1's documented exception, seam lines/labels use `--pass` and
  sampled correspondences use `--fail`; the faint connecting line uses
  `--text`. 10d's file list still names `Overlay.tsx` for "token colours
  only" — that work is already done as of this commit.
- `--ground-lift` had no usages in the v1 stylesheet and is dropped rather
  than mapped to a new token.
- The `.scaffold` rule block (the removed scaffold state, docs/ui-spec.md
  section 8) was unused by any component and is deleted rather than
  retokenized.
- `.kicker` and the unused `.hero h1 em` rules are deleted per this slice's
  own instruction to remove kicker styling from the base block; the kicker
  `<span>` markup itself stays in `ControlRail`/`OutputCanvas`/`Diagnostics`
  until 10b-10e touch those files, per the parent plan.
- The v1 ghost button (`.cta.ghost`) and toggle/download affordances were
  retokenized without adopting 10c/10d's full visual redesign of those
  controls (e.g. the ghost button was previously coral-themed, which the
  absolute colour rule in section 2.1 no longer permits since it is not a
  status signal); the shape of these controls is still 10c/10d's to rebuild.
