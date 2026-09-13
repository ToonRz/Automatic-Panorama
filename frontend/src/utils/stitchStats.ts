export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function min(values: readonly number[]): number {
  return Math.min(...values);
}

export function max(values: readonly number[]): number {
  return Math.max(...values);
}

/**
 * docs/ui-spec.md section 6.1: the inlier-ratio and reprojection KPI cards
 * name the one-based pair the worst value came from, and the first pair
 * wins a tie. Strict `<`/`>` comparisons (never `<=`/`>=`) are what makes
 * the earliest index win.
 */
export function argMin(values: readonly number[]): number {
  let bestIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[bestIndex]) bestIndex = index;
  }
  return bestIndex;
}

export function argMax(values: readonly number[]): number {
  let bestIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[bestIndex]) bestIndex = index;
  }
  return bestIndex;
}
