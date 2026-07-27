export const KEEPER_LEVEL_IDS = [1, 2, 3, 4, 5, 6] as const;

export type KeeperLevelId = (typeof KEEPER_LEVEL_IDS)[number];
export type KeeperPatrolAxis = "horizontal" | "vertical";
export type KeeperSecurityDoorMethod = "keycard" | "usb";
export const KEEPER_DOCUMENT_PICKUP_RADIUS = 64;

export interface KeeperPoint {
  x: number;
  y: number;
}

export interface KeeperDocumentPlacement extends KeeperPoint {
  filename: string;
  id: "report" | "budget" | "idList";
  pickupRadius?: number;
  texture: "budgetDocument" | "idListDocument" | "reportDocument";
}

export interface KeeperGuardPlacement extends KeeperPoint {
  axis: KeeperPatrolAxis;
  direction: -1 | 1;
  maximum: number;
  minimum: number;
}

export interface KeeperCameraPlacement extends KeeperPoint {
  angle: number;
  range: number;
  speed: number;
  sweep: number;
}

export interface KeeperSecurityDoor {
  height: number;
  method: KeeperSecurityDoorMethod;
  width: number;
  x: number;
  y: number;
}

export interface KeeperRoomPlacement {
  centerX: number;
  centerY: number;
  doorSide: "bottom" | "left" | "right" | "top";
  height: number;
  label: string;
  width: number;
}

export interface KeeperLevelConfig {
  breaker?: KeeperPoint;
  cameras: KeeperCameraPlacement[];
  documents: KeeperDocumentPlacement[];
  exit: KeeperPoint;
  guards: KeeperGuardPlacement[];
  id: KeeperLevelId;
  intro: string;
  keycard?: KeeperPoint;
  playerStart: KeeperPoint;
  rooms: KeeperRoomPlacement[];
  securityDoor?: KeeperSecurityDoor;
  timeLimit: number;
  title: string;
  terminal?: KeeperPoint;
  usb?: KeeperPoint;
  worldHeight: number;
  worldWidth: number;
}

const BASE_DOCUMENTS: KeeperDocumentPlacement[] = [
  {
    filename: "REPORT.XLSX",
    id: "report",
    pickupRadius: KEEPER_DOCUMENT_PICKUP_RADIUS,
    texture: "reportDocument",
    x: 350,
    y: 350,
  },
  {
    filename: "BUDGET.XLSX",
    id: "budget",
    pickupRadius: KEEPER_DOCUMENT_PICKUP_RADIUS,
    texture: "budgetDocument",
    x: 300,
    y: 710,
  },
  {
    filename: "ID_LIST.XLSX",
    id: "idList",
    pickupRadius: KEEPER_DOCUMENT_PICKUP_RADIUS,
    texture: "idListDocument",
    x: 1_055,
    y: 185,
  },
];

export const KEEPER_LEVELS: Record<KeeperLevelId, KeeperLevelConfig> = {
  1: {
    cameras: [],
    documents: [
      { ...BASE_DOCUMENTS[0], x: 500, y: 430 },
      BASE_DOCUMENTS[1],
      BASE_DOCUMENTS[2],
    ],
    exit: { x: 1_250, y: 700 },
    guards: [
      {
        axis: "horizontal",
        direction: 1,
        maximum: 1_080,
        minimum: 620,
        x: 690,
        y: 355,
      },
    ],
    id: 1,
    intro: "업무 파일을 모두 회수하고 EXIT로 탈출하세요.",
    playerStart: { x: 105, y: 205 },
    rooms: [
      {
        centerX: 1_055,
        centerY: 185,
        doorSide: "bottom",
        height: 280,
        label: "MEETING ROOM",
        width: 560,
      },
      {
        centerX: 300,
        centerY: 710,
        doorSide: "top",
        height: 300,
        label: "RECORDS",
        width: 500,
      },
    ],
    timeLimit: 90,
    title: "야근 사무실",
    worldHeight: 940,
    worldWidth: 1_400,
  },
  2: {
    cameras: [],
    documents: [
      { ...BASE_DOCUMENTS[0], x: 940, y: 500 },
      { ...BASE_DOCUMENTS[1], x: 300, y: 720 },
      { ...BASE_DOCUMENTS[2], x: 1_050, y: 210 },
    ],
    exit: { x: 1_460, y: 850 },
    guards: [
      {
        axis: "horizontal",
        direction: 1,
        maximum: 1_080,
        minimum: 620,
        x: 690,
        y: 355,
      },
    ],
    id: 2,
    intro: "보안카드를 획득하면 잠긴 문을 열 수 있습니다.",
    keycard: { x: 760, y: 365 },
    playerStart: { x: 105, y: 205 },
    rooms: [
      {
        centerX: 260,
        centerY: 220,
        doorSide: "right",
        height: 300,
        label: "ADMIN",
        width: 420,
      },
      {
        centerX: 300,
        centerY: 720,
        doorSide: "top",
        height: 300,
        label: "SECURE ARCHIVE",
        width: 480,
      },
      {
        centerX: 1_050,
        centerY: 210,
        doorSide: "bottom",
        height: 300,
        label: "CONFERENCE",
        width: 450,
      },
    ],
    securityDoor: {
      height: 38,
      method: "keycard",
      width: 90,
      x: 300,
      y: 570,
    },
    timeLimit: 95,
    title: "보안 구역",
    worldHeight: 980,
    worldWidth: 1_580,
  },
  3: {
    cameras: [],
    documents: [
      { ...BASE_DOCUMENTS[0], x: 900, y: 350 },
      { ...BASE_DOCUMENTS[1], x: 300, y: 760 },
      { ...BASE_DOCUMENTS[2], x: 1_570, y: 380 },
    ],
    exit: { x: 1_640, y: 900 },
    guards: [
      {
        axis: "horizontal",
        direction: 1,
        maximum: 1_080,
        minimum: 620,
        x: 690,
        y: 355,
      },
      {
        axis: "vertical",
        direction: 1,
        maximum: 850,
        minimum: 250,
        x: 1_320,
        y: 410,
      },
    ],
    id: 3,
    intro: "USB로 보안 단말기를 해킹해 우회로를 여세요.",
    playerStart: { x: 105, y: 205 },
    rooms: [
      {
        centerX: 250,
        centerY: 230,
        doorSide: "bottom",
        height: 280,
        label: "RECORDS",
        width: 380,
      },
      {
        centerX: 300,
        centerY: 760,
        doorSide: "top",
        height: 300,
        label: "LOCKED OFFICE",
        width: 460,
      },
      {
        centerX: 1_570,
        centerY: 380,
        doorSide: "bottom",
        height: 330,
        label: "DATA ARCHIVE",
        width: 330,
      },
    ],
    securityDoor: {
      height: 38,
      method: "usb",
      width: 90,
      x: 300,
      y: 610,
    },
    terminal: { x: 1_470, y: 820 },
    timeLimit: 105,
    title: "유지보수 우회로",
    usb: { x: 560, y: 610 },
    worldHeight: 1_040,
    worldWidth: 1_760,
  },
  4: {
    cameras: [
      { angle: 0, range: 270, speed: 0.72, sweep: 0.75, x: 1_040, y: 340 },
      {
        angle: Math.PI / 2,
        range: 285,
        speed: 0.58,
        sweep: 0.62,
        x: 1_520,
        y: 340,
      },
    ],
    documents: [
      { ...BASE_DOCUMENTS[0], x: 760, y: 245 },
      { ...BASE_DOCUMENTS[1], x: 1_480, y: 760 },
      { ...BASE_DOCUMENTS[2], x: 1_730, y: 430 },
    ],
    exit: { x: 1_820, y: 950 },
    guards: [
      {
        axis: "horizontal",
        direction: 1,
        maximum: 1_080,
        minimum: 620,
        x: 690,
        y: 355,
      },
      {
        axis: "vertical",
        direction: 1,
        maximum: 950,
        minimum: 470,
        x: 1_080,
        y: 560,
      },
    ],
    id: 4,
    intro: "CCTV의 회전 방향과 감지 시간을 확인하세요.",
    playerStart: { x: 105, y: 205 },
    rooms: [
      {
        centerX: 260,
        centerY: 240,
        doorSide: "right",
        height: 320,
        label: "INTAKE",
        width: 400,
      },
      {
        centerX: 950,
        centerY: 270,
        doorSide: "bottom",
        height: 280,
        label: "SURVEILLANCE HALL",
        width: 760,
      },
      {
        centerX: 1_730,
        centerY: 430,
        doorSide: "left",
        height: 380,
        label: "ARCHIVE",
        width: 330,
      },
      {
        centerX: 1_400,
        centerY: 830,
        doorSide: "left",
        height: 300,
        label: "ANALYSIS",
        width: 430,
      },
    ],
    timeLimit: 110,
    title: "감시 복도",
    worldHeight: 1_100,
    worldWidth: 1_940,
  },
  5: {
    breaker: { x: 1_570, y: 960 },
    cameras: [
      { angle: 0, range: 280, speed: 0.74, sweep: 0.78, x: 1_040, y: 340 },
      {
        angle: Math.PI / 2,
        range: 300,
        speed: 0.62,
        sweep: 0.7,
        x: 1_520,
        y: 350,
      },
      {
        angle: Math.PI,
        range: 290,
        speed: 0.54,
        sweep: 0.66,
        x: 1_900,
        y: 710,
      },
    ],
    documents: [
      { ...BASE_DOCUMENTS[0], x: 850, y: 240 },
      { ...BASE_DOCUMENTS[1], x: 1_380, y: 640 },
      { ...BASE_DOCUMENTS[2], x: 1_930, y: 430 },
    ],
    exit: { x: 2_000, y: 1_010 },
    guards: [
      {
        axis: "horizontal",
        direction: 1,
        maximum: 1_080,
        minimum: 620,
        x: 690,
        y: 355,
      },
      {
        axis: "vertical",
        direction: 1,
        maximum: 1_000,
        minimum: 350,
        x: 1_250,
        y: 520,
      },
      {
        axis: "horizontal",
        direction: -1,
        maximum: 2_050,
        minimum: 1_800,
        x: 1_900,
        y: 850,
      },
    ],
    id: 5,
    intro: "전기실의 차단기로 CCTV 전원을 끌 수 있습니다.",
    playerStart: { x: 105, y: 205 },
    rooms: [
      {
        centerX: 260,
        centerY: 250,
        doorSide: "bottom",
        height: 320,
        label: "OPERATIONS",
        width: 420,
      },
      {
        centerX: 850,
        centerY: 240,
        doorSide: "right",
        height: 300,
        label: "CONTROL",
        width: 520,
      },
      {
        centerX: 1_590,
        centerY: 930,
        doorSide: "left",
        height: 300,
        label: "POWER ROOM",
        width: 360,
      },
      {
        centerX: 1_930,
        centerY: 430,
        doorSide: "bottom",
        height: 360,
        label: "SECURE DATA",
        width: 340,
      },
    ],
    timeLimit: 120,
    title: "전력 차단",
    worldHeight: 1_160,
    worldWidth: 2_120,
  },
  6: {
    cameras: [
      { angle: 0, range: 290, speed: 0.8, sweep: 0.8, x: 1_040, y: 340 },
      {
        angle: Math.PI / 2,
        range: 305,
        speed: 0.66,
        sweep: 0.72,
        x: 1_480,
        y: 350,
      },
      {
        angle: Math.PI,
        range: 300,
        speed: 0.6,
        sweep: 0.7,
        x: 1_850,
        y: 700,
      },
      {
        angle: -Math.PI / 2,
        range: 310,
        speed: 0.7,
        sweep: 0.68,
        x: 2_120,
        y: 900,
      },
      {
        angle: Math.PI,
        range: 275,
        speed: 0.58,
        sweep: 0.6,
        x: 2_080,
        y: 430,
      },
    ],
    documents: [
      { ...BASE_DOCUMENTS[0], x: 1_040, y: 230 },
      { ...BASE_DOCUMENTS[1], x: 1_800, y: 900 },
      { ...BASE_DOCUMENTS[2], x: 2_090, y: 430 },
    ],
    exit: { x: 2_180, y: 1_070 },
    guards: [
      {
        axis: "horizontal",
        direction: 1,
        maximum: 1_080,
        minimum: 620,
        x: 690,
        y: 355,
      },
      {
        axis: "vertical",
        direction: 1,
        maximum: 1_000,
        minimum: 450,
        x: 1_250,
        y: 500,
      },
      {
        axis: "horizontal",
        direction: -1,
        maximum: 2_150,
        minimum: 1_450,
        x: 1_900,
        y: 700,
      },
      {
        axis: "vertical",
        direction: -1,
        maximum: 580,
        minimum: 300,
        x: 2_150,
        y: 500,
      },
    ],
    id: 6,
    intro: "USB로 CCTV를 20초간 멈추고 중앙 서버 파일을 회수하세요.",
    playerStart: { x: 105, y: 205 },
    rooms: [
      {
        centerX: 280,
        centerY: 250,
        doorSide: "right",
        height: 340,
        label: "ENTRY CONTROL",
        width: 440,
      },
      {
        centerX: 910,
        centerY: 250,
        doorSide: "bottom",
        height: 320,
        label: "SECURITY HUB",
        width: 600,
      },
      {
        centerX: 1_720,
        centerY: 930,
        doorSide: "top",
        height: 340,
        label: "NETWORK CONTROL",
        width: 420,
      },
      {
        centerX: 2_090,
        centerY: 430,
        doorSide: "left",
        height: 400,
        label: "CENTRAL SERVER",
        width: 360,
      },
    ],
    terminal: { x: 1_720, y: 980 },
    timeLimit: 130,
    title: "중앙 서버 침투",
    usb: { x: 560, y: 610 },
    worldHeight: 1_220,
    worldWidth: 2_300,
  },
};

export function isKeeperLevelId(value: unknown): value is KeeperLevelId {
  return (
    typeof value === "number" &&
    KEEPER_LEVEL_IDS.includes(value as KeeperLevelId)
  );
}

export function getNextKeeperLevel(
  level: KeeperLevelId,
): KeeperLevelId | null {
  const index = KEEPER_LEVEL_IDS.indexOf(level);
  return KEEPER_LEVEL_IDS[index + 1] ?? null;
}
