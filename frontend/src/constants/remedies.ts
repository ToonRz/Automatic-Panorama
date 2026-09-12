import type { ApiErrorDetail } from "../types";

/**
 * Remedy text keyed by backend error code (docs/ui-spec.md section 7.1,
 * docs/backend-spec.md section 9). These are language and product guidance,
 * not measurement, so they live here and can be reworded without a backend
 * change.
 *
 * PIPELINE_NOT_IMPLEMENTED is deliberately absent: a 501 renders the
 * scaffold state (section 8), never this table.
 */
export const GENERIC_REMEDY: readonly string[] = [
  "This error code is not recognised yet. Note the code above and check docs/backend-spec.md for updates.",
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
    "One panorama is already being stitched.",
    "The button re-enables itself after the stated wait.",
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
  INSUFFICIENT_INLIERS: [
    "Re-shoot the named frame with 30-50 percent overlap.",
    "Raise the ratio test toward 0.80 to keep more candidate matches.",
    "Try ORB on low-texture scenes.",
  ],
  DEGENERATE_HOMOGRAPHY: [
    "The named pair produced an unusable transform.",
    "Lower the RANSAC tolerance and re-shoot with less parallax.",
  ],
  DISCONNECTED_IMAGES: [
    "The named frame shares no view with the others.",
    "Remove it or add a bridging frame.",
  ],
  CANVAS_TOO_LARGE: [
    "The frames did not line up into a sensible shape.",
    "Check that they are one continuous pan and re-shoot the odd frame.",
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
  DEGENERATE_HOMOGRAPHY: "produced an unusable transform",
  DISCONNECTED_IMAGES: "shares no view with the others",
  CANVAS_TOO_LARGE: "The combined canvas is too large",
};

export const GENERIC_HEADING = "Could not stitch these frames";

export function remedyForCode(code: string): readonly string[] {
  return REMEDY_BY_CODE[code] ?? GENERIC_REMEDY;
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

function toOneBased(value: unknown): number | undefined {
  return typeof value === "number" ? value + 1 : undefined;
}

/**
 * The error block's heading (docs/ui-spec.md section 7): names the images
 * involved when `context` identifies a pair or a single image, otherwise
 * falls back to a per-code sentence, and to a fully generic one for an
 * unrecognised code.
 */
export function headingForError(detail: ApiErrorDetail): string {
  const fragment = HEADING_BY_CODE[detail.code] ?? GENERIC_HEADING;
  if (STANDALONE_HEADING_CODES.has(detail.code) || !(detail.code in HEADING_BY_CODE)) {
    return fragment;
  }

  const context = detail.context;
  const pair = context?.pair;
  if (Array.isArray(pair) && pair.length === 2) {
    const first = toOneBased(pair[0]);
    const second = toOneBased(pair[1]);
    if (first !== undefined && second !== undefined) {
      return `Frames ${first} and ${second} ${fragment}`;
    }
  }

  const image = toOneBased(context?.image);
  if (image !== undefined) {
    return `Frame ${image} ${fragment}`;
  }

  return `These frames ${fragment}`;
}
