import { useEffect, useMemo, useState } from "react";

import { ApiError, checkHealth, submitStitch } from "./api";
import { StatusPill } from "./components/StatusPill";
import { MAX_FILES, MAX_FILE_BYTES, MIN_FILES } from "./constants/thresholds";
import type { Detector, StitchResponse } from "./types";
import { formatBytes } from "./utils/formatBytes";

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

  const canSubmit = files.length >= MIN_FILES && files.length <= MAX_FILES && !isSubmitting;
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
    <main className="sheet">
      <header className="hero">
        <div className="kicker">CP461 · Computer Vision · Semester 1 2026</div>
        <h1>Automatic Panorama Stitcher</h1>
        <p>
          Turn overlapping photographs into one wide view with an explainable SIFT/ORB pipeline.
        </p>
        <StatusPill status={backendStatus} />
      </header>

      <div className="workspace">
        <form className="panel stack" onSubmit={handleSubmit}>
          <div className="panel-head">
            <div>
              <span className="kicker">Input</span>
              <h2>Choose your frames</h2>
            </div>
            <span className="counter">
              {files.length}/{MAX_FILES}
            </span>
          </div>

          <label className="dropzone" htmlFor="image-upload">
            <span className="mark" aria-hidden="true">
              ↗
            </span>
            <strong>Add overlapping images</strong>
            <span className="hint">
              JPG, PNG, WEBP, BMP, or TIFF · {MIN_FILES}-{MAX_FILES} frames,{" "}
              {formatBytes(MAX_FILE_BYTES)} each
            </span>
            <input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
              multiple
              onChange={handleFileChange}
            />
          </label>

          {files.length > 0 && (
            <>
              <div className="files" aria-label="Selected images">
                {files.map((file, index) => (
                  <div className="file" key={`${file.name}-${file.lastModified}`}>
                    <img src={previews[index]?.url} alt="" aria-hidden="true" />
                    <span className="n">{String(index + 1).padStart(2, "0")}</span>
                    <span className="name">{file.name}</span>
                    <span className="size">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
              <div className="files-total">Upload total · {formatBytes(totalBytes)}</div>
            </>
          )}

          <div className="rule" />
          <div className="panel-head compact">
            <div>
              <span className="kicker">Method</span>
              <h2>Pipeline settings</h2>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="detector">
              Feature detector
            </label>
            <select
              id="detector"
              value={detector}
              onChange={(event) => setDetector(event.target.value as Detector)}
            >
              <option value="SIFT">SIFT · robust</option>
              <option value="ORB">ORB · fast</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ratio">
              Ratio test <output htmlFor="ratio">{ratioThreshold.toFixed(2)}</output>
            </label>
            <input
              id="ratio"
              type="range"
              min="0.55"
              max="0.9"
              step="0.01"
              value={ratioThreshold}
              onChange={(event) => setRatioThreshold(Number(event.target.value))}
            />
            <span className="hint">Lower values keep only stronger descriptor matches.</span>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ransac">
              RANSAC tolerance <output htmlFor="ransac">{ransacThreshold.toFixed(1)} px</output>
            </label>
            <input
              id="ransac"
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={ransacThreshold}
              onChange={(event) => setRansacThreshold(Number(event.target.value))}
            />
            <span className="hint">Maximum reprojection error for an inlier.</span>
          </div>

          <button className="cta" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Processing…" : "Stitch panorama"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="fineprint">Images are processed in memory and are not saved by v1.</p>
        </form>

        <section className="panel canvas-panel" aria-live="polite">
          <div className="panel-head">
            <div>
              <span className="kicker">Output</span>
              <h2>Your panorama</h2>
            </div>
            {result && <span className="tag ok">Complete</span>}
          </div>

          {error && (
            <div className="alert" role="alert">
              <h3>Could not stitch</h3>
              <p>{error}</p>
            </div>
          )}

          {result ? (
            <div className="plate">
              <img src={result.image.data_url} alt="Generated panorama" />
            </div>
          ) : (
            <div className="empty">
              <div style={{ fontSize: "3.6rem", lineHeight: 1, color: "var(--aqua)" }} aria-hidden="true">
                ◎
              </div>
              <h3>Output appears here</h3>
              <p>
                Upload at least two overlapping frames. The completed view will include the
                panorama and the match/RANSAC evidence needed for the CP461 demo.
              </p>
              <div className="ribbon">
                <span>features</span>
                <b>→</b>
                <span>matches</span>
                <b>→</b>
                <span>RANSAC</span>
                <b>→</b>
                <span>blend</span>
              </div>
            </div>
          )}
        </section>
      </div>

      {result && (
        <section className="diagnostics">
          <div className="panel-head" style={{ marginBottom: 0 }}>
            <div>
              <span className="kicker">Evidence</span>
              <h2>Run diagnostics</h2>
            </div>
          </div>
          <div className="diag-grid">
            <div>
              <span>Detector</span>
              <strong className="mono">{result.diagnostics.detector}</strong>
            </div>
            <div>
              <span>Images</span>
              <strong className="mono">{result.diagnostics.image_count}</strong>
            </div>
            <div>
              <span>Output</span>
              <strong className="mono">
                {result.image.width} × {result.image.height}
              </strong>
            </div>
            <div>
              <span>Inliers</span>
              <strong className="mono">{result.diagnostics.inliers_per_pair.join(" · ")}</strong>
            </div>
          </div>
        </section>
      )}

      <footer className="appfoot">
        <span>Scaffold · algorithm implementation tracked in the backend roadmap</span>
        <a href="https://github.com/ToonRz/Automatic-Panorama/tree/main/docs" target="_blank" rel="noreferrer">
          Project docs ↗
        </a>
      </footer>
    </main>
  );
}
