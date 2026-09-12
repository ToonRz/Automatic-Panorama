export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function min(values: readonly number[]): number {
  return Math.min(...values);
}

export function max(values: readonly number[]): number {
  return Math.max(...values);
}
