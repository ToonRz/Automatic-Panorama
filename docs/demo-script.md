# Strict 10-minute demo script

Target runtime: **9:30**, leaving 30 seconds of safety margin. The assignment
penalizes videos longer than 10 minutes, so rehearse with a timer and do not
improvise extra slides.

| Time | Speaker | Content | Evidence |
| --- | --- | --- | --- |
| 0:00-0:45 | A | Problem, topic selection, and why panoramas need overlap | One-sentence goal and sample image set |
| 0:45-2:15 | A | SIFT/ORB keypoints and descriptor matching | Feature survival funnel and ratio-test counts |
| 2:15-3:45 | B | Homography, RANSAC, inliers, and geometric rejection | Inlier mask/plot and threshold explanation |
| 3:45-5:15 | B | Multi-image transforms, warp canvas, and blending | Three-image intermediate/result comparison |
| 5:15-6:45 | C | FastAPI contract, validation, and stateless backend | Swagger/health route and error response |
| 6:45-8:15 | D | Frontend upload flow and diagnostics UX | Public or local browser walkthrough |
| 8:15-9:00 | E | Deployment architecture and free-tier tradeoffs | Vercel + Render URLs, cold-start note |
| 9:00-9:30 | E | Bad-overlap edge case, contribution recap, closing | Clear error + five-member contribution table |

## Live run order

1. Open the deployed frontend before recording so the backend can wake up.
   The intro cover's server line reads `SERVER LIVE · Ready to stitch` once
   it has; enter only then.
2. Use three custom overlapping images, not only a prepared final screenshot.
   If the custom set is not ready, use "Try a sample → Stitches → Harbour
   boats" instead, which loads without picking files. Settle the licence
   question in "Demo image sources and licences" below first.
3. Show SIFT and the diagnostics panel; mention ORB as the comparison path.
4. Point out ratio-passed matches, RANSAC inliers, and output dimensions. The
   survival funnel shows the drop from keypoints to ratio-passed matches to
   inliers in one picture.
5. Start a new panorama, load "Try a sample → Known failures → Unrelated
   photos", and show the actionable failure (`INSUFFICIENT_MATCHES`). To show
   a RANSAC rejection instead, switch to ORB and load "Repeating pattern"
   (`INSUFFICIENT_INLIERS`).
6. State that uploaded images are processed in memory and not retained.
7. Close with one concrete contribution from each member.

## Test fixtures and the section 12.2 real-photo gap

`docs/backend-spec.md` section 12.2 calls for one small set of real,
downscaled photographs with a recorded licence, used for the end-to-end test
and this demo. The build environment that implemented `task-plans/07a`
through `07j` had no way to source and license real photography, so
`backend/app/tests/fixtures.py::end_to_end_fixture` is a synthetic stand-in
instead: a textured plane warped by a known homography, with an injected
per-frame exposure gain so the blend stage has something real to compensate.
This is a stated substitution, not a silent one -- it satisfies the
acceptance table's numeric bars (section 12.3) but is not a photograph.

The backend test is still synthetic. The demo no longer depends on it: the
sample gallery (`docs/ui-spec.md` section 3.3) ships three real photo sets and
three generated failure sets as frontend static assets.

## Demo image sources and licences

Every file under `frontend/public/sample_images/`, checked on 2026-09-28.

### Photo sets: OpenCV stitching test data

| Set | Files | Size | Dimensions |
| --- | --- | --- | --- |
| `boat` | `boat1.jpg`-`boat3.jpg` | 2,103,211 bytes | 3888 × 2592 |
| `budapest` | `budapest1.jpg`-`budapest3.jpg` | 905,857 bytes | 1142 × 806 |
| `newspaper` | `newspaper1.jpg`-`newspaper3.jpg` | 1,111,538 bytes | 818 × 1125 |

- **Source.** [`opencv/opencv_extra`, `testdata/stitching/`](https://github.com/opencv/opencv_extra/tree/5.x/testdata/stitching).
  All nine files are byte-identical to the upstream ones on the default
  branch, `5.x`: each file's git blob SHA (`git hash-object`) equals the SHA
  the GitHub contents API reports for the file of the same name. The `boat` set entered upstream in `4714c7c7d9`
  ("stitching: add boat dataset", 2014-03-12). `budapest` and `newspaper`
  entered in `915365acee` (merge of opencv_extra PR #303, 2016-10-22).
- **Committed here in** `97abac9` ("Example Recommended", 2026-09-17).
- **Licence: not stated upstream.** `opencv_extra` has no `LICENSE` file, and
  its README names no licence. The files are published openly as test data
  for OpenCV's own stitching tests, but publication is not a licence grant,
  and nothing records who took the photographs.

**Open decision before recording (rehearsal checklist, last-but-one item).**
Choose one and record it here:

1. keep the three sets and credit "OpenCV `opencv_extra` test data" on
   screen, accepting that the licence is unstated;
2. replace them with frames shot by a team member, recorded here with the
   shooter's name; or
3. replace them with a set under an explicit reuse licence, recorded here
   with its URL and licence.

The sets are frontend demo assets, not the backend's end-to-end fixture, so
the 400 KB ceiling in `task-plans/07a` does not apply. The browser downsizes
each frame before upload (`docs/integration-spec.md` section 6).

### Failure sets: generated

| Set | Files | Size | Content |
| --- | --- | --- | --- |
| `unrelated` | `unrelated1.jpg`, `unrelated2.jpg` | 45,923 bytes | a cartoon cat and a cartoon car: no shared scene |
| `blank_sky` | `blank_sky1.jpg`, `blank_sky2.jpg` | 22,321 bytes | a flat blue sky with a faint gradient, and a plain off-white wall with faint noise |
| `repeating` | `repeating1.jpg`, `repeating2.jpg` | 187,597 bytes | brick patterns in which every patch looks alike |

All six are 800 × 600 and drawn with Pillow by
`scripts/generate_unsupported_samples.py`, which was committed together with
them in `dc521ee` ("add unsupport case"). No third-party content is involved.
To regenerate the sets, run `python scripts/generate_unsupported_samples.py`
after `make install` (Pillow is in `requirements.txt`). The script finds the
repository from its own location and overwrites
`frontend/public/sample_images/{unrelated,blank_sky,repeating}/`. JPEG output
can vary between Pillow versions, so a regenerated file may not be
byte-identical to the committed one. This check did not re-run the script.

## Rehearsal checklist

- [ ] Timer starts before the first spoken word.
- [ ] Each member speaks at least once and owns the evidence they explain.
- [ ] Public URL, health endpoint, and sample images are ready.
- [ ] Browser permissions/network are tested on the recording machine.
- [ ] Cold start is either warmed up or explained in one sentence.
- [ ] No private files, credentials, or unlicensed images appear on screen.
- [ ] The exported video is verified at `<= 10:00`.
