import { useState } from "react";

import { MIN_FILES } from "../../constants/thresholds";
import type { ClientConfig } from "../../types";
import { formatBytes } from "../../utils/formatBytes";

export interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  config: ClientConfig;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/bmp,image/tiff";

export function Dropzone({ onFilesSelected, config }: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <label
      className={dragActive ? "dropzone drag-active" : "dropzone"}
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
      <span className="mark" aria-hidden="true">
        ↗
      </span>
      <strong>Drop overlapping images</strong>
      <span className="hint">
        JPG · PNG · WEBP · BMP · TIFF
        <br />
        {MIN_FILES}–{config.max_upload_files} frames, {config.max_upload_mb} MB each
      </span>
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
