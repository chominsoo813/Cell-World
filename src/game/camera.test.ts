import { describe, expect, it } from "vitest";
import { getCoveringCameraZoom } from "@/game/camera";

describe("RPG stage camera", () => {
  it("zooms a wide viewport until the current stage covers both edges", () => {
    expect(getCoveringCameraZoom(1_536, 552, 1_164, 704)).toBeCloseTo(
      1_536 / 1_164,
    );
  });

  it("uses the vertical ratio for a tall viewport", () => {
    expect(getCoveringCameraZoom(720, 1_080, 1_164, 704)).toBeCloseTo(
      1_080 / 704,
    );
  });

  it("does not zoom below the configured minimum", () => {
    expect(getCoveringCameraZoom(800, 500, 1_164, 704)).toBe(1);
  });
});
