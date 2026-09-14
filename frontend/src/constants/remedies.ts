import { FALLBACK_CONFIG } from "./config";
import type { ApiErrorDetail, ClientConfig } from "../types";
import { frameLabel, pairLabel } from "../utils/frameLabel";

/**
 * Remedy text keyed by backend error code (docs/ui-spec.md section 7.1,
 * docs/backend-spec.md section 9). These are language and product guidance,
 * not measurement, so they live here and can be reworded without a backend
 * change.
 */
export const GENERIC_REMEDY: readonly string[] = [
  "Try again. If it keeps happening, try different photos or fewer frames.",
];

export const REMEDY_BY_CODE: Readonly<Record<string, readonly string[]>> = {
  TOO_FEW_IMAGES: ["Add at least two frames that overlap."],
  TOO_MANY_IMAGES: ["Remove frames until eight or fewer remain."],
  INVALID_STITCH_SETTINGS: ["Reset the detector and thresholds to defaults."],
  UNSUPPORTED_IMAGE_TYPE: ["Convert the file to JPG or PNG and retry."],
  EMPTY_IMAGE: ["The named file has no bytes; re-export it."],
  IMAGE_TOO_LARGE: ["Downscale the named file below the stated limit."],
  TOTAL_UPLOAD_TOO_LARGE: [
    "The whole upload is over the request limit.",
    "Remove a frame or downscale before uploading.",
  ],
  SERVICE_BUSY: [
    "Another panorama is being stitched.",
    "The button unlocks when it's safe to try again.",
  ],
  STITCH_TIMEOUT: [
    "The run passed the time limit.",
    "Retry with fewer frames, or switch to ORB for a faster pass.",
  ],
  DECODE_FAILED: [
    "The named file is not readable as an image despite its extension.",
    "Re-export it as JPG or PNG.",
  ],
  IMAGE_TOO_MANY_PIXELS: [
    "The named frame is over the processing limit.",
    "Downscale it before uploading.",
  ],
  NO_DESCRIPTORS: [
    "The named frame has too little texture.",
    "Try ORB, or re-shoot with more detail in view.",
  ],
  INSUFFICIENT_MATCHES: [
    "The named pair barely shares any detail.",
    "Raise the ratio test toward 0.85, or re-shoot with more overlap.",
  ],
  // INSUFFICIENT_INLIERS, EXCESSIVE_REPROJECTION_ERROR, DEGENERATE_HOMOGRAPHY,
  // and DISCONNECTED_IMAGES are handled by the dynamic functions below: which
  // specific condition failed changes what is actually worth trying, so a
  // single blanket list for each code would recommend the same fix (raise the
  // ratio test, lower RANSAC, try ORB) whether or not it addresses what was
  // actually measured. These four entries are the fallback used only when the
  // context needed to be specific is missing (an old response, say).
  INSUFFICIENT_INLIERS: ["Re-shoot the named pair with more overlap between the two frames."],
  EXCESSIVE_REPROJECTION_ERROR: [
    "The named pair aligns loosely across the whole frame.",
    "Re-shoot holding the camera steadier, with less rotation between frames.",
  ],
  DEGENERATE_HOMOGRAPHY: [
    "The named pair produced an unusable transform.",
    "Re-shoot with more overlap spread across the whole frame, not just one area.",
  ],
  DISCONNECTED_IMAGES: [
    "The named frame could not be linked to its neighbour.",
    "Remove it or add a bridging frame.",
  ],
  CANVAS_TOO_LARGE: [
    "The frames did not line up into a sensible shape.",
    "Check that they are one continuous pan and re-shoot the odd frame.",
  ],
  // Client-reachable codes (docs/integration-spec.md section 7.2), raised by
  // the client itself rather than the pipeline.
  UNEXPECTED_ERROR: [
    "Something went wrong on the server.",
    "Try again; if it repeats, try ORB or fewer frames.",
  ],
  NETWORK_ERROR: ["The connection dropped. Check your internet connection and try again."],
  SERVER_UNREACHABLE: [
    "The server isn't reachable yet. Wait for \"Server online\", then try again.",
  ],
  UPSTREAM_UNAVAILABLE: ["The server is starting up. Wait a moment and try again."],
  UNKNOWN_ERROR: ["The server sent an unexpected response. Try again."],
  REQUEST_TIMEOUT: [
    "The server took too long to answer.",
    "Try again with fewer frames, or switch to ORB.",
  ],
};

/**
 * Static per-code heading fragment, combined with any image/pair the
 * `context` names (docs/backend-spec.md section 9: indices are zero-based,
 * the interface counts frames the way a person does).
 */
export const HEADING_BY_CODE: Readonly<Record<string, string>> = {
  TOO_FEW_IMAGES: "Not enough frames",
  TOO_MANY_IMAGES: "Too many frames",
  INVALID_STITCH_SETTINGS: "Settings out of range",
  UNSUPPORTED_IMAGE_TYPE: "is not a supported file type",
  EMPTY_IMAGE: "has no bytes",
  IMAGE_TOO_LARGE: "is too large",
  TOTAL_UPLOAD_TOO_LARGE: "The upload is too large",
  SERVICE_BUSY: "The service is busy",
  STITCH_TIMEOUT: "Stitching timed out",
  DECODE_FAILED: "could not be read as an image",
  IMAGE_TOO_MANY_PIXELS: "is above the processing limit",
  NO_DESCRIPTORS: "has too little texture",
  INSUFFICIENT_MATCHES: "share too few matches",
  INSUFFICIENT_INLIERS: "do not agree",
  EXCESSIVE_REPROJECTION_ERROR: "aligned, but only loosely",
  DEGENERATE_HOMOGRAPHY: "produced an unusable transform",
  DISCONNECTED_IMAGES: "shares no view with the others",
  CANVAS_TOO_LARGE: "The combined canvas is too large",
};

export const GENERIC_HEADING = "Could not stitch these frames";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

/**
 * `failed_checks` names every one of `min_inliers`/`min_inlier_ratio` this
 * pair missed (docs/backend-spec.md section 9.1): each is a different
 * underlying problem (too few points found in common vs. the points found
 * disagreeing with each other), so each gets its own remedy rather than one
 * blanket line that only fits one of the two.
 */
function insufficientInliersRemedies(context: Record<string, unknown> | undefined): string[] {
  const failedChecks = context ? context.failed_checks : undefined;
  const checks = isStringArray(failedChecks) ? failedChecks : [];
  const remedies: string[] = [];
  if (checks.includes("min_inliers")) {
    remedies.push("Too few points agreed on one geometry — re-shoot with more overlap (30-50%).");
  }
  if (checks.includes("min_inlier_ratio")) {
    remedies.push(
      "Most candidate matches disagreed with each other. This usually means the frames " +
        "share little true overlap, or contain a repeating pattern (tiles, foliage, a grid) " +
        "that produces confident but wrong matches.",
    );
  }
  if (remedies.length === 0) {
    remedies.push(...REMEDY_BY_CODE.INSUFFICIENT_INLIERS);
  }
  return remedies;
}

const DEGENERATE_REASON_REMEDIES: Readonly<Record<string, readonly string[]>> = {
  non_convex_quad: [
    "The estimated transform folds the frame onto itself — usually too much camera " +
      "rotation or zoom between shots.",
    "Re-shoot with less rotation or zoom change between these two frames.",
  ],
  excessive_scale: [
    "The estimated transform scales the frame implausibly — usually a mismatched pair or " +
      "a huge difference in distance to the subject.",
    "Check these are adjacent frames of the same pan, shot from about the same distance.",
  ],
  singular: [
    "The matched points did not spread out enough to pin down a stable transform (e.g. " +
      "clustered in one corner, or nearly in a line).",
    "Re-shoot so the overlap includes texture spread across the whole frame.",
  ],
  non_finite: [
    "The estimate produced numbers with no geometric meaning, which usually means the " +
      "matched points were too few or too tightly clustered to constrain a transform.",
    "Re-shoot so the overlap includes texture spread across the whole frame.",
  ],
};

function degenerateHomographyRemedies(context: Record<string, unknown> | undefined): string[] {
  const reason = context?.reason;
  if (typeof reason === "string" && reason in DEGENERATE_REASON_REMEDIES) {
    return [...DEGENERATE_REASON_REMEDIES[reason]];
  }
  return [...REMEDY_BY_CODE.DEGENERATE_HOMOGRAPHY];
}

/**
 * The frame this names could not be linked into the chain because one
 * specific pair failed gate 6 or gate 7 (docs/backend-spec.md section 9.3);
 * leading with that pair's own remedy is more useful than the generic
 * "remove it or bridge it" line alone.
 */
function disconnectedImagesRemedies(context: Record<string, unknown> | undefined): string[] {
  const cause = asRecord(context?.cause);
  const causeCode = cause?.code;
  const bridging = ["Remove this frame, or add a bridging frame that overlaps its neighbour."];
  if (typeof causeCode !== "string") return [...REMEDY_BY_CODE.DISCONNECTED_IMAGES];

  const causeContext = asRecord(cause?.context);
  if (causeCode === "INSUFFICIENT_INLIERS") {
    return [...insufficientInliersRemedies(causeContext), ...bridging];
  }
  if (causeCode === "DEGENERATE_HOMOGRAPHY") {
    return [...degenerateHomographyRemedies(causeContext), ...bridging];
  }
  return [...(REMEDY_BY_CODE[causeCode] ?? []), ...bridging];
}

/** Codes whose remedy depends on which specific condition the context names, not just the code. */
const DYNAMIC_REMEDY_BY_CODE: Readonly<
  Record<string, (context: Record<string, unknown> | undefined) => string[]>
> = {
  INSUFFICIENT_INLIERS: insufficientInliersRemedies,
  DEGENERATE_HOMOGRAPHY: degenerateHomographyRemedies,
  DISCONNECTED_IMAGES: disconnectedImagesRemedies,
};

export function remedyForCode(
  detail: ApiErrorDetail,
  config: ClientConfig = FALLBACK_CONFIG,
): readonly string[] {
  if (detail.code === "TOO_MANY_IMAGES") {
    return [`Remove frames until ${config.max_upload_files} or fewer remain.`];
  }
  const dynamic = DYNAMIC_REMEDY_BY_CODE[detail.code];
  if (dynamic) return dynamic(detail.context);
  return REMEDY_BY_CODE[detail.code] ?? GENERIC_REMEDY;
}

/**
 * Codes whose heading fragment already reads as a full sentence and should
 * not be prefixed with a frame/pair name (their context does not identify
 * one, or the sentence already stands alone).
 */
const STANDALONE_HEADING_CODES = new Set([
  "TOO_FEW_IMAGES",
  "TOO_MANY_IMAGES",
  "INVALID_STITCH_SETTINGS",
  "TOTAL_UPLOAD_TOO_LARGE",
  "SERVICE_BUSY",
  "STITCH_TIMEOUT",
  "CANVAS_TOO_LARGE",
]);

/**
 * The error block's heading (docs/ui-spec.md section 7): names the images
 * involved when `context` identifies a pair or a single image, otherwise
 * falls back to a per-code sentence, and to a fully generic one for an
 * unrecognised code. `files` supplies the names alongside the frame numbers
 * (docs/integration-spec.md section 7.1); omitted, the numbers stand alone.
 */
export function headingForError(
  detail: ApiErrorDetail,
  files: readonly { name: string }[] = [],
): string {
  const fragment = HEADING_BY_CODE[detail.code] ?? GENERIC_HEADING;
  if (STANDALONE_HEADING_CODES.has(detail.code) || !(detail.code in HEADING_BY_CODE)) {
    return fragment;
  }

  const context = detail.context;
  const pair = context?.pair;
  if (Array.isArray(pair) && pair.length === 2) {
    const [first, second] = pair;
    if (typeof first === "number" && typeof second === "number") {
      return `${pairLabel(first, second, files)} ${fragment}`;
    }
  }

  const image = context?.image;
  if (typeof image === "number") {
    return `${frameLabel(image, files)} ${fragment}`;
  }

  return `These frames ${fragment}`;
}
