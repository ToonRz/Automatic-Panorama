import { useState } from "react";

import type { ClientConfig } from "../../types";

export interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  config: ClientConfig;
  /** Chooses the tall (no files) or compact (files chosen) variant (section 3.1). */
  fileCount: number;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/heic,image/heif,.heic,.heif";

/**
 * docs/ui-spec.md section 3.1: a tall centred variant with no files, a
 * compact row once files exist. The whole zone is the label for the hidden
 * file input; Browse is a styled span, not a nested button.
 */
export function Dropzone({ onFilesSelected, config, fileCount }: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const compact = fileCount > 0;

  const className = [
    "drop",
    compact ? null : "tall",
    dragActive ? "drag-active" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label
      className={className}
      htmlFor="image-upload"
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        onFilesSelected(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <span className="ico" aria-hidden="true">
        {compact ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5v14M5 12h14" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 16V4m0 0-4 4m4-4 4 4" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        )}
      </span>
      {compact ? (
        <div className="drop-text">
          <strong>Add more frames</strong>
          <small>Appended after frame {String(fileCount).padStart(2, "0")}</small>
        </div>
      ) : (
        <div className="drop-text">
          <strong>Drop overlapping images</strong>
          <small>
            JPG · PNG · WEBP · BMP · TIFF · HEIC — up to {config.max_upload_mb} MB each
          </small>
        </div>
      )}
      <span className="btn-ghost">{compact ? "Browse" : "Browse files"}</span>
      <input
        id="image-upload"
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={(event) => {
          onFilesSelected(Array.from(event.target.files ?? []));
          // Reset so picking the same file again still fires a change event.
          event.target.value = "";
        }}
      />
    </label>
  );
}
