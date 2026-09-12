import { useState } from "react";

import { MAX_FILE_BYTES, MAX_FILES, MIN_FILES } from "../../constants/thresholds";
import { formatBytes } from "../../utils/formatBytes";

export interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/bmp,image/tiff";

export function Dropzone({ onFilesSelected }: DropzoneProps) {
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
        {MIN_FILES}–{MAX_FILES} frames, {formatBytes(MAX_FILE_BYTES)} each
      </span>
      <input
        id="image-upload"
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={(event) => onFilesSelected(Array.from(event.target.files ?? []))}
      />
    </label>
  );
}
