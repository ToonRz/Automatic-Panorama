# Strict 10-minute demo script

Target runtime: **9:30**, leaving 30 seconds of safety margin. The assignment
penalizes videos longer than 10 minutes, so rehearse with a timer and do not
improvise extra slides.

| Time | Speaker | Content | Evidence |
| --- | --- | --- | --- |
| 0:00-0:45 | A | Problem, topic selection, and why panoramas need overlap | One-sentence goal and sample image set |
| 0:45-2:15 | A | SIFT/ORB keypoints and descriptor matching | Keypoint overlay and ratio-test counts |
| 2:15-3:45 | B | Homography, RANSAC, inliers, and geometric rejection | Inlier mask/plot and threshold explanation |
| 3:45-5:15 | B | Multi-image transforms, warp canvas, and blending | Three-image intermediate/result comparison |
| 5:15-6:45 | C | FastAPI contract, validation, and stateless backend | Swagger/health route and error response |
| 6:45-8:15 | D | Frontend upload flow and diagnostics UX | Public or local browser walkthrough |
| 8:15-9:00 | E | Deployment architecture and free-tier tradeoffs | Vercel + Render URLs, cold-start note |
| 9:00-9:30 | E | Bad-overlap edge case, contribution recap, closing | Clear error + five-member contribution table |

## Live run order

1. Open the deployed frontend before recording so the backend can wake up.
2. Use three custom overlapping images, not only a prepared final screenshot.
3. Show SIFT and the diagnostics panel; mention ORB as the comparison path.
4. Point out ratio-passed matches, RANSAC inliers, and output dimensions.
5. Refresh with two non-overlapping images and show the actionable failure.
6. State that uploaded images are processed in memory and not retained.
7. Close with one concrete contribution from each member.

## Rehearsal checklist

- [ ] Timer starts before the first spoken word.
- [ ] Each member speaks at least once and owns the evidence they explain.
- [ ] Public URL, health endpoint, and sample images are ready.
- [ ] Browser permissions/network are tested on the recording machine.
- [ ] Cold start is either warmed up or explained in one sentence.
- [ ] No private files, credentials, or unlicensed images appear on screen.
- [ ] The exported video is verified at `<= 10:00`.
