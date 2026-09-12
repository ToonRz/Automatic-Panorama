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

- [ ] `image_order` is published for every run and equals identity in v1;
- [ ] `reference_index` equals `len(image_order) // 2`, with a test at two,
      three, and eight frames;
- [ ] composed transforms carry a three-frame chain into one coordinate system
      within the corner-error bar in spec section 12.3;
- [ ] a frame whose neighbouring pair was rejected raises
      `DISCONNECTED_IMAGES` naming that frame, rather than dropping it
      silently from the output;
- [ ] every per-pair array produced here has exactly `image_count - 1` entries,
      and index `i` describes the pair `(image_order[i], image_order[i + 1])`,
      asserted;
- [ ] no stage math lives in this module; it calls 07e and 07f and composes;
- [ ] `docs/contribution-plan.md` names member A as the owner of
      `cv/pipeline.py`.
