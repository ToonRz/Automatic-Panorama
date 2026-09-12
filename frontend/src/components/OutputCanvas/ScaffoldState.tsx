/**
 * docs/ui-spec.md section 8: a 501/PIPELINE_NOT_IMPLEMENTED is not a
 * rejection of the user's images, so it gets its own amber notice rather
 * than the failed state's coral treatment. Removed once the pipeline lands.
 */
export function ScaffoldState() {
  return (
    <div className="scaffold">
      <h3>Stitching isn't built yet</h3>
      <p>
        This request validated correctly — the frames and settings are fine. The stitching
        algorithm itself is still on the roadmap, not implemented.
      </p>
      <p>
        <a
          href="https://github.com/ToonRz/Automatic-Panorama/blob/main/docs/roadmap.md"
          target="_blank"
          rel="noreferrer"
        >
          See the roadmap ↗
        </a>
      </p>
    </div>
  );
}
