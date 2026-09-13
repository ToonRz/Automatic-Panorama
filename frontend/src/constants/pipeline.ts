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
}

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  { key: "decode", label: "Decode & normalize frames", short: "Decode" },
  { key: "features", label: "Extract keypoints & descriptors", short: "Features" },
  { key: "matching", label: "KNN match & ratio test", short: "Match" },
  { key: "homography", label: "RANSAC homography per pair", short: "Homography" },
  { key: "warp", label: "Warp onto the shared canvas", short: "Warp" },
  { key: "blend", label: "Blend and crop", short: "Blend & crop" },
  { key: "encode", label: "Encode PNG", short: "Encode" },
];
