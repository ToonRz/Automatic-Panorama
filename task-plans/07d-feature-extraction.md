# Task 07d - feature extraction

- Owner: Member A
- Reviewers: Member B, Member E
- Depends on: 07a
- Spec: `docs/backend-spec.md` sections 3 gate 5, 7.1, 10

## Scope

Finish `cv/features.py`. The scaffold already extracts SIFT and ORB through one
interface; this slice moves `nfeatures` into settings, adds the gate 5
rejection, and covers both detectors against the fixtures.

Small by design. It exists as its own slice because gate 5 is a rejection path
the frontend has already written remedy text for, and because 07e must not
merge before the interface it consumes is fixed.

## Acceptance

Status: shipped with the pipeline in `06f90f5` directly on `main`, with no
pull request. Boxes checked on 2026-09-28 against `main` at `9ff021a` (CI run
36341167597: 106 Pytest tests green). Tests named below are in
`backend/app/tests/test_features.py` unless stated.

- [x] `nfeatures` reads `detector_nfeatures` from settings; no literal remains
      in `cv/features.py`;
      Evidence: `extract_features` takes `nfeatures` as an argument, and
      `services/stitcher.py` passes `settings.detector_nfeatures`.
- [x] an image producing no descriptors, or fewer than the detector needs,
      raises `NO_DESCRIPTORS` carrying `image`, `keypoints`, and `detector`;
      Evidence: `cv/features.py` raises `no_descriptors(...)`, whose context
      in `core/errors.py` is exactly those three keys.
- [x] the low-texture fixture triggers it for SIFT and for ORB;
      Evidence: `test_low_texture_frame_raises_no_descriptors_for_sift_and_orb`;
      `test_end_to_end.py::test_low_texture_frame_raises_no_descriptors_through_the_full_route`.
- [x] `FeatureSet` reports keypoint count for every image, matching what
      `keypoints_per_image` will publish;
      Evidence: `services/stitcher.py` builds `keypoints_per_image` from
      `feature_set.keypoint_count`.
- [x] SIFT returns float32 descriptors and ORB returns uint8, asserted, so the
      matcher in 07e can select its norm from the detector alone;
      Evidence: `test_sift_descriptors_are_float32_and_orb_are_uint8`.
- [x] the features stage records its own `stage_timings_ms` entry;
      Evidence: `_StageTimer(stage_timings_ms, "features")` in
      `services/stitcher.py`; the seven-key test in `test_end_to_end.py`.
- [x] a grayscale input and a three-channel input of the same scene produce the
      same keypoint count.
      Evidence: `test_grayscale_and_color_input_produce_the_same_keypoint_count`.
