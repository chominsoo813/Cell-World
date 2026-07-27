export const KEEPER_WORLD_WIDTH = 1_400;
export const KEEPER_WORLD_HEIGHT = 940;
export const KEEPER_WALL_THICKNESS = 38;
export const KEEPER_CAMERA_LENS_OFFSET = 14;
export const KEEPER_MISSION_EXIT_ROOM = {
  entranceWidth: 90,
  halfHeight: 100,
  halfWidth: 90,
} as const;

export const KEEPER_PLAYER_FOOTPRINT = {
  height: 118 * 0.22,
  width: 92 * 0.22,
} as const;

export const KEEPER_SOLID_PROP_COLLIDERS = {
  conferenceChair: { height: 32, offsetY: 7, width: 34 },
  officeChair: { height: 34, offsetY: 8, width: 36 },
  plant: { height: 30, offsetY: 8, width: 28 },
  waterDispenser: { height: 40, offsetY: 6, width: 28 },
} as const;

export const KEEPER_PUSHABLE_PROPS = [
  "conferenceChair",
  "officeChair",
] as const;

export type KeeperSolidProp =
  keyof typeof KEEPER_SOLID_PROP_COLLIDERS;
export type KeeperPushableProp =
  (typeof KEEPER_PUSHABLE_PROPS)[number];

export function getKeeperCameraLensPoint(
  point: { x: number; y: number },
  angle: number,
) {
  return {
    x: point.x + Math.cos(angle) * KEEPER_CAMERA_LENS_OFFSET,
    y: point.y + Math.sin(angle) * KEEPER_CAMERA_LENS_OFFSET,
  };
}

interface BottomDoorLayout {
  centerX: number;
  leftWall: {
    centerX: number;
    length: number;
  };
  rightWall: {
    centerX: number;
    length: number;
  };
  y: number;
}

export const KEEPER_BOTTOM_DOORS = {
  executive: {
    centerX: 250,
    leftWall: { centerX: 130, length: 150 },
    rightWall: { centerX: 370, length: 150 },
    y: 800,
  },
  exit: {
    centerX: 1_190,
    leftWall: { centerX: 1_075, length: 130 },
    rightWall: { centerX: 1_305, length: 130 },
    y: 805,
  },
} as const satisfies Record<string, BottomDoorLayout>;

export function getKeeperDoorwayWidth(door: BottomDoorLayout) {
  const leftEdge =
    door.leftWall.centerX + door.leftWall.length / 2;
  const rightEdge =
    door.rightWall.centerX - door.rightWall.length / 2;
  return rightEdge - leftEdge;
}

export function getKeeperDoorApproachDepth(door: BottomDoorLayout) {
  const wallBottom = door.y + KEEPER_WALL_THICKNESS / 2;
  return KEEPER_WORLD_HEIGHT - wallBottom;
}
