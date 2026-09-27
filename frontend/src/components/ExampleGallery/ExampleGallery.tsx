import { useId, useState } from "react";

import type { Detector } from "../../types";

interface ExampleGalleryProps {
  /** Receives the fetched frames; the caller replaces the current selection. */
  onLoadSample: (files: File[]) => void;
  /** The current selection, used to mark the sample that is loaded. */
  currentFiles: File[];
  /** The expected failure code of a pitfall set depends on the detector. */
  detector: Detector;
}

type Kind = "stitches" | "fails";

interface SampleDataset {
  id: string;
  name: string;
  kind: Kind;
  /** One short mono fact shown under the name of a set that stitches. */
  meta: string;
  /** Why the set stitches or fails, revealed on hover or focus. */
  why: string;
  /**
   * The error the pipeline returns for a failure set at default thresholds,
   * per detector. Measured by running each set through services/stitcher.py.
   */
  expectedCode?: Record<Detector, string>;
  images: string[];
}

const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: "boat",
    name: "Harbour boats",
    kind: "stitches",
    meta: "~40% overlap",
    why: "Adjacent frames share 30–50% of the scene.",
    images: ["boat1.jpg", "boat2.jpg", "boat3.jpg"],
  },
  {
    id: "budapest",
    name: "Budapest parliament",
    kind: "stitches",
    meta: "same distance",
    why: "Consistent camera angle and distance to the façade.",
    images: ["budapest1.jpg", "budapest2.jpg", "budapest3.jpg"],
  },
  {
    id: "newspaper",
    name: "Newspaper spread",
    kind: "stitches",
    meta: "low parallax",
    why: "A flat surface is an exact homography — the ideal case.",
    images: ["newspaper1.jpg", "newspaper2.jpg", "newspaper3.jpg"],
  },
  {
    id: "unrelated",
    name: "Unrelated photos",
    kind: "fails",
    meta: "",
    why: "No shared scene, so almost nothing survives the ratio test.",
    expectedCode: { SIFT: "INSUFFICIENT_MATCHES", ORB: "INSUFFICIENT_MATCHES" },
    images: ["unrelated1.jpg", "unrelated2.jpg"],
  },
  {
    id: "blank_sky",
    name: "Blank sky",
    kind: "fails",
    meta: "",
    why: "Featureless areas give the detector almost nothing to find.",
    expectedCode: { SIFT: "NO_DESCRIPTORS", ORB: "NO_DESCRIPTORS" },
    images: ["blank_sky1.jpg", "blank_sky2.jpg"],
  },
  {
    id: "repeating",
    name: "Repeating pattern",
    kind: "fails",
    meta: "",
    why: "Every patch looks alike, so matches are ambiguous and get rejected.",
    expectedCode: { SIFT: "INSUFFICIENT_MATCHES", ORB: "INSUFFICIENT_INLIERS" },
    images: ["repeating1.jpg", "repeating2.jpg"],
  },
];

const FOOTNOTE: Record<Kind, string> = {
  stitches: "Loads the frames into Source frames, replacing anything already there.",
  fails:
    "These sets are meant to fail. The stitcher rejects them with a named error instead of returning a distorted image.",
};

function samplePath(dataset: SampleDataset, image: string) {
  return `/sample_images/${dataset.id}/${image}`;
}

function isLoaded(dataset: SampleDataset, files: File[]) {
  return (
    files.length === dataset.images.length &&
    files.every((file, index) => file.name === dataset.images[index])
  );
}

export function ExampleGallery({ onLoadSample, currentFiles, detector }: ExampleGalleryProps) {
  const [activeKind, setActiveKind] = useState<Kind>("stitches");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const idPrefix = useId();

  const handleLoad = async (dataset: SampleDataset) => {
    if (loadingId) return;

    setLoadingId(dataset.id);
    setFailedId(null);
    try {
      const files: File[] = [];

      for (const imageName of dataset.images) {
        const path = samplePath(dataset, imageName);
        const response = await fetch(path);
        // A missing asset resolves to the SPA's HTML fallback, so an unchecked
        // blob() would hand the pipeline a text/html file named *.jpg and fail
        // later with an unrelated decode error.
        if (!response.ok) {
          throw new Error(`${path} returned ${response.status}`);
        }
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) {
          throw new Error(`${path} is not an image (${blob.type || "unknown type"})`);
        }
        files.push(new File([blob], imageName, { type: blob.type }));
      }

      onLoadSample(files);
    } catch (error) {
      console.error("Failed to load sample images:", error);
      setFailedId(dataset.id);
    } finally {
      setLoadingId(null);
    }
  };

  const visible = SAMPLE_DATASETS.filter((dataset) => dataset.kind === activeKind);
  const failed = SAMPLE_DATASETS.find((dataset) => dataset.id === failedId);

  return (
    <div className="samples">
      <div className="samples-seg" role="group" aria-label="Sample type">
        {(["stitches", "fails"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={activeKind === kind}
            onClick={() => setActiveKind(kind)}
          >
            <span className={`samples-dot ${kind === "stitches" ? "is-pass" : "is-fail"}`} />
            {kind === "stitches" ? "Stitches" : "Known failures"}
            <span className="samples-count">
              {SAMPLE_DATASETS.filter((dataset) => dataset.kind === kind).length}
            </span>
          </button>
        ))}
      </div>

      <ul className="samples-list">
        {visible.map((dataset) => {
          const loading = loadingId === dataset.id;
          const loaded = !loading && isLoaded(dataset, currentFiles);
          const errored = failedId === dataset.id;
          const whyId = `${idPrefix}-${dataset.id}-why`;
          const stateClass = loaded ? " is-loaded" : errored ? " is-error" : "";

          return (
            <li key={dataset.id}>
              <button
                type="button"
                className={`sample${stateClass}`}
                onClick={() => handleLoad(dataset)}
                aria-busy={loading}
                aria-describedby={whyId}
                disabled={loadingId !== null && !loading}
              >
                <span
                  className={`sample-strip ${dataset.kind === "stitches" ? "is-overlap" : "is-apart"}`}
                  aria-hidden="true"
                >
                  {dataset.images.map((image) => (
                    <img key={image} src={samplePath(dataset, image)} alt="" loading="lazy" />
                  ))}
                  {dataset.kind === "fails" && (
                    <svg className="sample-broken" width="14" height="14" viewBox="0 0 24 24">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  )}
                </span>

                <span className="sample-body">
                  <span className="sample-name">{dataset.name}</span>
                  <span className="sample-meta">
                    {loading ? (
                      <span className="is-run">Loading…</span>
                    ) : loaded ? (
                      <span className="is-accent">Loaded into Source frames</span>
                    ) : dataset.expectedCode ? (
                      <span className="sample-code">
                        <span className="sr-only">Expected error: </span>✕{" "}
                        {dataset.expectedCode[detector]}
                      </span>
                    ) : (
                      <>
                        {dataset.images.length} frames
                        <span className="sample-sep" aria-hidden="true">
                          ·
                        </span>
                        {dataset.meta}
                      </>
                    )}
                  </span>
                  <span className="sample-why" id={whyId}>
                    {dataset.why}
                  </span>
                </span>

                <span className="sample-go" aria-hidden="true">
                  {loading ? (
                    <span className="sample-spinner" />
                  ) : loaded ? (
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : errored ? (
                    <svg width="15" height="15" viewBox="0 0 24 24">
                      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {failed && (
        <div className="samples-error" role="alert">
          <span>Couldn’t load “{failed.name}”. Check your connection.</span>
          <button type="button" onClick={() => handleLoad(failed)}>
            Retry
          </button>
        </div>
      )}

      <p className="samples-foot">{FOOTNOTE[activeKind]}</p>
    </div>
  );
}
