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

## D-005: Input resolution is a per-request budget, not a fixed size

**Decision:** Every uploaded image is downscaled before feature extraction, to a
long edge derived from the image count and the output ceiling. Three frames get
1600 px, eight frames get 1085 px.

**Reason:** The canvas grows with the number of frames, so a fixed input size
that is safe for three images produces a canvas that fails the output ceiling
for eight. Deriving the budget keeps the advertised eight-image limit real, and
keeps a canvas rejection meaning "this alignment is wrong" rather than "you
uploaded too many photos".

**Tradeoff:** More frames buys a wider panorama at a lower resolution. The
interface publishes the table from `GET /api/v1/config` so the user learns this
before uploading. See `docs/backend-spec.md` section 5.2.

## D-006: One stitch at a time, and the deadline cannot cancel it

**Decision:** A semaphore admits one stitch; a second concurrent request gets
`SERVICE_BUSY` immediately rather than queueing. A deadline returns
`STITCH_TIMEOUT` to the client.

**Reason:** Render Free is one uvicorn worker on a fraction of a CPU. A queue
would turn a busy service into a slow one, and in a lecture hall an immediate
"busy, try again" beats a thirty-second wait for the same answer.

**Tradeoff:** Python cannot interrupt a running OpenCV call in a worker thread,
so the timed-out request keeps consuming CPU until its stage finishes. The
timeout protects the client's patience, not the server's CPU. The real defence
against a runaway request is the input budget in D-005. See
`docs/backend-spec.md` section 4.

## D-007: An oversized canvas is rejected, never shrunk

**Decision:** A composed canvas above `max_output_pixels` raises
`CANVAS_TOO_LARGE`. It is not scaled down to fit.

**Reason:** After D-005 the input budget already leaves 25 percent headroom for
a normal pan, so a canvas that still overflows means the geometry is wrong.
Shrinking it would deliver a distorted result that looks like a normal output,
which is exactly what standing rule 01 exists to prevent.

**Tradeoff:** A genuinely unusual but valid composition, such as a very steep
vertical pan, is rejected rather than delivered small. Retuning
`canvas_budget_fraction` is the response to that if it ever happens.
