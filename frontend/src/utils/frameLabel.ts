import type { ApiErrorDetail } from "../types";

interface NamedFile {
  name: string;
}

/**
 * docs/integration-spec.md section 7.1: the client keeps the selection in
 * upload order, which is the order the backend indexes, so one index doubles
 * as both the one-based frame number and the array position of its name.
 */
function numberedName(index: number, files: readonly NamedFile[]): string {
  const name = files[index]?.name;
  return name !== undefined ? `${index + 1} · ${name}` : `${index + 1}`;
}

export function frameLabel(index: number, files: readonly NamedFile[]): string {
  return `Frame ${numberedName(index, files)}`;
}

export function pairLabel(
  first: number,
  second: number,
  files: readonly NamedFile[],
): string {
  return `Frames ${numberedName(first, files)} and ${numberedName(second, files)}`;
}

/**
 * The zero-based frame indices a backend error names, used to highlight the
 * matching rows in the file list (docs/integration-spec.md section 7.1).
 */
export function framesNamedByError(
  detail: ApiErrorDetail | null | undefined,
): ReadonlySet<number> {
  const context = detail?.context;
  const indices = new Set<number>();
  if (!context) return indices;
  if (typeof context.image === "number") indices.add(context.image);
  if (Array.isArray(context.pair)) {
    for (const value of context.pair) {
      if (typeof value === "number") indices.add(value);
    }
  }
  return indices;
}
