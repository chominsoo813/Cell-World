export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function segmentIntersectsRectangle(
  start: Point,
  end: Point,
  rectangle: Rectangle,
) {
  return getSegmentRectangleIntersectionRatio(start, end, rectangle) !== null;
}

export function getSegmentRectangleIntersectionRatio(
  start: Point,
  end: Point,
  rectangle: Rectangle,
) {
  const left = rectangle.x;
  const right = rectangle.x + rectangle.width;
  const top = rectangle.y;
  const bottom = rectangle.y + rectangle.height;
  const directionX = end.x - start.x;
  const directionY = end.y - start.y;
  let near = 0;
  let far = 1;

  for (const [origin, direction, minimum, maximum] of [
    [start.x, directionX, left, right],
    [start.y, directionY, top, bottom],
  ] as const) {
    if (Math.abs(direction) < Number.EPSILON) {
      if (origin < minimum || origin > maximum) {
        return null;
      }
      continue;
    }

    const first = (minimum - origin) / direction;
    const second = (maximum - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));

    if (near > far) {
      return null;
    }
  }

  return far >= 0 && near <= 1 ? Math.max(0, near) : null;
}

export function hasClearLineOfSight(
  start: Point,
  end: Point,
  blockers: Rectangle[],
) {
  return !blockers.some((blocker) =>
    segmentIntersectsRectangle(start, end, blocker),
  );
}

export function getVisibleSegmentRatio(
  start: Point,
  end: Point,
  blockers: Rectangle[],
) {
  return blockers.reduce((nearest, blocker) => {
    const ratio = getSegmentRectangleIntersectionRatio(start, end, blocker);
    return ratio === null ? nearest : Math.min(nearest, ratio);
  }, 1);
}
