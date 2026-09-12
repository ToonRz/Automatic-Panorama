/**
 * Stage order matches docs/cv-pipeline.md and the keys the backend uses in
 * `stage_timings_ms`. The working-state checklist and the diagnostics chart
 * both read from this single list so the two views can never disagree.
 */
export interface PipelineStage {
  key: string;
  label: string;
}

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  { key: "decode", label: "Decode & normalize frames" },
  { key: "features", label: "Extract keypoints & descriptors" },
  { key: "matching", label: "KNN match & ratio test" },
  { key: "homography", label: "RANSAC homography per pair" },
  { key: "warp", label: "Warp onto the shared canvas" },
  { key: "blend", label: "Blend and crop" },
  { key: "encode", label: "Encode PNG" },
];
