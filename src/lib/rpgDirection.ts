export interface RpgDirection {
  x: number;
  y: number;
}

export function normalizeRpgDirection(
  x: number,
  y: number,
  fallback: RpgDirection = { x: 0, y: 1 },
): RpgDirection {
  const length = Math.hypot(x, y);

  if (length <= Number.EPSILON) {
    return fallback;
  }

  return {
    x: x / length,
    y: y / length,
  };
}
