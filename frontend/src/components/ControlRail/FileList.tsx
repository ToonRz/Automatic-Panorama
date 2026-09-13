import { useEffect, useMemo } from "react";

import { formatBytes } from "../../utils/formatBytes";
import type { PreparedImage } from "../../utils/prepareImage";

export interface FileListProps {
  files: File[];
  preparedImages: Array<PreparedImage | null>;
  fileErrors: Array<string | null>;
  totalError: string | null;
  /** The prepared-bytes total (docs/ui-spec.md section 3.1's "order and total" row). */
  totalBytes: number;
  /** Rows a server error names (docs/integration-spec.md section 7.1). */
  highlightedIndices?: ReadonlySet<number>;
  /** Omitted while the selection is locked (working or complete). */
  onRemove?: (index: number) => void;
}

function metaLine(file: File, prepared: PreparedImage | null): string {
  const sizeBytes = prepared?.upload.size ?? file.size;
  if (!prepared) return formatBytes(sizeBytes);
  const dimensions = prepared.resized
    ? `${prepared.originalWidth}×${prepared.originalHeight} → ${prepared.uploadWidth}×${prepared.uploadHeight}`
    : `${prepared.originalWidth}×${prepared.originalHeight}`;
  return `${dimensions} · ${formatBytes(sizeBytes)}`;
}

/**
 * docs/ui-spec.md section 3.1 file row: a thumbnail with the two-digit index
 * overlaid, the name with ellipsis, a mono meta line, and a remove button.
 * The order sentence and the prepared byte total sit in one row beneath it.
 */
export function FileList({
  files,
  preparedImages,
  fileErrors,
  totalError,
  totalBytes,
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

  return (
    <>
      <ul className="files" aria-label="Selected images">
        {files.map((file, index) => {
          const invalid = Boolean(fileErrors[index]) || highlightedIndices.has(index);
          return (
            <li
              className={invalid ? "file invalid" : "file"}
              key={`${file.name}-${file.lastModified}-${index}`}
            >
              <span className="thumb">
                <img src={previews[index]?.url} alt="" aria-hidden="true" />
                <span className="thumb-n" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <div className="file-info">
                <div className="name">{file.name}</div>
                <div className="meta mono">{metaLine(file, preparedImages[index])}</div>
                {fileErrors[index] && <div className="file-error">{fileErrors[index]}</div>}
              </div>
              {onRemove && (
                <button
                  type="button"
                  className="x"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onRemove(index)}
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className={totalError ? "total invalid" : "total"}>
        <span>Frames stitch in list order — capture order, left to right.</span>
        <span className="mono">{formatBytes(totalBytes)}</span>
      </div>
      {totalError && (
        <p className="total-error" role="alert">
          {totalError}
        </p>
      )}
    </>
  );
}
