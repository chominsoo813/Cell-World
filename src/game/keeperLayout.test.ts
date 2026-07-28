import { describe, expect, it } from "vitest";
import {
  getKeeperCameraLensPoint,
  getKeeperDoorApproachDepth,
  getKeeperDoorwayWidth,
  KEEPER_BOTTOM_DOORS,
  KEEPER_PLAYER_FOOTPRINT,
  KEEPER_PUSHABLE_PROPS,
  KEEPER_SOLID_PROP_COLLIDERS,
} from "@/game/keeperLayout";

describe("Keeper room entrances", () => {
  it.each(Object.entries(KEEPER_BOTTOM_DOORS))(
    "keeps the %s room doorway wide enough for the player",
    (_room, door) => {
      expect(getKeeperDoorwayWidth(door)).toBeGreaterThan(
        KEEPER_PLAYER_FOOTPRINT.width * 3,
      );
    },
  );

  it.each(Object.entries(KEEPER_BOTTOM_DOORS))(
    "keeps enough approach space below the %s room",
    (_room, door) => {
      expect(getKeeperDoorApproachDepth(door)).toBeGreaterThan(
        KEEPER_PLAYER_FOOTPRINT.height * 4,
      );
    },
  );
});

describe("Keeper solid furniture", () => {
  it.each([
    "conferenceChair",
    "officeChair",
    "plant",
    "waterDispenser",
  ] as const)("defines a collision footprint for %s", (prop) => {
    const collider = KEEPER_SOLID_PROP_COLLIDERS[prop];

    expect(collider.width).toBeGreaterThan(0);
    expect(collider.height).toBeGreaterThan(0);
  });

  it("keeps both chair types pushable", () => {
    expect(KEEPER_PUSHABLE_PROPS).toEqual([
      "conferenceChair",
      "officeChair",
    ]);
  });
});

describe("Keeper CCTV geometry", () => {
  it("starts the vision cone in front of the camera lens", () => {
    expect(getKeeperCameraLensPoint({ x: 100, y: 200 }, 0)).toEqual({
      x: 114,
      y: 200,
    });
    expect(
      getKeeperCameraLensPoint({ x: 100, y: 200 }, Math.PI / 2).y,
    ).toBeCloseTo(214);
  });
});
