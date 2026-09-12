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

- [ ] L2 for SIFT and Hamming for ORB, selected from the detector, with a test
      that fails if the pairing is swapped;
- [ ] a pair below `min_ratio_passed_matches` raises `INSUFFICIENT_MATCHES`
      with `pair`, `pair_index`, `matches`, and `required`;
- [ ] `ratio_threshold` is read from the request, falling back to settings,
      never from a literal;
- [ ] the ratio test discards a KNN result with fewer than two neighbours
      rather than raising;
- [ ] the repeated-texture fixture yields a visibly lower ratio-passed count
      than the ordinary pair at the same threshold, asserted numerically;
- [ ] `candidate_pair_count` is produced as a scalar count of pairs entering
      RANSAC;
- [ ] a pairwise overlap score is exposed for 07g, documented as ratio-passed
      matches normalized by the smaller keypoint count;
- [ ] the matching stage records its own `stage_timings_ms` entry.
