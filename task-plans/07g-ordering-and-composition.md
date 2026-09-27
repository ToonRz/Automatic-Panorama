# Task 07g - ordering, reference frame, and transform composition

- Owner: Member A
- Reviewers: Member B, Member C
- Depends on: 07f
- Spec: `docs/backend-spec.md` sections 7.2, 3 gate 8

## Scope

Implement `cv/pipeline.py`: build the chain, choose the reference frame,
compose every pairwise transform into reference coordinates, and detect a frame
that cannot be reached. Owns `image_order` and `reference_index`.

v1 chains in upload order and takes the middle frame as the reference. That is
a decision, not a placeholder: upload order is capture order, and composing
outward from the middle halves the worst accumulated distortion. Automatic
ordering from the 07e overlap scores is a later change that must not alter the
response shape.

Assigned to member A because ordering decides from pairwise match scores, which
07e produces. `docs/contribution-plan.md` is updated by this slice.

## Acceptance

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request. Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run
36341167597: 106 Pytest tests green). Tests named below are in
`backend/app/tests/test_pipeline.py`.

- [x] `image_order` is published for every run and equals identity in v1;
      Evidence: `test_image_order_is_identity_in_v1`;
      `test_end_to_end.py::test_full_response_has_every_spec_section_7_field`.
- [x] `reference_index` equals `len(image_order) // 2`, with a test at two,
      three, and eight frames;
      Evidence: `test_reference_index_is_the_middle_frame`, parametrized at
      2, 3, and 8.
- [x] composed transforms carry a three-frame chain into one coordinate system
      within the corner-error bar in spec section 12.3;
      Evidence: `test_three_frame_chain_composes_within_the_corner_error_bar`.
- [x] a frame whose neighbouring pair was rejected raises
      `DISCONNECTED_IMAGES` naming that frame, rather than dropping it
      silently from the output;
      Evidence: `test_disconnected_frame_raises_disconnected_images_naming_it`,
      and since `0a18ebc`
      `test_disconnected_images_preserves_the_original_gate_7_cause`.
- [x] every per-pair array produced here has exactly `image_count - 1` entries,
      and index `i` describes the pair `(image_order[i], image_order[i + 1])`,
      asserted;
      Evidence: `test_per_pair_arrays_have_image_count_minus_one_entries_in_order`.
- [x] no stage math lives in this module; it calls 07e and 07f and composes;
      Evidence: `cv/pipeline.py` calls `match_descriptors` and
      `estimate_homography`; its only arithmetic is composing transforms
      (matrix products and inverses).
- [x] `docs/contribution-plan.md` names member A as the owner of
      `cv/pipeline.py`.
      Evidence: the "A - CV lead" row lists `cv/pipeline.py`.
