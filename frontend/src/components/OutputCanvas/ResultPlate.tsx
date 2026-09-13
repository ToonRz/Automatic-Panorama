import type { StitchResponse } from "../../types";
import { Overlay } from "./Overlay";

export interface ResultPlateProps {
  result: StitchResponse;
  /** Owned by `OutputCanvas` now that the toggle lives in the stage head. */
  overlayOn: boolean;
}

function mimeLabel(mimeType: string): string {
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.toUpperCase() : mimeType;
}

/**
 * docs/ui-spec.md section 3.1/6.2: the panorama plate with a drop shadow and
 * the mono `W × H · MP · PNG` caption. The overlay toggle and download
 * button live in the stage head (`OutputCanvas`); this component only draws
 * the image, the optional overlay, and the caption.
 */
export function ResultPlate({ result, overlayOn }: ResultPlateProps) {
  const { diagnostics, image } = result;
  const hasOverlay = Boolean(diagnostics.seam_lines && diagnostics.sample_correspondences_per_pair);
  const megapixels = (image.width * image.height) / 1_000_000;

  return (
    <div className="plate">
      <img
        className="pano"
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
      <span className="corner br">
        {image.width} × {image.height} · {megapixels.toFixed(2)} MP · {mimeLabel(image.mime_type)}
      </span>
    </div>
  );
}
