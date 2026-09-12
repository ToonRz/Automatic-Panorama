"""Synthetic fixtures for the CV pipeline test suite.

Every fixture is generated at test time from an integer seed; nothing here is
committed as a binary image. A textured "world" plane is built with numpy and
OpenCV drawing primitives, then two or more frames are produced by sampling
that world through known homographies with :func:`cv2.warpPerspective`. Because
every frame is a warp of the same world, the relative homography between any
two frames is known exactly, so tests can assert distance from ground truth
rather than only the absence of a crash (spec section 12.1).

Assumption, stated per repository instructions rather than silently
substituted: spec section 12.2 calls for one small set of *real* photographs
with a recorded licence. This build environment has no way to source and
license real photography, so :func:`end_to_end_fixture` is a synthetic stand-in
with injected exposure and gain differences instead. `docs/demo-script.md`
records this substitution; replace it with real, licensed photographs before
the demo.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


def _translation(dx: float, dy: float) -> np.ndarray:
    """Return the homogeneous matrix translating by (dx, dy)."""

    return np.array([[1.0, 0.0, dx], [0.0, 1.0, dy], [0.0, 0.0, 1.0]], dtype=np.float64)


def _motion(
    tx: float,
    ty: float,
    angle_deg: float = 0.0,
    scale: float = 1.0,
    perspective: tuple[float, float] = (0.0, 0.0),
) -> np.ndarray:
    """Build a homography representing a small camera pan/rotate/perspective pull."""

    theta = np.radians(angle_deg)
    cos_t, sin_t = np.cos(theta), np.sin(theta)
    return np.array(
        [
            [scale * cos_t, -scale * sin_t, tx],
            [scale * sin_t, scale * cos_t, ty],
            [perspective[0], perspective[1], 1.0],
        ],
        dtype=np.float64,
    )


def _textured_world(seed: int, width: int, height: int) -> np.ndarray:
    """Build a deterministic, richly textured BGR plane for keypoint-rich fixtures.

    Random shapes give SIFT/ORB reliable corners and blobs to lock onto; fine
    speckle keeps flat regions from going featureless. Everything is derived
    from ``seed`` via :func:`numpy.random.default_rng`, so the same seed
    reproduces byte-identical output on every rerun.
    """

    rng = np.random.default_rng(seed)
    base = rng.integers(150, 210)
    world = np.full((height, width, 3), base, dtype=np.uint8)

    for _ in range(260):
        color = tuple(int(c) for c in rng.integers(0, 255, size=3))
        kind = int(rng.integers(0, 3))
        if kind == 0:
            pt1 = (int(rng.integers(0, width)), int(rng.integers(0, height)))
            side = int(rng.integers(15, 70))
            pt2 = (min(width - 1, pt1[0] + side), min(height - 1, pt1[1] + side))
            cv2.rectangle(world, pt1, pt2, color, thickness=-1)
        elif kind == 1:
            center = (int(rng.integers(0, width)), int(rng.integers(0, height)))
            radius = int(rng.integers(8, 40))
            cv2.circle(world, center, radius, color, thickness=-1)
        else:
            pt1 = (int(rng.integers(0, width)), int(rng.integers(0, height)))
            pt2 = (int(rng.integers(0, width)), int(rng.integers(0, height)))
            cv2.line(world, pt1, pt2, color, thickness=int(rng.integers(1, 4)))

    speckle = rng.integers(-14, 14, size=(height, width, 3), dtype=np.int16)
    world = np.clip(world.astype(np.int16) + speckle, 0, 255).astype(np.uint8)
    return world


@dataclass(frozen=True)
class PairFixture:
    """Two frames and the ground-truth homography mapping frame_a -> frame_b.

    ``homography_ab`` is ``None`` when the two frames share no real geometric
    relationship (the non-overlapping fixture), because publishing a matrix
    for a transform that does not exist would be a fabricated ground truth.
    """

    frame_a: np.ndarray
    frame_b: np.ndarray
    homography_ab: np.ndarray | None


@dataclass(frozen=True)
class ChainFixture:
    """A chain of frames plus the ground-truth homography between each adjacent pair."""

    frames: tuple[np.ndarray, ...]
    pairwise_homographies: tuple[np.ndarray, ...]


def overlapping_pair(
    seed: int = 0,
    size: tuple[int, int] = (900, 640),
    angle_deg: float = 5.0,
    tx_fraction: float = 0.35,
    ty_fraction: float = 0.05,
    world_margin: int = 420,
) -> PairFixture:
    """A two-frame overlapping pair with a known, mildly rotated homography."""

    width, height = size
    world = _textured_world(seed, width + 2 * world_margin, height + 2 * world_margin)
    m_a = _translation(-world_margin, -world_margin)
    h_ab = _motion(tx=width * tx_fraction, ty=height * ty_fraction, angle_deg=angle_deg)
    m_b = h_ab @ m_a

    frame_a = cv2.warpPerspective(world, m_a, (width, height))
    frame_b = cv2.warpPerspective(world, m_b, (width, height))
    return PairFixture(frame_a=frame_a, frame_b=frame_b, homography_ab=h_ab)


def non_overlapping_pair(seed: int = 0, size: tuple[int, int] = (800, 600)) -> PairFixture:
    """Two frames drawn from independent worlds; no true correspondence exists."""

    width, height = size
    frame_a = _textured_world(seed, width, height)
    frame_b = _textured_world(seed + 9_973, width, height)
    return PairFixture(frame_a=frame_a, frame_b=frame_b, homography_ab=None)


def low_texture_frame(seed: int = 0, size: tuple[int, int] = (800, 600)) -> np.ndarray:
    """A near-flat frame with imperceptible noise; must trigger NO_DESCRIPTORS."""

    rng = np.random.default_rng(seed)
    base = int(rng.integers(90, 160))
    width, height = size
    frame = np.full((height, width, 3), base, dtype=np.uint8)
    noise = rng.integers(-1, 2, size=(height, width, 3), dtype=np.int16)
    return np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)


def repeated_texture_pair(
    seed: int = 0,
    size: tuple[int, int] = (800, 600),
    tile: int = 40,
) -> PairFixture:
    """A self-similar checkerboard pair that produces many ambiguous matches."""

    width, height = size
    tile_img = np.zeros((tile, tile, 3), dtype=np.uint8)
    cv2.rectangle(tile_img, (4, 4), (tile - 4, tile - 4), (220, 220, 220), -1)
    cv2.circle(tile_img, (tile // 2, tile // 2), max(2, tile // 4), (60, 60, 60), -1)
    reps_y = height // tile + 2
    reps_x = width // tile + 2
    checker = np.tile(tile_img, (reps_y, reps_x, 1))

    shift = tile // 2
    frame_a = checker[0:height, 0:width].copy()
    frame_b = checker[0:height, shift : shift + width].copy()
    return PairFixture(frame_a=frame_a, frame_b=frame_b, homography_ab=_translation(-shift, 0.0))


def three_frame_chain(
    seed: int = 0,
    size: tuple[int, int] = (760, 540),
    angle_deg: float = 4.0,
    tx_fraction: float = 0.35,
    ty_fraction: float = 0.03,
    world_margin: int = 620,
) -> ChainFixture:
    """A three-frame chain, each adjacent pair related by a known homography."""

    width, height = size
    world = _textured_world(seed, width + 2 * world_margin, height + 2 * world_margin)
    m0 = _translation(-world_margin, -world_margin)
    h01 = _motion(tx=width * tx_fraction, ty=height * ty_fraction, angle_deg=angle_deg)
    h12 = _motion(tx=width * tx_fraction, ty=-height * ty_fraction, angle_deg=-angle_deg)
    m1 = h01 @ m0
    m2 = h12 @ m1

    frame0 = cv2.warpPerspective(world, m0, (width, height))
    frame1 = cv2.warpPerspective(world, m1, (width, height))
    frame2 = cv2.warpPerspective(world, m2, (width, height))
    return ChainFixture(frames=(frame0, frame1, frame2), pairwise_homographies=(h01, h12))


def mixed_orientation_chain(
    seed: int = 0,
    landscape_size: tuple[int, int] = (760, 540),
    portrait_size: tuple[int, int] = (420, 700),
    angle_deg: float = 3.0,
    tx_fraction: float = 0.3,
    world_margin: int = 620,
) -> ChainFixture:
    """A three-frame chain with one portrait frame among landscape neighbours."""

    lw, lh = landscape_size
    pw, ph = portrait_size
    world = _textured_world(seed, lw + 2 * world_margin, lh + 2 * world_margin)

    m0 = _translation(-world_margin, -world_margin)
    h01 = _motion(tx=lw * tx_fraction, ty=0.0, angle_deg=angle_deg)
    h12 = _motion(tx=lw * tx_fraction, ty=0.0, angle_deg=-angle_deg)
    m1 = h01 @ m0
    m2 = h12 @ m1

    frame0 = cv2.warpPerspective(world, m0, (lw, lh))
    # Re-centre the portrait crop (world -> portrait-frame1) so it still
    # overlaps both neighbours; m1_portrait = recentre @ m1.
    recentre = _translation((pw - lw) / 2, (ph - lh) / 2)
    frame1 = cv2.warpPerspective(world, recentre @ m1, (pw, ph))
    frame2 = cv2.warpPerspective(world, m2, (lw, lh))

    # h01 = m1 @ m0^-1 by construction, so frame0 -> portrait-frame1 is
    # recentre @ h01. h12 = m2 @ m1^-1, so portrait-frame1 -> frame2 is
    # h12 @ recentre^-1 (undoing the recentre before applying the original
    # frame1 -> frame2 motion).
    h01_portrait = recentre @ h01
    h12_from_portrait = h12 @ np.linalg.inv(recentre)
    return ChainFixture(
        frames=(frame0, frame1, frame2),
        pairwise_homographies=(h01_portrait, h12_from_portrait),
    )


def oversized_canvas_transforms(
    image_size: tuple[int, int] = (1200, 900),
) -> tuple[list[tuple[int, int]], list[np.ndarray]]:
    """Image sizes and transforms whose union canvas is deliberately huge.

    Used directly against ``cv/warping.py`` so the canvas-bounds gate can be
    tested without needing a realistic feature-matched pair: the warp stage
    only consumes sizes and transforms, never raw correspondences.
    """

    width, height = image_size
    identity = np.eye(3, dtype=np.float64)
    huge_pan = _motion(tx=width * 6.0, ty=height * 4.5, angle_deg=0.0, scale=1.0)
    return [image_size, image_size], [identity, huge_pan]


def end_to_end_fixture(seed: int = 0) -> ChainFixture:
    """A three-frame, photo-like synthetic set for the end-to-end acceptance test.

    See the module docstring: this stands in for the real, licensed photograph
    set spec section 12.2 calls for, with an injected exposure gain difference
    between frames so the blend stage has something to compensate.
    """

    chain = three_frame_chain(
        seed=seed,
        size=(900, 640),
        angle_deg=2.5,
        tx_fraction=0.32,
        ty_fraction=0.02,
        world_margin=700,
    )
    gains = (1.0, 1.12, 0.92)
    graded = tuple(
        np.clip(frame.astype(np.float32) * gain, 0, 255).astype(np.uint8)
        for frame, gain in zip(chain.frames, gains, strict=True)
    )
    return ChainFixture(frames=graded, pairwise_homographies=chain.pairwise_homographies)


def render_match_visualization(
    frame_a: np.ndarray,
    frame_b: np.ndarray,
    keypoints_a: tuple[cv2.KeyPoint, ...],
    keypoints_b: tuple[cv2.KeyPoint, ...],
    matches: tuple[cv2.DMatch, ...],
    path: str,
) -> None:
    """Render a match/inlier visualization for attaching to a pull request.

    Never called during a CI assertion; it exists so a contributor can produce
    evidence images locally, e.g. ``render_match_visualization(..., "/tmp/matches.png")``.
    """

    canvas = cv2.drawMatches(
        frame_a,
        list(keypoints_a),
        frame_b,
        list(keypoints_b),
        list(matches),
        None,
        flags=cv2.DRAW_MATCHES_FLAGS_NOT_DRAW_SINGLE_POINTS,
    )
    cv2.imwrite(path, canvas)
