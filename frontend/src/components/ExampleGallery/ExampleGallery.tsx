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
  disabled?: boolean;
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

export function ExampleGallery({ onLoadSample }: ExampleGalleryProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleTrySample = async (dataset: SampleDataset) => {
    if (loadingId) return;

    setLoadingId(dataset.id);
    try {
      const files: File[] = [];
      
      for (const imageName of dataset.images) {
        const response = await fetch(`/sample_images/${dataset.id}/${imageName}`);
        const blob = await response.blob();
        const file = new File([blob], imageName, { type: blob.type });
        files.push(file);
      }
      
      onLoadSample(files);
    } catch (error) {
      console.error("Failed to load sample images:", error);
    } finally {
      setLoadingId(null);
    }
  };

  const supportedSamples = SAMPLE_DATASETS.filter((d) => d.category === "supported");
  const unsupportedSamples = SAMPLE_DATASETS.filter((d) => d.category === "unsupported");

  return (
    <div className="example-gallery">
      <div className="gallery-section">
        <div className="gallery-header">
          <span className="gallery-badge gallery-badge-supported">✅ Recommended</span>
          <h4>Supported Cases</h4>
        </div>
        <div className="gallery-grid">
          {supportedSamples.map((dataset) => (
            <div
              key={dataset.id}
              className={`gallery-card ${dataset.disabled ? "disabled" : ""}`}
            >
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
              {!dataset.disabled && (
                <button
                  type="button"
                  className="btn-try-sample"
                  onClick={() => handleTrySample(dataset)}
                  disabled={loadingId === dataset.id}
                >
                  {loadingId === dataset.id ? "Loading…" : "Try this sample"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="gallery-section">
        <div className="gallery-header">
          <span className="gallery-badge gallery-badge-unsupported">❌ Common Pitfalls</span>
          <h4>Unsupported Cases</h4>
        </div>
        <div className="gallery-grid">
          {unsupportedSamples.map((dataset) => (
            <div
              key={dataset.id}
              className="gallery-card"
            >
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
    </div>
  );
}
