import { describe, expect, it } from "vitest";
import {
  getSegmentRectangleIntersectionRatio,
  getVisibleSegmentRatio,
  hasClearLineOfSight,
  segmentIntersectsRectangle,
} from "@/game/visibility";

describe("keeper line of sight", () => {
  const wall = { x: 90, y: 20, width: 20, height: 160 };

  it("blocks a player behind a wall", () => {
    expect(
      hasClearLineOfSight({ x: 20, y: 100 }, { x: 180, y: 100 }, [wall]),
    ).toBe(false);
  });

  it("keeps an open corridor visible", () => {
    expect(
      hasClearLineOfSight({ x: 20, y: 200 }, { x: 180, y: 200 }, [wall]),
    ).toBe(true);
  });

  it("returns the first wall intersection for the visible cone", () => {
    expect(
      getSegmentRectangleIntersectionRatio(
        { x: 0, y: 100 },
        { x: 200, y: 100 },
        wall,
      ),
    ).toBeCloseTo(0.45);
    expect(
      segmentIntersectsRectangle(
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        wall,
      ),
    ).toBe(false);
  });

  it("clips each vision ray at its nearest blocker", () => {
    expect(
      getVisibleSegmentRatio(
        { x: 0, y: 100 },
        { x: 200, y: 100 },
        [
          { x: 140, y: 20, width: 20, height: 160 },
          wall,
        ],
      ),
    ).toBeCloseTo(0.45);
    expect(
      getVisibleSegmentRatio(
        { x: 0, y: 200 },
        { x: 200, y: 200 },
        [wall],
      ),
    ).toBe(1);
  });
});
