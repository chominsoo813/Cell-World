export interface RpgDirection {
  x: number;
  y: number;
}

export type RpgTargetPoint = RpgDirection;

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

export function findNearestForwardTarget<T extends RpgTargetPoint>(
  origin: RpgTargetPoint,
  facing: RpgDirection,
  targets: readonly T[],
  maxRange: number,
  minimumFacingDot = 0.15,
): T | undefined {
  const normalizedFacing = normalizeRpgDirection(facing.x, facing.y);
  let nearest: { distance: number; target: T } | undefined;

  for (const target of targets) {
    const offsetX = target.x - origin.x;
    const offsetY = target.y - origin.y;
    const distance = Math.hypot(offsetX, offsetY);
    if (distance <= Number.EPSILON || distance > maxRange) {
      continue;
    }

    const facingDot =
      (offsetX / distance) * normalizedFacing.x +
      (offsetY / distance) * normalizedFacing.y;
    if (facingDot < minimumFacingDot) {
      continue;
    }

    if (!nearest || distance < nearest.distance) {
      nearest = { distance, target };
    }
  }

  return nearest?.target;
}
