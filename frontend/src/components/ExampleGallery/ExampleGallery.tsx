import { useState } from "react";

interface ExampleGalleryProps {
  onLoadSample: (files: File[]) => void;
}

interface SampleDataset {
  id: string;
  name: string;
  category: "supported" | "unsupported";
  description: string;
  tooltip: string;
  images: string[];
}

const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: "boat",
    name: "Overlapping Landscape Sequence",
    category: "supported",
    description: "Boat panorama",
    tooltip: "Requires 30-50% overlapping features between adjacent frames",
    images: ["boat1.jpg", "boat2.jpg", "boat3.jpg"],
  },
  {
    id: "budapest",
    name: "Continuous Wall/Building Shots",
    category: "supported",
    description: "Budapest parliament",
    tooltip: "Works best with consistent camera angle and distance",
    images: ["budapest1.jpg", "budapest2.jpg", "budapest3.jpg"],
  },
  {
    id: "newspaper",
    name: "Flat Document Scans",
    category: "supported",
    description: "Newspaper spread",
    tooltip: "Flat surface with minimal perspective distortion",
    images: ["newspaper1.jpg", "newspaper2.jpg", "newspaper3.jpg"],
  },
  {
    id: "unrelated",
    name: "Unrelated Images",
    category: "unsupported",
    description: "Random photos",
    tooltip: "Images must share overlapping visual features to match",
    images: ["unrelated1.jpg", "unrelated2.jpg"],
  },
  {
    id: "blank_sky",
    name: "Blank Sky/Texture",
    category: "unsupported",
    description: "Featureless areas",
    tooltip: "Requires distinct features for feature detection algorithms",
    images: ["blank_sky1.jpg", "blank_sky2.jpg"],
  },
  {
    id: "repeating",
    name: "Repeating Patterns",
    category: "unsupported",
    description: "Identical textures",
    tooltip: "Ambiguous matches cause alignment errors",
    images: ["repeating1.jpg", "repeating2.jpg"],
  },
];

type TabType = "supported" | "unsupported";

export function ExampleGallery({ onLoadSample }: ExampleGalleryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("supported");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleTrySample = async (dataset: SampleDataset) => {
    if (loadingId) return;

    setLoadingId(dataset.id);
    setLoadError(null);
    try {
      const files: File[] = [];

      for (const imageName of dataset.images) {
        const path = `/sample_images/${dataset.id}/${imageName}`;
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
      setLoadError(
        `Could not load the "${dataset.name}" sample. Check your connection and try again.`,
      );
    } finally {
      setLoadingId(null);
    }
  };

  const currentSamples = SAMPLE_DATASETS.filter((d) => d.category === activeTab);

  return (
    <div className="example-gallery">
      <button
        type="button"
        className="gallery-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="gallery-toggle-text">💡 Sample Datasets & Examples</span>
        <span className="gallery-toggle-hint">(Click to expand)</span>
        <svg
          className={`gallery-chevron ${isExpanded ? "is-expanded" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className={`gallery-content ${isExpanded ? "is-expanded" : ""}`}>
        <div className="gallery-tabs">
          <button
            type="button"
            className={`gallery-tab ${activeTab === "supported" ? "is-active" : ""}`}
            onClick={() => setActiveTab("supported")}
          >
            ✅ Supported Cases
          </button>
          <button
            type="button"
            className={`gallery-tab ${activeTab === "unsupported" ? "is-active" : ""}`}
            onClick={() => setActiveTab("unsupported")}
          >
            ❌ Common Pitfalls
          </button>
        </div>

        <div className="gallery-scroll-area">
          <div className="gallery-grid">
            {currentSamples.map((dataset) => (
              <div key={dataset.id} className="gallery-card">
                <div className="gallery-card-content">
                  <div className="gallery-thumbnails">
                    {dataset.images.length > 0 ? (
                      dataset.images.map((img, idx) => (
                        <div key={idx} className="gallery-thumb">
                          <img
                            src={`/sample_images/${dataset.id}/${img}`}
                            alt=""
                            loading="lazy"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="gallery-thumb-placeholder">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M3 9h18M9 21V9" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="gallery-info">
                    <strong>{dataset.name}</strong>
                    <small>{dataset.description}</small>
                    <div className="gallery-tooltip" title={dataset.tooltip}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      <span>{dataset.tooltip}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-try-sample"
                  onClick={() => handleTrySample(dataset)}
                  disabled={loadingId === dataset.id}
                >
                  {loadingId === dataset.id ? "Loading…" : "Try this sample"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {loadError && (
          <p className="gallery-error" role="alert">
            {loadError}
          </p>
        )}
      </div>
    </div>
  );
}
