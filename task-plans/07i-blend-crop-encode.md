# Task 07i - blending, crop, encode, and sampled correspondences

- Owner: Member B
- Reviewers: Member A, Member E
- Depends on: 07h
- Spec: `docs/backend-spec.md` sections 3 gate 9, 7.4, 8, 11

## Scope

Implement `cv/blending.py`: feather the overlap between valid masks, compensate
simple exposure differences, crop empty borders, and encode PNG. Also project
the sampled inlier correspondences onto the output canvas for the overlay.

Feather blending is the committed strategy. Multiband is a later change and is
not started before the pairwise alignment in 07f is passing its bar.

## Acceptance

- [ ] feather weights are computed from the valid masks and blended in float
      space before conversion back to 8-bit;
- [ ] no black border wider than 2 px remains on any edge of the real
      end-to-end fixture;
- [ ] the border crop is derived from the combined valid mask, not from a fixed
      inset;
- [ ] output is PNG only; no JPEG path is added;
- [ ] a seam comparison image, feathered against a hard paste, is attached to
      the pull request;
- [ ] `sample_correspondences_per_pair` contains at most 12 entries per pair,
      in output-canvas coordinates, drawn from the inlier set;
- [ ] a docstring states that the sample is an illustration and its length is
      never a measurement;
- [ ] a deliberately misaligned fixture is not rescued by the blend; the
      misalignment stays visible, per standing rule 01;
- [ ] blend and encode each record their own `stage_timings_ms` entry.
