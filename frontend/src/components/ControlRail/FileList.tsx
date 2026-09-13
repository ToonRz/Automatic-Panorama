import { useEffect, useMemo } from "react";

import { formatBytes } from "../../utils/formatBytes";
import type { PreparedImage } from "../../utils/prepareImage";

export interface FileListProps {
  files: File[];
  preparedImages: Array<PreparedImage | null>;
  fileErrors: Array<string | null>;
  totalError: string | null;
  /** Rows a server error names (docs/integration-spec.md section 7.1). */
  highlightedIndices?: ReadonlySet<number>;
  /** Omitted while the selection is locked (working or complete). */
  onRemove?: (index: number) => void;
}

export function FileList({
  files,
  preparedImages,
  fileErrors,
  totalError,
  highlightedIndices = new Set(),
  onRemove,
}: FileListProps) {
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );

  if (files.length === 0) return null;

  const totalBytes = files.reduce(
    (total, file, index) => total + (preparedImages[index]?.upload.size ?? file.size),
    0,
  );

  return (
    <>
      <p className="order-note">
        Frames stitch in the order listed below — capture order, left to right.
      </p>
      <div className="files" aria-label="Selected images">
        {files.map((file, index) => (
          <div
            className={fileErrors[index] || highlightedIndices.has(index) ? "file invalid" : "file"}
            key={`${file.name}-${file.lastModified}-${index}`}
          >
            <img src={previews[index]?.url} alt="" aria-hidden="true" />
            <span className="n">{String(index + 1).padStart(2, "0")}</span>
            <span className="name">{file.name}</span>
            <span className="size">
              {formatBytes(preparedImages[index]?.upload.size ?? file.size)}
            </span>
            {onRemove && (
              <button
                type="button"
                className="file-remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => onRemove(index)}
              >
                ×
              </button>
            )}
            {preparedImages[index] && (
              <span className="dimensions">
                {preparedImages[index].originalWidth}×{preparedImages[index].originalHeight}
                {preparedImages[index].resized &&
                  ` → ${preparedImages[index].uploadWidth}×${preparedImages[index].uploadHeight}`}
              </span>
            )}
            {fileErrors[index] && <span className="file-error">{fileErrors[index]}</span>}
          </div>
        ))}
      </div>
      <div className={totalError ? "files-total invalid" : "files-total"}>
        Upload total · {formatBytes(totalBytes)}
        {totalError && <span>{totalError}</span>}
      </div>
    </>
  );
}
