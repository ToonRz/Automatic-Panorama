/**
 * Stage order matches docs/cv-pipeline.md and the keys the backend uses in
 * `stage_timings_ms`. The working-state checklist and the diagnostics chart
 * both read from this single list so the two views can never disagree.
 */
export interface PipelineStage {
  key: string;
  label: string;
  /** docs/ui-spec.md section 3.1: the stage ribbon cell's visible label. */
  short: string;
  description: string;
}

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    key: "decode",
    label: "Decode & normalize frames",
    short: "Decode",
    description: "Reading frame buffers and normalizing image orientations to RGB matrices.",
  },
  {
    key: "features",
    label: "Extract keypoints & descriptors",
    short: "Features",
    description: "Detecting keypoints and computing high-dimensional feature descriptors.",
  },
  {
    key: "matching",
    label: "KNN match & ratio test",
    short: "Match",
    description: "Searching nearest neighbours across adjacent frames with Lowe's ratio test.",
  },
  {
    key: "homography",
    label: "RANSAC homography per pair",
    short: "Homography",
    description: "Estimating 3×3 projective transformation matrices and filtering outliers.",
  },
  {
    key: "warp",
    label: "Warp onto the shared canvas",
    short: "Warp",
    description: "Projecting and warping candidate frames onto the unified canvas coordinate space.",
  },
  {
    key: "blend",
    label: "Blend and crop",
    short: "Blend & crop",
    description: "Feather blending across overlaps and trimming empty margins.",
  },
  {
    key: "encode",
    label: "Encode PNG",
    short: "Encode",
    description: "Compressing merged pixel raster into standard PNG buffer.",
  },
];
