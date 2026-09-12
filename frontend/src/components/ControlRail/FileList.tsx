import { useEffect, useMemo } from "react";

import { formatBytes } from "../../utils/formatBytes";

export interface FileListProps {
  files: File[];
  fileErrors: Array<string | null>;
  totalError: string | null;
}

export function FileList({ files, fileErrors, totalError }: FileListProps) {
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );

  if (files.length === 0) return null;

  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  return (
    <>
      <p className="order-note">
        Frames stitch in the order listed below — capture order, left to right.
      </p>
      <div className="files" aria-label="Selected images">
        {files.map((file, index) => (
          <div
            className={fileErrors[index] ? "file invalid" : "file"}
            key={`${file.name}-${file.lastModified}-${index}`}
          >
            <img src={previews[index]?.url} alt="" aria-hidden="true" />
            <span className="n">{String(index + 1).padStart(2, "0")}</span>
            <span className="name">{file.name}</span>
            <span className="size">{formatBytes(file.size)}</span>
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
