import { describe, expect, it } from "vitest";
import { normalizeRpgDirection } from "@/lib/rpgDirection";

describe("normalizeRpgDirection", () => {
  it("keeps diagonal skill aim instead of collapsing to a cardinal axis", () => {
    const direction = normalizeRpgDirection(1, -1);

    expect(direction.x).toBeCloseTo(Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it("uses the downward fallback when the player has not moved yet", () => {
    expect(normalizeRpgDirection(0, 0)).toEqual({ x: 0, y: 1 });
  });
});
