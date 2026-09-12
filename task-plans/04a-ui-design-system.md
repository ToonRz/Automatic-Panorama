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

- [ ] every token in the section 2 table is defined and used by name, with no
      raw hex left in components;
- [ ] Fraunces, DM Sans, and JetBrains Mono are served as latin-subset `woff2`
      from the bundle, with their OFL licence files committed, and no request
      leaves the origin for a font;
- [ ] every family has the fallback stack named in the spec;
- [ ] all numbers, codes, and uppercase labels render in the mono family with
      tabular figures;
- [ ] the layout stacks at 900px and the page never scrolls horizontally;
- [ ] focus is visible against the dark ground on every interactive element;
- [ ] `npm run lint` and `npm test` pass, and the existing smoke test still
      passes unchanged;
- [ ] screenshot evidence at desktop and at 900px.
