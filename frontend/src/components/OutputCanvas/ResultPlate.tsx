import { useState } from "react";

import type { StitchResponse } from "../../types";
import { Overlay } from "./Overlay";

export interface ResultPlateProps {
  result: StitchResponse;
}

function downloadFilename(detector: string, width: number, height: number): string {
  return `panorama-${detector}-${width}x${height}.png`.toLowerCase();
}

/**
 * docs/ui-spec.md sections 6.2-6.3: the panorama plate, the overlay toggle
 * (absent entirely when the overlay fields are missing), and the download
 * button, which always saves the clean image.
 */
export function ResultPlate({ result }: ResultPlateProps) {
  const { diagnostics, image } = result;
  const [overlayOn, setOverlayOn] = useState(true);

  const hasOverlay = Boolean(diagnostics.seam_lines && diagnostics.sample_correspondences_per_pair);
  const filename = downloadFilename(diagnostics.detector, image.width, image.height);

  function handleDownload() {
    const link = document.createElement("a");
    link.href = image.data_url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <div className="plate">
        <img
          src={image.data_url}
          alt={`Stitched panorama of ${diagnostics.image_count} frames, ${image.width} by ${image.height} pixels`}
        />
        {hasOverlay && overlayOn && (
          <Overlay
            width={image.width}
            height={image.height}
            seamLines={diagnostics.seam_lines!}
            correspondencesPerPair={diagnostics.sample_correspondences_per_pair!}
            inliersPerPair={diagnostics.inliers_per_pair}
          />
        )}
      </div>
      <div className="plate-foot">
        {hasOverlay && (
          <button
            className="toggle"
            type="button"
            aria-pressed={overlayOn}
            onClick={() => setOverlayOn((value) => !value)}
          >
            <i aria-hidden="true" /> Seams &amp; inliers
          </button>
        )}
        <button className="download" type="button" onClick={handleDownload}>
          ↓ Download PNG · {image.width} × {image.height}
        </button>
      </div>
    </>
  );
}
