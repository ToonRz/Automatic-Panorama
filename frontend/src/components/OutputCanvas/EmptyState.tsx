export function EmptyState() {
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true">
        ◎
      </div>
      <h3>The panorama lands here</h3>
      <p>
        Alongside it: keypoint counts, surviving matches, inlier ratio, and reprojection error for
        every image pair — the evidence the report asks for.
      </p>
      <div className="ribbon">
        <span>features</span>
        <b>→</b>
        <span>matches</span>
        <b>→</b>
        <span>RANSAC</span>
        <b>→</b>
        <span>warp</span>
        <b>→</b>
        <span>blend</span>
      </div>
    </div>
  );
}
