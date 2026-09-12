# Decision log

## D-001: Classical OpenCV pipeline first

**Decision:** Use SIFT/ORB, descriptor matching, Homography/RANSAC, perspective
warping, and mask-based blending as the v1 method.

**Reason:** These are the assignment's required methods and make the demo
explainable. Learned panorama models would add weights, hardware, and licensing
risks without improving rubric coverage.

## D-002: React/Vite frontend on Vercel, FastAPI/OpenCV backend on Render

**Decision:** Split static delivery from CV execution.

**Reason:** Vercel is a strong free frontend host; Render Free can run the
Python/OpenCV service as a conventional Python process. The boundary avoids
forcing image payloads and native dependencies through a Vercel Function.

**Tradeoff:** Render sleeps and uses ephemeral storage. The stateless request
design makes that acceptable for a course demo.

## D-003: No persistence in v1

**Decision:** Return the result directly and discard uploaded bytes.

**Reason:** The assignment evaluates the algorithm and public UX, not accounts,
history, or storage. Avoiding persistence lowers privacy and hosting risk.

## D-004: Honest scaffold response

**Decision:** Return `501 PIPELINE_NOT_IMPLEMENTED` until the CV implementation
has tests.

**Reason:** A runnable shell is useful for parallel work, but the repository must
not imply that the core algorithm is complete before it exists.
