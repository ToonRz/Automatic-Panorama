# CP461 assignment alignment

Source reviewed: `CP461-Homeworks.pdf`, pages 2-4, titled “Practical
Application of SIFT, Feature Matching & Homography”, CP461 Introduction to
Computer Vision, Semester 1/2026.

## Non-negotiable constraints

| Assignment requirement | Project response | Evidence location |
| --- | --- | --- |
| Exactly five members | Five named ownership slices with one visible deliverable and demo segment per member | `docs/contribution-plan.md`, `docs/demo-script.md` |
| End-to-end Computer Vision pipeline | Browser upload -> FastAPI validation -> OpenCV pipeline -> panorama + diagnostics -> browser result | `docs/architecture.md`, `docs/api-contract.md` |
| Keypoint extraction | SIFT default, ORB fallback through one detector interface | `docs/cv-pipeline.md`, `backend/app/cv/features.py` |
| Feature matching | KNN matching with detector-appropriate distance and Lowe ratio test | `docs/cv-pipeline.md`, `backend/app/cv/matching.py` |
| Geometric transformation | Homography estimated with RANSAC; inliers and reprojection error reported | `docs/cv-pipeline.md`, `backend/app/cv/homography.py` |
| Automatic Panorama Stitcher topic | Multiple overlapping images, multi-image transforms, warping, and seamless blending | `docs/cv-pipeline.md`, `docs/roadmap.md` |
| Tier 3 public app | Vercel frontend + public Render Free backend | `docs/deployment-plan.md`, `render.yaml`, `frontend/vercel.json` |
| Clean repo and reproducibility | Root `requirements.txt`, environment examples, quick start, CI, tests | `README.md`, `.env.example`, `.github/workflows/ci.yml` |
| Strict 10-minute demo | Timed five-speaker script with an edge case and live URL | `docs/demo-script.md` |

## Rubric-driven acceptance targets

### Algorithmic correctness and robustness - 4 points

The final implementation must show the actual detector, ratio threshold,
RANSAC threshold, match/inlier counts, and a failure message for at least one
bad-overlap case. A panorama that looks plausible but has no diagnostics is not
enough evidence.

### Engineering and UI - 3 points

The UI must accept multiple images, show processing state, display the output,
and surface a useful error. The source must be separated into frontend, API,
CV, tests, and deployment concerns. A public URL is required to be eligible
for the full engineering score.

### Presentation and demo - 3 points

The recording must be no longer than 10 minutes, explain technical decisions,
show custom test images and an edge case, and give all five members a named
speaking segment. The script in `docs/demo-script.md` budgets 9:30 plus a 30
second safety margin.

## Submission checklist

- [ ] Public frontend URL opens without credentials.
- [ ] Backend health endpoint is reachable from the public frontend origin.
- [ ] `requirements.txt` and README instructions work from a fresh clone.
- [ ] CI is green on the submission commit.
- [ ] At least two overlapping images create a panorama.
- [ ] Three or more images work in the demo path.
- [ ] SIFT and ORB are both selectable or the chosen fallback is documented.
- [ ] Ratio-test and RANSAC diagnostics are visible in the result UI or demo.
- [ ] A no-overlap/too-few-feature case returns a clear error.
- [ ] Video duration is checked before upload and is <= 10:00.
- [ ] Contribution log identifies one merged PR and one demo segment per member.
