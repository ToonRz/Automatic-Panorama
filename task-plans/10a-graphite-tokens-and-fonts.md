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

- [ ] `grep -rn -e '--ground' -e '--aqua' -e '--coral' -e '--amber' -e Fraunces -e 'DM Sans' -e 'JetBrains Mono' frontend/src frontend/index.html`
      returns nothing (A16);
- [ ] every hex or `rgba(` colour in `styles.css` sits inside the token block;
      the PR pastes the grep that shows it;
- [ ] no `--pass`, `--run`, or `--fail` is used by a non-status element; the
      PR lists each remaining use and the state it signals;
- [ ] a production build served locally loads both fonts from the bundle, and
      the network panel shows no request to a font CDN (A16);
- [ ] contrast ratios for `--text`, `--muted`, `--faint` on `--surface`,
      `--surface-2`, `--surface-3`, and `--accent-ink` on `--accent`, are
      recorded in the PR and all reach 4.5:1 (A14);
- [ ] Vitest, `make lint`, and `make frontend-build` green;
- [ ] screenshots of `Empty` and `Complete` in mock mode.
