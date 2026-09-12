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

- [ ] `nfeatures` reads `detector_nfeatures` from settings; no literal remains
      in `cv/features.py`;
- [ ] an image producing no descriptors, or fewer than the detector needs,
      raises `NO_DESCRIPTORS` carrying `image`, `keypoints`, and `detector`;
- [ ] the low-texture fixture triggers it for SIFT and for ORB;
- [ ] `FeatureSet` reports keypoint count for every image, matching what
      `keypoints_per_image` will publish;
- [ ] SIFT returns float32 descriptors and ORB returns uint8, asserted, so the
      matcher in 07e can select its norm from the detector alone;
- [ ] the features stage records its own `stage_timings_ms` entry;
- [ ] a grayscale input and a three-channel input of the same scene produce the
      same keypoint count.
