import { useEffect, useMemo, useState } from "react";

import { ApiError, checkHealth, submitStitch } from "./api";
import type { Detector, StitchResponse } from "./types";

const MAX_FILES = 8;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [detector, setDetector] = useState<Detector>("SIFT");
  const [ratioThreshold, setRatioThreshold] = useState(0.75);
  const [ransacThreshold, setRansacThreshold] = useState(5);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StitchResponse | null>(null);

  useEffect(() => {
    checkHealth()
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  const canSubmit = files.length >= 2 && files.length <= MAX_FILES && !isSubmitting;
  const totalBytes = useMemo(() => files.reduce((total, file) => total + file.size, 0), [files]);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected.slice(0, MAX_FILES));
    setError(null);
    setResult(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await submitStitch(files, {
        detector,
        ratioThreshold,
        ransacReprojThreshold: ransacThreshold,
      });
      setResult(response);
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.detail) {
        setError(`${caughtError.detail.code}: ${caughtError.detail.message}`);
      } else if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("The request failed. Check the backend URL and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <div className="eyebrow">CP461 / COMPUTER VISION / SEMESTER 1 2026</div>
        <h1>Automatic Panorama Stitcher</h1>
        <p>
          Turn overlapping photographs into one wide view with an explainable SIFT/ORB pipeline.
        </p>
        <div className={`status-pill ${backendStatus}`} role="status">
          <span aria-hidden="true" />
          Backend {backendStatus}
        </div>
      </header>

      <section className="workspace-grid" aria-label="Panorama workspace">
        <form className="panel controls-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <span className="section-kicker">01 / INPUT</span>
              <h2>Choose your frames</h2>
            </div>
            <span className="counter">{files.length}/{MAX_FILES}</span>
          </div>

          <label className="drop-zone" htmlFor="image-upload">
            <span className="drop-icon" aria-hidden="true">↗</span>
            <span className="drop-title">Add overlapping images</span>
            <span className="drop-help">JPG, PNG, WEBP, BMP, or TIFF · 2-8 frames</span>
            <input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
              multiple
              onChange={handleFileChange}
            />
          </label>

          {files.length > 0 && (
            <div className="file-list" aria-label="Selected images">
              {files.map((file, index) => (
                <div className="file-row" key={`${file.name}-${file.lastModified}`}>
                  <img
                    className="file-thumb"
                    src={previews[index]?.url}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="file-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatBytes(file.size)}</span>
                </div>
              ))}
              <div className="file-total">Total upload · {formatBytes(totalBytes)}</div>
            </div>
          )}

          <div className="divider" />
          <div className="panel-heading compact">
            <div>
              <span className="section-kicker">02 / METHOD</span>
              <h2>Pipeline settings</h2>
            </div>
          </div>

          <label className="field-label" htmlFor="detector">Feature detector</label>
          <select id="detector" value={detector} onChange={(event) => setDetector(event.target.value as Detector)}>
            <option value="SIFT">SIFT · robust</option>
            <option value="ORB">ORB · fast</option>
          </select>

          <div className="field-row">
            <label className="field-label" htmlFor="ratio">Ratio test <output>{ratioThreshold.toFixed(2)}</output></label>
            <input
              id="ratio"
              type="range"
              min="0.55"
              max="0.9"
              step="0.01"
              value={ratioThreshold}
              onChange={(event) => setRatioThreshold(Number(event.target.value))}
            />
            <span className="field-help">Lower values keep only stronger descriptor matches.</span>
          </div>

          <div className="field-row">
            <label className="field-label" htmlFor="ransac">RANSAC tolerance <output>{ransacThreshold.toFixed(1)} px</output></label>
            <input
              id="ransac"
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={ransacThreshold}
              onChange={(event) => setRansacThreshold(Number(event.target.value))}
            />
            <span className="field-help">Maximum reprojection error for an inlier.</span>
          </div>

          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Processing…" : "Stitch panorama"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="fine-print">Images are processed in memory and are not saved by v1.</p>
        </form>

        <section className="panel result-panel" aria-live="polite">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">03 / OUTPUT</span>
              <h2>Your panorama</h2>
            </div>
            {result && <span className="complete-tag">COMPLETE</span>}
          </div>

          {error && (
            <div className="message error-message" role="alert">
              <strong>Could not stitch</strong>
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <>
              <div className="result-image-wrap">
                <img src={result.image.data_url} alt="Generated panorama" />
              </div>
              <div className="diagnostics-grid">
                <div><span>Detector</span><strong>{result.diagnostics.detector}</strong></div>
                <div><span>Images</span><strong>{result.diagnostics.image_count}</strong></div>
                <div><span>Output</span><strong>{result.image.width} × {result.image.height}</strong></div>
                <div><span>Inliers</span><strong>{result.diagnostics.inliers_per_pair.join(" · ")}</strong></div>
              </div>
            </>
          ) : (
            <div className="empty-result">
              <div className="empty-mark" aria-hidden="true">◎</div>
              <h3>Output appears here</h3>
              <p>
                Upload at least two overlapping frames. The completed view will include the
                panorama and the match/RANSAC evidence needed for the CP461 demo.
              </p>
              <div className="pipeline-ribbon">
                <span>features</span><b>→</b><span>matches</span><b>→</b><span>RANSAC</span><b>→</b><span>blend</span>
              </div>
            </div>
          )}
        </section>
      </section>

      <footer className="footer-note">
        <span>Scaffold · algorithm implementation tracked in the backend roadmap</span>
        <a href="https://github.com/ToonRz/Automatic-Panorama/tree/main/docs" target="_blank" rel="noreferrer">Project docs ↗</a>
      </footer>
    </main>
  );
}
