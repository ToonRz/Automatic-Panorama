# Task 07e - descriptor matching and the ratio test

- Owner: Member A
- Reviewers: Member B, Member E
- Depends on: 07d
- Spec: `docs/backend-spec.md` sections 3 gate 6, 7.1, 7.3, 10

## Scope

Finish `cv/matching.py` and add gate 6. The scaffold has KNN matching and the
ratio test; this slice adds the rejection floor, the per-pair diagnostics that
feed `ratio_passed_matches_per_pair` and `candidate_pair_count`, and the
pairwise score that 07g uses to pick a reference frame.

## Acceptance

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request. Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run
36341167597: 106 Pytest tests green). Tests named below are in
`backend/app/tests/test_matching.py` unless stated.

- [x] L2 for SIFT and Hamming for ORB, selected from the detector, with a test
      that fails if the pairing is swapped;
      Evidence: `test_norm_type_selects_l2_for_sift_and_hamming_for_orb`.
- [x] a pair below `min_ratio_passed_matches` raises `INSUFFICIENT_MATCHES`
      with `pair`, `pair_index`, `matches`, and `required`;
      Evidence: `test_pair_below_ratio_passed_floor_raises_insufficient_matches`
      asserts the whole context. The key named `required` here is
      `min_matches`, as in spec section 9.
- [x] `ratio_threshold` is read from the request, falling back to settings,
      never from a literal;
      Evidence: `api/routes.py` uses `settings.ratio_threshold` when the form
      field is absent; `services/stitcher.py` passes `options.ratio_threshold`.
- [x] the ratio test discards a KNN result with fewer than two neighbours
      rather than raising;
      Evidence: `test_ratio_test_discards_single_neighbour_results_without_raising`.
- [x] the repeated-texture fixture yields a visibly lower ratio-passed count
      than the ordinary pair at the same threshold, asserted numerically;
      Evidence: `test_repeated_texture_pair_yields_fewer_ratio_passed_matches_than_ordinary_pair`.
- [x] `candidate_pair_count` is produced as a scalar count of pairs entering
      RANSAC;
      Evidence: `services/stitcher.py` sets it to `len(chain.match_results)`.
- [x] a pairwise overlap score is exposed for 07g, documented as ratio-passed
      matches normalized by the smaller keypoint count;
      Evidence: `MatchResult.overlap_score` and the `match_descriptors`
      docstring in `cv/matching.py`.
- [x] the matching stage records its own `stage_timings_ms` entry.
      Evidence: `cv/pipeline.py` accumulates `"matching"` across pairs; the
      seven-key test in `test_end_to_end.py`.
