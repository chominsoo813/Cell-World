import { describe, expect, it } from "vitest";
import {
  KEEPER_DOCUMENT_PICKUP_RADIUS,
  getNextKeeperLevel,
  KEEPER_LEVEL_IDS,
  KEEPER_LEVELS,
} from "@/game/keeperLevels";
import {
  KEEPER_MISSION_EXIT_ROOM,
  KEEPER_WALL_THICKNESS,
} from "@/game/keeperLayout";

describe("Keeper level progression", () => {
  it("introduces one security lesson at a time", () => {
    expect(KEEPER_LEVELS[1].keycard).toBeUndefined();
    expect(KEEPER_LEVELS[2].securityDoor?.method).toBe("keycard");
    expect(KEEPER_LEVELS[3].securityDoor?.method).toBe("usb");
    expect(KEEPER_LEVELS[4].cameras.length).toBeGreaterThan(0);
    expect(KEEPER_LEVELS[5].breaker).toBeDefined();
    expect(KEEPER_LEVELS[6].usb).toBeDefined();
    expect(KEEPER_LEVELS[6].terminal).toBeDefined();
  });

  it("increases map size and security pressure", () => {
    for (let index = 1; index < KEEPER_LEVEL_IDS.length; index += 1) {
      const previous = KEEPER_LEVELS[KEEPER_LEVEL_IDS[index - 1]];
      const current = KEEPER_LEVELS[KEEPER_LEVEL_IDS[index]];

      expect(current.worldWidth).toBeGreaterThan(previous.worldWidth);
      expect(current.guards.length).toBeGreaterThanOrEqual(
        previous.guards.length,
      );
      expect(current.cameras.length).toBeGreaterThanOrEqual(
        previous.cameras.length,
      );
    }
  });

  it("stops progression after the final level", () => {
    expect(getNextKeeperLevel(1)).toBe(2);
    expect(getNextKeeperLevel(6)).toBeNull();
  });

  it("keeps every expanded exit room inside the map with an approach", () => {
    for (const levelId of KEEPER_LEVEL_IDS.slice(1)) {
      const level = KEEPER_LEVELS[levelId];
      const { halfHeight, halfWidth } = KEEPER_MISSION_EXIT_ROOM;

      expect(level.exit.x - halfWidth).toBeGreaterThanOrEqual(0);
      expect(level.exit.x + halfWidth).toBeLessThanOrEqual(level.worldWidth);
      expect(level.exit.y + halfHeight + KEEPER_WALL_THICKNESS / 2).toBeLessThanOrEqual(
        level.worldHeight,
      );
      expect(level.exit.y - halfHeight).toBeGreaterThan(0);
    }
  });

  it("keeps mission objects and security actors out of the exit room", () => {
    for (const levelId of KEEPER_LEVEL_IDS) {
      const level = KEEPER_LEVELS[levelId];
      const placements = [
        ...level.documents,
        ...level.guards,
        ...level.cameras,
        level.breaker,
        level.keycard,
        level.terminal,
        level.usb,
      ].filter((point) => point !== undefined);

      for (const point of placements) {
        expect(
          Math.hypot(point.x - level.exit.x, point.y - level.exit.y),
        ).toBeGreaterThan(130);
      }
    }
  });

  it("allows furniture documents to be collected from the edge", () => {
    for (const levelId of KEEPER_LEVEL_IDS) {
      for (const document of KEEPER_LEVELS[levelId].documents) {
        expect(document.pickupRadius).toBe(
          KEEPER_DOCUMENT_PICKUP_RADIUS,
        );
      }
    }
  });

  it("keeps document pickup close to the furniture edge", () => {
    expect(KEEPER_DOCUMENT_PICKUP_RADIUS).toBeGreaterThanOrEqual(58);
    expect(KEEPER_DOCUMENT_PICKUP_RADIUS).toBeLessThanOrEqual(68);
  });

  it("keeps every document away from the player start", () => {
    for (const levelId of KEEPER_LEVEL_IDS) {
      const level = KEEPER_LEVELS[levelId];

      for (const document of level.documents) {
        expect(
          Math.hypot(
            document.x - level.playerStart.x,
            document.y - level.playerStart.y,
          ),
          `L${levelId} ${document.filename} is too close to the start`,
        ).toBeGreaterThanOrEqual(320);
      }
    }
  });

  it("keeps collectible access items clear of room walls", () => {
    const wallHalfThickness = KEEPER_WALL_THICKNESS / 2;

    for (const levelId of KEEPER_LEVEL_IDS) {
      const level = KEEPER_LEVELS[levelId];
      const accessItems = [level.keycard, level.usb].filter(
        (point) => point !== undefined,
      );

      for (const item of accessItems) {
        for (const room of level.rooms) {
          const left = room.centerX - room.width / 2;
          const right = room.centerX + room.width / 2;
          const top = room.centerY - room.height / 2;
          const bottom = room.centerY + room.height / 2;
          const overlapsHorizontalWall =
            item.x >= left - wallHalfThickness &&
            item.x <= right + wallHalfThickness &&
            (Math.abs(item.y - top) <= wallHalfThickness ||
              Math.abs(item.y - bottom) <= wallHalfThickness);
          const overlapsVerticalWall =
            item.y >= top - wallHalfThickness &&
            item.y <= bottom + wallHalfThickness &&
            (Math.abs(item.x - left) <= wallHalfThickness ||
              Math.abs(item.x - right) <= wallHalfThickness);

          expect(
            overlapsHorizontalWall || overlapsVerticalWall,
            `L${levelId} access item overlaps ${room.label}`,
          ).toBe(false);
        }
      }
    }
  });

  it("keeps rooms and reserved exit space from overlapping", () => {
    const clearance = KEEPER_WALL_THICKNESS + 8;

    for (const levelId of KEEPER_LEVEL_IDS) {
      const level = KEEPER_LEVELS[levelId];
      const exitRoom = {
        centerX: level.exit.x,
        centerY: level.exit.y,
        height: KEEPER_MISSION_EXIT_ROOM.halfHeight * 2,
        label: "EXIT",
        width: KEEPER_MISSION_EXIT_ROOM.halfWidth * 2,
      };
      const rooms = [...level.rooms, exitRoom];

      for (let firstIndex = 0; firstIndex < rooms.length; firstIndex += 1) {
        const first = rooms[firstIndex];
        expect(first.centerX - first.width / 2).toBeGreaterThanOrEqual(0);
        expect(first.centerY - first.height / 2).toBeGreaterThanOrEqual(0);
        expect(first.centerX + first.width / 2).toBeLessThanOrEqual(
          level.worldWidth,
        );
        expect(first.centerY + first.height / 2).toBeLessThanOrEqual(
          level.worldHeight,
        );

        for (
          let secondIndex = firstIndex + 1;
          secondIndex < rooms.length;
          secondIndex += 1
        ) {
          const second = rooms[secondIndex];
          const overlapsX =
            Math.abs(first.centerX - second.centerX) <
            (first.width + second.width) / 2 + clearance;
          const overlapsY =
            Math.abs(first.centerY - second.centerY) <
            (first.height + second.height) / 2 + clearance;

          expect(
            overlapsX && overlapsY,
            `L${levelId} ${first.label} overlaps ${second.label}`,
          ).toBe(false);
        }
      }
    }
  });
});
