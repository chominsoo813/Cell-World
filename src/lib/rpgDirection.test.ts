import { describe, expect, it } from "vitest";
import {
  findNearestForwardTarget,
  normalizeRpgDirection,
} from "@/lib/rpgDirection";

describe("normalizeRpgDirection", () => {
  it("keeps diagonal skill aim instead of collapsing to a cardinal axis", () => {
    const direction = normalizeRpgDirection(1, -1);

    expect(direction.x).toBeCloseTo(Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it("uses the downward fallback when the player has not moved yet", () => {
    expect(normalizeRpgDirection(0, 0)).toEqual({ x: 0, y: 1 });
  });

  it("selects the nearest target inside the facing side of the battlefield", () => {
    const behind = { id: "behind", x: -20, y: 0 };
    const fartherAhead = { id: "far", x: 180, y: 40 };
    const nearestAhead = { id: "near", x: 80, y: -10 };

    expect(
      findNearestForwardTarget(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        [behind, fartherAhead, nearestAhead],
        240,
      ),
    ).toBe(nearestAhead);
  });

  it("supports diagonal facing and ignores targets outside skill range", () => {
    const diagonal = { id: "diagonal", x: 90, y: -90 };
    const tooFar = { id: "far", x: 300, y: -300 };

    expect(
      findNearestForwardTarget(
        { x: 0, y: 0 },
        normalizeRpgDirection(1, -1),
        [tooFar, diagonal],
        200,
      ),
    ).toBe(diagonal);
  });
});
