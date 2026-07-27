import * as Phaser from "phaser";
import {
  getKeeperCameraLensPoint,
  KEEPER_MISSION_EXIT_ROOM,
  KEEPER_SOLID_PROP_COLLIDERS,
  type KeeperPushableProp,
  type KeeperSolidProp,
} from "@/game/keeperLayout";
import {
  KEEPER_LEVELS,
  type KeeperCameraPlacement,
  type KeeperDocumentPlacement,
  type KeeperLevelConfig,
  type KeeperPatrolAxis,
  type KeeperPoint,
  type KeeperRoomPlacement,
} from "@/game/keeperLevels";
import {
  getVisibleSegmentRatio,
  hasClearLineOfSight,
  type Rectangle,
} from "@/game/visibility";
import {
  useGameStore,
  type KeeperDocumentId,
} from "@/stores/gameStore";

const ASSET_BASE = "/assets/pixel-art/office-escape";

type ArcadeCollisionObject = Parameters<
  Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
>[0];

interface MovementKeys {
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
}

interface GuardPatrol {
  axis: KeeperPatrolAxis;
  direction: -1 | 1;
  investigationTarget?: KeeperPoint;
  maximum: number;
  minimum: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  vision: Phaser.GameObjects.Image;
}

interface CameraWatch {
  config: KeeperCameraPlacement;
  detectedSince: number | null;
  sprite: Phaser.GameObjects.Image;
  vision: Phaser.GameObjects.Graphics;
}

const ASSETS = {
  playerFront: "characters/player_front.png",
  playerBack: "characters/player_back.png",
  playerLeft: "characters/player_left.png",
  playerRight: "characters/player_right.png",
  guardFront: "characters/guard_front.png",
  guardBack: "characters/guard_back.png",
  guardLeft: "characters/guard_left.png",
  guardRight: "characters/guard_right.png",
  officeDesk: "furniture/office_desk.png",
  computerMonitor: "furniture/computer_monitor.png",
  keyboard: "furniture/keyboard.png",
  officeChair: "furniture/office_chair_green.png",
  conferenceTable: "furniture/conference_table_set.png",
  conferenceChair: "furniture/conference_chair_blue.png",
  executiveDesk: "furniture/executive_desk.png",
  copier: "furniture/copier_printer.png",
  waterDispenser: "furniture/water_dispenser.png",
  plant: "furniture/potted_plant.png",
  powerBreaker: "furniture/cctv_power_breaker.png",
  bookshelf: "furniture/bookshelf.png",
  filingCabinet: "furniture/filing_cabinet.png",
  sofa: "furniture/office_sofa.png",
  coffeeTable: "furniture/coffee_table.png",
  exitDoor: "furniture/exit_door.png",
  partitionWall: "furniture/partition_wall.png",
  reportDocument: "mission-ui/report_document.png",
  budgetDocument: "mission-ui/budget_document.png",
  idListDocument: "mission-ui/id_list_document.png",
  usbDrive: "mission-ui/usb_drive.png",
  keycard: "mission-ui/keycard.png",
  itemHighlight: "mission-ui/item_highlight.png",
  exitArrow: "mission-ui/exit_arrow.png",
  officeClock: "mission-ui/office_clock.png",
  cctvCamera: "mission-ui/cctv_camera.png",
  alarmSiren: "mission-ui/alarm_siren.png",
  guardVisionCone: "mission-ui/guard_vision_cone.png",
  alertExclamation: "mission-ui/alert_exclamation.png",
  carpetTile: "mission-ui/carpet_tile.png",
  wallStraight: "mission-ui/wall_straight.png",
  wallCorner: "mission-ui/wall_corner.png",
  doorwayThreshold: "mission-ui/doorway_threshold.png",
} as const;

export class CellOfficeKeeperScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys?: MovementKeys;
  private player?: Phaser.Physics.Arcade.Sprite;
  private documents?: Phaser.Physics.Arcade.StaticGroup;
  private boosters?: Phaser.Physics.Arcade.StaticGroup;
  private devices?: Phaser.Physics.Arcade.StaticGroup;
  private chairs?: Phaser.Physics.Arcade.Group;
  private exitZone?: Phaser.Physics.Arcade.Image;
  private exitArrow?: Phaser.GameObjects.Image;
  private alarmSiren?: Phaser.GameObjects.Image;
  private objectiveLabel?: Phaser.GameObjects.Text;
  private visionBlockers?: Phaser.Physics.Arcade.StaticGroup;
  private guards: GuardPatrol[] = [];
  private cameraWatches: CameraWatch[] = [];
  private level: KeeperLevelConfig = KEEPER_LEVELS[1];
  private collectedDocuments = new Set<KeeperDocumentId>();
  private remainingMilliseconds = KEEPER_LEVELS[1].timeLimit * 1000;
  private lastReportedSecond = -1;
  private lastDetectionAt = -2000;
  private camerasDisabledUntil = 0;
  private powerOffline = false;
  private usbAvailable = false;
  private securityDoorImage?: Phaser.GameObjects.Image;
  private securityDoorCollider?: Phaser.GameObjects.Rectangle;
  private runStatus: "playing" | "won" | "lost" = "playing";

  constructor() {
    super("cell-office-keeper");
  }

  preload() {
    for (const [key, file] of Object.entries(ASSETS)) {
      this.load.image(`keeper-${key}`, `${ASSET_BASE}/${file}`);
    }
  }

  create() {
    this.level =
      KEEPER_LEVELS[useGameStore.getState().keeperLevel] ?? KEEPER_LEVELS[1];
    this.resetRuntimeState();
    this.physics.world.setBounds(
      0,
      0,
      this.level.worldWidth,
      this.level.worldHeight,
    );
    this.cameras.main.setBounds(
      0,
      0,
      this.level.worldWidth,
      this.level.worldHeight,
    );

    this.drawOfficeFloor();
    const obstacles = this.physics.add.staticGroup();
    this.visionBlockers = obstacles;
    this.chairs = this.physics.add.group({ allowGravity: false });
    this.buildOffice(obstacles);
    this.physics.add.collider(this.chairs, obstacles);
    this.physics.add.collider(this.chairs, this.chairs);
    this.createMissionObjects();
    this.createSecuritySystems(obstacles);
    this.createExit();
    this.createGuards(obstacles);
    this.createPlayer(obstacles);
    this.createControls();
    this.createObjectiveLabel();

    if (!this.player) {
      throw new Error("Cell Office Keeper player failed to initialize.");
    }
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    useGameStore.getState().updateKeeper({
      alerts: 0,
      collectedDocuments: [],
      documents: 0,
      status: "playing",
      timeRemaining: this.level.timeLimit,
    });
  }

  update(_time: number, delta: number) {
    if (
      !this.player ||
      !this.cursors ||
      !this.movementKeys ||
      this.runStatus !== "playing"
    ) {
      return;
    }

    this.updatePlayerMovement();
    this.updateChairs();
    this.collectNearbyDocuments();
    this.updateGuards();
    this.updateCameras();
    this.updateTimer(delta);
  }

  private resetRuntimeState() {
    this.guards = [];
    this.cameraWatches = [];
    this.collectedDocuments = new Set<KeeperDocumentId>();
    this.remainingMilliseconds = this.level.timeLimit * 1000;
    this.lastReportedSecond = -1;
    this.lastDetectionAt = -2000;
    this.camerasDisabledUntil = 0;
    this.powerOffline = false;
    this.usbAvailable = false;
    this.securityDoorImage = undefined;
    this.securityDoorCollider = undefined;
    this.chairs = undefined;
    this.runStatus = "playing";
    this.visionBlockers = undefined;
  }

  private drawOfficeFloor() {
    this.add
      .tileSprite(
        this.level.worldWidth / 2,
        this.level.worldHeight / 2,
        this.level.worldWidth,
        this.level.worldHeight,
        "keeper-carpetTile",
      )
      .setTileScale(0.22)
      .setDepth(0);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0xb6c9d4, 0.06);
    for (let x = 0; x <= this.level.worldWidth; x += 44) {
      grid.lineBetween(x, 0, x, this.level.worldHeight);
    }
    for (let y = 0; y <= this.level.worldHeight; y += 44) {
      grid.lineBetween(0, y, this.level.worldWidth, y);
    }

    this.add
      .text(
        24,
        64,
        `CELL OFFICE / L${this.level.id} ${this.level.title.toUpperCase()}`,
        {
        color: "#dce8ee",
        fontFamily: '"Courier New", monospace',
        fontSize: "12px",
        fontStyle: "bold",
        stroke: "#17252c",
        strokeThickness: 4,
        },
      )
      .setDepth(1000);
  }

  private buildOffice(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    for (const room of this.level.rooms) {
      this.addRoomFrame(obstacles, room);
    }
    switch (this.level.id) {
      case 1:
        this.buildLevelOneOffice(obstacles);
        break;
      case 2:
        this.buildLevelTwoOffice(obstacles);
        break;
      case 3:
        this.buildLevelThreeOffice(obstacles);
        break;
      case 4:
        this.buildLevelFourOffice(obstacles);
        break;
      case 5:
        this.buildLevelFiveOffice(obstacles);
        break;
      case 6:
        this.buildLevelSixOffice(obstacles);
        break;
    }
    this.addMissionExitRoom(obstacles);
  }

  private buildLevelOneOffice(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.addSolidProp(obstacles, 72, 105, "waterDispenser", 0.44);
    this.addSolidProp(obstacles, 128, 112, "plant", 0.42);
    this.addWorkstation(obstacles, 230, 175);
    this.addWorkstation(obstacles, 500, 175);
    this.addWorkstation(obstacles, 230, 430);
    this.addWorkstation(obstacles, 500, 430);
    this.addMeetingSet(obstacles, 1_055, 185);
    this.addProp(300, 705, "executiveDesk", 0.58);
    this.addObstacle(obstacles, 300, 720, 126, 58);
    this.addProp(760, 700, "coffeeTable", 0.48);
    this.addObstacle(obstacles, 760, 712, 96, 38);
    this.addSolidProp(obstacles, 850, 690, "plant", 0.36);
  }

  private buildLevelTwoOffice(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.addWorkstation(obstacles, 240, 210);
    this.addProp(300, 720, "executiveDesk", 0.58);
    this.addObstacle(obstacles, 300, 735, 126, 58);
    this.addMeetingSet(obstacles, 1_050, 210);
    this.addWorkstation(obstacles, 680, 430);
    this.addWorkstation(obstacles, 940, 500);
    this.addWorkstation(obstacles, 1_220, 520);
    this.addSolidProp(obstacles, 760, 220, "waterDispenser", 0.42);
    this.addSolidProp(obstacles, 1_310, 250, "plant", 0.36);
  }

  private buildLevelThreeOffice(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.addProp(250, 230, "filingCabinet", 0.4);
    this.addObstacle(obstacles, 250, 247, 44, 70);
    this.addProp(300, 760, "executiveDesk", 0.58);
    this.addObstacle(obstacles, 300, 775, 126, 58);
    this.addProp(1_570, 370, "bookshelf", 0.42);
    this.addObstacle(obstacles, 1_570, 385, 62, 76);
    this.addWorkstation(obstacles, 620, 220);
    this.addWorkstation(obstacles, 900, 350);
    this.addWorkstation(obstacles, 650, 520);
    this.addWorkstation(obstacles, 1_080, 650);
    this.addProp(1_300, 760, "copier", 0.46);
    this.addObstacle(obstacles, 1_300, 777, 70, 70);
    this.addSolidProp(obstacles, 1_250, 240, "plant", 0.36);
  }

  private buildLevelFourOffice(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.addWorkstation(obstacles, 250, 230);
    this.addWorkstation(obstacles, 760, 245);
    this.addWorkstation(obstacles, 1_100, 245);
    this.addProp(1_730, 430, "bookshelf", 0.42);
    this.addObstacle(obstacles, 1_730, 445, 62, 76);
    this.addWorkstation(obstacles, 1_470, 740);
    this.addProp(660, 760, "sofa", 0.58);
    this.addObstacle(obstacles, 660, 775, 154, 60);
    this.addProp(900, 690, "copier", 0.46);
    this.addObstacle(obstacles, 900, 707, 70, 70);
    this.addSolidProp(obstacles, 980, 850, "plant", 0.36);
  }

  private buildLevelFiveOffice(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.addWorkstation(obstacles, 250, 240);
    this.addMeetingSet(obstacles, 850, 240);
    this.addProp(1_930, 430, "bookshelf", 0.42);
    this.addObstacle(obstacles, 1_930, 445, 62, 76);
    this.addWorkstation(obstacles, 1_330, 300);
    this.addWorkstation(obstacles, 1_380, 640);
    this.addWorkstation(obstacles, 1_760, 690);
    this.addProp(660, 760, "copier", 0.46);
    this.addObstacle(obstacles, 660, 777, 70, 70);
    this.addSolidProp(obstacles, 1_100, 850, "waterDispenser", 0.42);
  }

  private buildLevelSixOffice(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.addWorkstation(obstacles, 270, 240);
    this.addWorkstation(obstacles, 760, 230);
    this.addWorkstation(obstacles, 1_040, 230);
    this.addWorkstation(obstacles, 1_650, 900);
    this.addProp(2_090, 430, "bookshelf", 0.42);
    this.addObstacle(obstacles, 2_090, 445, 62, 76);
    this.addWorkstation(obstacles, 1_350, 330);
    this.addWorkstation(obstacles, 1_420, 650);
    this.addWorkstation(obstacles, 1_850, 650);
    this.addProp(700, 800, "sofa", 0.58);
    this.addObstacle(obstacles, 700, 815, 154, 60);
    this.addProp(1_160, 850, "copier", 0.46);
    this.addObstacle(obstacles, 1_160, 867, 70, 70);
    this.addSolidProp(obstacles, 1_300, 930, "plant", 0.36);
  }

  private addMissionExitRoom(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    const { x, y } = this.level.exit;
    const { halfHeight, halfWidth } = KEEPER_MISSION_EXIT_ROOM;
    const entranceHalfWidth =
      KEEPER_MISSION_EXIT_ROOM.entranceWidth / 2;
    const topY = y - halfHeight;
    const bottomY = y + halfHeight;
    const sideLength = halfHeight * 2;
    const topSegmentLength = halfWidth - entranceHalfWidth;

    this.addWall(obstacles, x - halfWidth, y, sideLength, true);
    this.addWall(obstacles, x + halfWidth, y, sideLength, true);
    this.addWall(obstacles, x, bottomY, halfWidth * 2, false);
    this.addWall(
      obstacles,
      x - (entranceHalfWidth + topSegmentLength / 2),
      topY,
      topSegmentLength,
      false,
    );
    this.addWall(
      obstacles,
      x + (entranceHalfWidth + topSegmentLength / 2),
      topY,
      topSegmentLength,
      false,
    );
    this.addProp(x, topY, "doorwayThreshold", 0.44, 2);
    this.add
      .text(x, y - 44, `LEVEL ${this.level.id} EXIT`, {
        color: "#9effb7",
        fontFamily: '"Courier New", monospace',
        fontSize: "11px",
        fontStyle: "bold",
        stroke: "#17252c",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1000);
    this.alarmSiren = this.addProp(
      x + halfWidth - 34,
      y - halfHeight + 34,
      "alarmSiren",
      0.25,
      4,
    );
  }

  private addRoomFrame(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    room: KeeperRoomPlacement,
  ) {
    const doorWidth = 100;
    const left = room.centerX - room.width / 2;
    const right = room.centerX + room.width / 2;
    const top = room.centerY - room.height / 2;
    const bottom = room.centerY + room.height / 2;

    this.add
      .rectangle(
        room.centerX,
        room.centerY,
        room.width - 38,
        room.height - 38,
        0x183b37,
        0.16,
      )
      .setDepth(2);

    if (room.doorSide === "top") {
      this.addHorizontalWallWithDoor(
        obstacles,
        room.centerX,
        top,
        room.width,
        doorWidth,
        this.shouldDrawDoorThreshold(room.centerX, top),
      );
    } else {
      this.addWall(obstacles, room.centerX, top, room.width, false);
    }
    if (room.doorSide === "bottom") {
      this.addHorizontalWallWithDoor(
        obstacles,
        room.centerX,
        bottom,
        room.width,
        doorWidth,
        this.shouldDrawDoorThreshold(room.centerX, bottom),
      );
    } else {
      this.addWall(obstacles, room.centerX, bottom, room.width, false);
    }
    if (room.doorSide === "left") {
      this.addVerticalWallWithDoor(
        obstacles,
        left,
        room.centerY,
        room.height,
        doorWidth,
        this.shouldDrawDoorThreshold(left, room.centerY),
      );
    } else {
      this.addWall(obstacles, left, room.centerY, room.height, true);
    }
    if (room.doorSide === "right") {
      this.addVerticalWallWithDoor(
        obstacles,
        right,
        room.centerY,
        room.height,
        doorWidth,
        this.shouldDrawDoorThreshold(right, room.centerY),
      );
    } else {
      this.addWall(obstacles, right, room.centerY, room.height, true);
    }

    this.add
      .text(room.centerX, top + 30, room.label, {
        color: "#b9d9cf",
        fontFamily: '"Courier New", monospace',
        fontSize: "11px",
        fontStyle: "bold",
        stroke: "#17252c",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1000);
  }

  private addHorizontalWallWithDoor(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    centerX: number,
    y: number,
    width: number,
    doorWidth: number,
    showThreshold: boolean,
  ) {
    const segmentLength = (width - doorWidth) / 2;
    this.addWall(
      obstacles,
      centerX - doorWidth / 2 - segmentLength / 2,
      y,
      segmentLength,
      false,
    );
    this.addWall(
      obstacles,
      centerX + doorWidth / 2 + segmentLength / 2,
      y,
      segmentLength,
      false,
    );
    if (showThreshold) {
      this.addProp(centerX, y, "doorwayThreshold", 0.44, 2);
    }
  }

  private addVerticalWallWithDoor(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    centerY: number,
    height: number,
    doorWidth: number,
    showThreshold: boolean,
  ) {
    const segmentLength = (height - doorWidth) / 2;
    this.addWall(
      obstacles,
      x,
      centerY - doorWidth / 2 - segmentLength / 2,
      segmentLength,
      true,
    );
    this.addWall(
      obstacles,
      x,
      centerY + doorWidth / 2 + segmentLength / 2,
      segmentLength,
      true,
    );
    if (showThreshold) {
      this.addProp(x, centerY, "doorwayThreshold", 0.44, 2).setRotation(
        Math.PI / 2,
      );
    }
  }

  private shouldDrawDoorThreshold(x: number, y: number) {
    const securityDoor = this.level.securityDoor;
    return (
      !securityDoor ||
      Phaser.Math.Distance.Between(
        x,
        y,
        securityDoor.x,
        securityDoor.y,
      ) > 4
    );
  }

  private addMeetingSet(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
  ) {
    this.addProp(x, y, "conferenceTable", 0.6);
    this.addObstacle(obstacles, x, y + 10, 230, 86);
    this.addPushableChair(x - 150, y + 5, "conferenceChair", 0.34);
    this.addPushableChair(x + 150, y + 5, "conferenceChair", 0.34);
  }

  private addWorkstation(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
  ) {
    this.addProp(x, y, "officeDesk", 0.56);
    this.addProp(x, y - 30, "computerMonitor", 0.34, 2);
    this.addProp(x + 38, y + 2, "keyboard", 0.24, 3);
    this.addPushableChair(x - 48, y + 72, "officeChair", 0.4);
    this.addObstacle(obstacles, x, y + 10, 132, 58);
  }

  private addWall(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    length: number,
    vertical: boolean,
  ) {
    const wall = this.add
      .image(x, y, "keeper-wallStraight")
      .setDisplaySize(length, 38)
      .setRotation(vertical ? Math.PI / 2 : 0)
      .setDepth(y + 20);
    this.addObstacle(
      obstacles,
      x,
      y,
      vertical ? 38 : length,
      vertical ? length : 38,
      true,
    );
    return wall;
  }

  private addProp(
    x: number,
    y: number,
    texture: keyof typeof ASSETS,
    scale: number,
    depthOffset = 0,
  ) {
    return this.add
      .image(x, y, `keeper-${texture}`)
      .setScale(scale)
      .setDepth(y + depthOffset);
  }

  private addSolidProp(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    texture: KeeperSolidProp,
    scale: number,
    depthOffset = 0,
  ) {
    const prop = this.addProp(x, y, texture, scale, depthOffset);
    const collider = KEEPER_SOLID_PROP_COLLIDERS[texture];
    this.addObstacle(
      obstacles,
      x,
      y + collider.offsetY,
      collider.width,
      collider.height,
    );
    return prop;
  }

  private addPushableChair(
    x: number,
    y: number,
    texture: KeeperPushableProp,
    scale: number,
  ) {
    const collider = KEEPER_SOLID_PROP_COLLIDERS[texture];
    const chair = this.chairs
      ?.create(x, y, `keeper-${texture}`)
      .setScale(scale)
      .setDepth(y + 4)
      .setCollideWorldBounds(true)
      .setDrag(520, 520)
      .setMaxVelocity(155, 155)
      .setBounce(0.04) as Phaser.Physics.Arcade.Sprite | undefined;
    chair?.body?.setSize(
      collider.width / scale,
      collider.height / scale,
      true,
    );
    return chair;
  }

  private addObstacle(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
    blocksVision = false,
  ) {
    const collider = this.add
      .rectangle(x, y, width, height, 0x000000, 0)
      .setVisible(false)
      .setData("blocksVision", blocksVision);
    obstacles.add(collider);
    return collider;
  }

  private createMissionObjects() {
    this.documents = this.physics.add.staticGroup();
    for (const document of this.level.documents) {
      this.addDocument(document);
    }

    this.boosters = this.physics.add.staticGroup();
    if (this.level.usb) {
      this.addBooster(
        this.level.usb.x,
        this.level.usb.y,
        "usb",
        "usbDrive",
      );
    }
    if (this.level.keycard) {
      this.addBooster(
        this.level.keycard.x,
        this.level.keycard.y,
        "keycard",
        "keycard",
      );
    }
  }

  private addDocument(definition: KeeperDocumentPlacement) {
    const highlight = this.add
      .image(
        definition.x,
        definition.y,
        "keeper-itemHighlight",
      )
      .setDisplaySize(74, 74)
      .setDepth(definition.y - 2)
      .setAlpha(0.82);
    this.tweens.add({
      targets: highlight,
      alpha: 0.42,
      scaleX: highlight.scaleX * 1.12,
      scaleY: highlight.scaleY * 1.12,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    const document = this.documents
      ?.create(
        definition.x,
        definition.y,
        `keeper-${definition.texture}`,
      )
      .setScale(0.22)
      .setDepth(definition.y + 2)
      .setData("documentId", definition.id)
      .setData("pickupRadius", definition.pickupRadius ?? 0)
      .setData("highlight", highlight) as
      | Phaser.Physics.Arcade.Sprite
      | undefined;
    document?.refreshBody();

    const label = this.add
      .text(definition.x, definition.y - 54, definition.filename, {
        color: "#fff7a8",
        fontFamily: '"Courier New", monospace',
        fontSize: "11px",
        fontStyle: "bold",
        stroke: "#29321f",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1000);
    document?.setData("label", label);
  }

  private collectNearbyDocuments() {
    if (!this.player || !this.documents) {
      return;
    }

    for (const child of this.documents.getChildren()) {
      const document = child as Phaser.Physics.Arcade.Sprite;
      const pickupRadius = Number(document.getData("pickupRadius") ?? 0);
      if (
        document.active &&
        pickupRadius > 0 &&
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          document.x,
          document.y,
        ) <= pickupRadius
      ) {
        this.collectDocumentSprite(document);
      }
    }
  }

  private addBooster(
    x: number,
    y: number,
    id: "keycard" | "usb",
    texture: "keycard" | "usbDrive",
  ) {
    const highlight = this.add
      .image(x, y, "keeper-itemHighlight")
      .setDisplaySize(58, 58)
      .setDepth(y - 2)
      .setAlpha(0.5)
      .setTint(id === "usb" ? 0x75d9ff : 0x87ef9c);
    this.tweens.add({
      targets: highlight,
      alpha: 0.18,
      duration: 620,
      yoyo: true,
      repeat: -1,
    });

    const booster = this.boosters
      ?.create(x, y, `keeper-${texture}`)
      .setScale(id === "usb" ? 0.18 : 0.2)
      .setDepth(y + 2)
      .setData("boosterId", id)
      .setData("highlight", highlight) as
      | Phaser.Physics.Arcade.Sprite
      | undefined;
    booster?.refreshBody();
  }

  private createSecuritySystems(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.devices = this.physics.add.staticGroup();

    if (this.level.securityDoor) {
      const door = this.level.securityDoor;
      this.securityDoorImage = this.add
        .image(door.x, door.y, "keeper-wallStraight")
        .setDisplaySize(door.width, door.height)
        .setTint(0x7f99a8)
        .setDepth(door.y + 22);
      this.securityDoorCollider = this.add
        .rectangle(door.x, door.y, door.width, door.height, 0x000000, 0)
        .setVisible(false)
        .setData("blocksVision", true);
      obstacles.add(this.securityDoorCollider);
      this.add
        .text(
          door.x,
          door.y - 34,
          door.method === "keycard" ? "SECURITY CARD" : "USB ACCESS",
          {
            color: "#ffda75",
            fontFamily: '"Courier New", monospace',
            fontSize: "10px",
            fontStyle: "bold",
            stroke: "#17252c",
            strokeThickness: 4,
          },
        )
        .setOrigin(0.5)
        .setDepth(1000);
    }

    if (this.level.terminal) {
      this.addSecurityDevice(
        this.level.terminal,
        "terminal",
        "computerMonitor",
        "SECURITY TERMINAL",
      );
    }
    if (this.level.breaker) {
      this.addSecurityDevice(
        this.level.breaker,
        "breaker",
        "powerBreaker",
        "POWER BREAKER",
      );
    }

    this.cameraWatches = this.level.cameras.map((camera, index) =>
      this.createCameraWatch(camera, index),
    );
  }

  private addSecurityDevice(
    point: KeeperPoint,
    id: "breaker" | "terminal",
    texture: "computerMonitor" | "powerBreaker",
    labelText: string,
  ) {
    const highlight = this.add
      .image(point.x, point.y, "keeper-itemHighlight")
      .setDisplaySize(
        id === "breaker" ? 72 : 70,
        id === "breaker" ? 88 : 70,
      )
      .setTint(id === "breaker" ? 0xffd66e : 0x75d9ff)
      .setAlpha(0.54)
      .setDepth(point.y - 2);
    this.tweens.add({
      targets: highlight,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const device = this.devices
      ?.create(point.x, point.y, `keeper-${texture}`)
      .setScale(id === "breaker" ? 0.5 : 0.3)
      .setDepth(point.y + 4)
      .setData("deviceId", id)
      .setData("highlight", highlight) as
      | Phaser.Physics.Arcade.Sprite
      | undefined;
    device?.refreshBody();

    const label = this.add
      .text(
        point.x,
        point.y - (id === "breaker" ? 58 : 50),
        labelText,
        {
        color: "#aeefff",
        fontFamily: '"Courier New", monospace',
        fontSize: "10px",
        fontStyle: "bold",
        stroke: "#17252c",
        strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setDepth(1000);
    device?.setData("label", label);
  }

  private createCameraWatch(
    config: KeeperCameraPlacement,
    index: number,
  ): CameraWatch {
    const vision = this.add.graphics().setDepth(config.y - 2);
    const sprite = this.add
      .image(config.x, config.y, "keeper-cctvCamera")
      .setScale(0.3)
      .setDepth(config.y + 3)
      .setData("cameraIndex", index);

    return {
      config,
      detectedSince: null,
      sprite,
      vision,
    };
  }

  private createExit() {
    this.exitZone = this.physics.add
      .staticImage(this.level.exit.x, this.level.exit.y, "keeper-exitDoor")
      .setScale(0.45)
      .setDepth(this.level.exit.y + 5)
      .setAlpha(0.72)
      .setTint(0x8b9b91);
    this.exitZone.refreshBody();

    this.exitArrow = this.add
      .image(
        this.level.exit.x,
        this.level.exit.y - 110,
        "keeper-exitArrow",
      )
      .setScale(0.28)
      .setDepth(1000)
      .setAlpha(0.36)
      .setTint(0x76977c);
    this.tweens.add({
      targets: this.exitArrow,
      y: this.level.exit.y - 120,
      alpha: 0.6,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private createGuards(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.guards.push(
      ...this.level.guards.map((guard) =>
        this.createGuard(
          guard.x,
          guard.y,
          guard.axis,
          guard.minimum,
          guard.maximum,
          guard.direction,
        ),
      ),
    );
    for (const guard of this.guards) {
      this.physics.add.collider(guard.sprite, obstacles);
      if (this.chairs) {
        this.physics.add.collider(guard.sprite, this.chairs);
      }
    }
  }

  private createGuard(
    x: number,
    y: number,
    axis: GuardPatrol["axis"],
    minimum: number,
    maximum: number,
    direction: GuardPatrol["direction"],
  ): GuardPatrol {
    const texture =
      axis === "horizontal"
        ? direction > 0
          ? "keeper-guardRight"
          : "keeper-guardLeft"
        : direction > 0
          ? "keeper-guardFront"
          : "keeper-guardBack";
    const sprite = this.physics.add
      .sprite(x, y, texture)
      .setScale(0.21)
      .setDepth(y + 20);
    sprite.body?.setSize(94, 118).setOffset(38, 205);

    const vision = this.add
      .image(x, y, "keeper-guardVisionCone")
      .setOrigin(0, 0.5)
      .setDisplaySize(235, 148)
      .setTintFill(0xff5260)
      .setAlpha(0.34)
      .setDepth(y - 1);

    return {
      axis,
      direction,
      maximum,
      minimum,
      sprite,
      vision,
    };
  }

  private createPlayer(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.player = this.physics.add
      .sprite(
        this.level.playerStart.x,
        this.level.playerStart.y,
        "keeper-playerFront",
      )
      .setScale(0.22)
      .setCollideWorldBounds(true)
      .setDepth(130);
    this.player.body?.setSize(92, 118).setOffset(48, 205);

    this.physics.add.collider(this.player, obstacles);
    if (this.chairs) {
      this.physics.add.collider(this.player, this.chairs);
    }
    if (this.documents) {
      this.physics.add.overlap(
        this.player,
        this.documents,
        this.collectDocument,
        undefined,
        this,
      );
    }
    if (this.boosters) {
      this.physics.add.overlap(
        this.player,
        this.boosters,
        this.collectBooster,
        undefined,
        this,
      );
    }
    if (this.devices) {
      this.physics.add.overlap(
        this.player,
        this.devices,
        this.useSecurityDevice,
        undefined,
        this,
      );
    }
    if (this.exitZone) {
      this.physics.add.overlap(
        this.player,
        this.exitZone,
        this.reachExit,
        undefined,
        this,
      );
    }
  }

  private createControls() {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;
  }

  private createObjectiveLabel() {
    this.objectiveLabel = this.add
      .text(
        18,
        18,
        `LEVEL ${this.level.id} · ${this.level.title}\n${this.level.intro}`,
        {
        backgroundColor: "#103e2ee8",
        color: "#ffffff",
        fontFamily: '"Courier New", monospace',
        fontSize: "14px",
        padding: { x: 12, y: 8 },
        },
      )
      .setScrollFactor(0)
      .setDepth(2000);
    this.time.delayedCall(3_200, () => {
      if (
        this.runStatus === "playing" &&
        this.collectedDocuments.size === 0
      ) {
        this.objectiveLabel?.setText("TASK 0/3  업무 파일을 회수하세요");
      }
    });
  }

  private updatePlayerMovement() {
    if (!this.player || !this.cursors || !this.movementKeys) {
      return;
    }

    const velocity = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.movementKeys.right.isDown) -
        Number(this.cursors.left.isDown || this.movementKeys.left.isDown),
      Number(this.cursors.down.isDown || this.movementKeys.down.isDown) -
        Number(this.cursors.up.isDown || this.movementKeys.up.isDown),
    );

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(205);
    }

    this.player.setVelocity(velocity.x, velocity.y);
    this.player.setTexture(this.directionTexture("player", velocity.x, velocity.y));
    this.player.setDepth(this.player.y + 28);
  }

  private updateChairs() {
    for (const child of this.chairs?.getChildren() ?? []) {
      const chair = child as Phaser.Physics.Arcade.Sprite;
      chair.setDepth(chair.y + 4);
    }
  }

  private updateGuards() {
    for (const guard of this.guards) {
      const sprite = guard.sprite;
      const body = sprite.body;
      const collidedHorizontally =
        Boolean(body?.blocked.left || body?.blocked.right) ||
        Boolean(body?.touching.left || body?.touching.right);
      const collidedVertically =
        Boolean(body?.blocked.up || body?.blocked.down) ||
        Boolean(body?.touching.up || body?.touching.down);

      if (
        guard.investigationTarget &&
        (collidedHorizontally || collidedVertically)
      ) {
        guard.investigationTarget = undefined;
      } else if (
        !guard.investigationTarget &&
        ((guard.axis === "horizontal" && collidedHorizontally) ||
          (guard.axis === "vertical" && collidedVertically))
      ) {
        guard.direction = guard.direction === 1 ? -1 : 1;
      }

      if (guard.investigationTarget) {
        const distance = Phaser.Math.Distance.Between(
          sprite.x,
          sprite.y,
          guard.investigationTarget.x,
          guard.investigationTarget.y,
        );
        if (distance > 18) {
          const velocity = new Phaser.Math.Vector2(
            guard.investigationTarget.x - sprite.x,
            guard.investigationTarget.y - sprite.y,
          )
            .normalize()
            .scale(112);
          sprite.setVelocity(velocity.x, velocity.y);
        } else {
          sprite.setVelocity(0, 0);
        }
      } else if (guard.axis === "horizontal") {
        if (sprite.x > guard.maximum) {
          guard.direction = -1;
        } else if (sprite.x < guard.minimum) {
          guard.direction = 1;
        }
        sprite.setVelocity(guard.direction * 105, 0);
      } else {
        if (sprite.y > guard.maximum) {
          guard.direction = -1;
        } else if (sprite.y < guard.minimum) {
          guard.direction = 1;
        }
        sprite.setVelocity(0, guard.direction * 92);
      }

      const velocity = sprite.body?.velocity ?? new Phaser.Math.Vector2();
      sprite.setTexture(
        this.directionTexture("guard", velocity.x, velocity.y),
      );
      sprite.setDepth(sprite.y + 28);
      this.updateGuardVision(guard);
    }
  }

  private updateCameras() {
    if (!this.player) {
      return;
    }

    const camerasOffline =
      this.powerOffline || this.time.now < this.camerasDisabledUntil;
    const blockers = this.getVisionBlockers(true);
    for (const camera of this.cameraWatches) {
      camera.sprite.setTint(camerasOffline ? 0x53636b : 0xffffff);
      camera.vision.setVisible(!camerasOffline);
      if (camerasOffline) {
        camera.detectedSince = null;
        continue;
      }

      const angle =
        camera.config.angle +
        Math.sin((this.time.now / 1000) * camera.config.speed) *
          camera.config.sweep;
      camera.sprite.setRotation(angle);
      const lens = getKeeperCameraLensPoint(camera.config, angle);
      const halfSpread = 0.4;
      const rayCount = 17;
      const visiblePoints = Array.from({ length: rayCount }, (_, index) => {
        const rayAngle =
          angle -
          halfSpread +
          (index / (rayCount - 1)) * halfSpread * 2;
        const rayEnd = {
          x: lens.x + Math.cos(rayAngle) * camera.config.range,
          y: lens.y + Math.sin(rayAngle) * camera.config.range,
        };
        const visibleRatio = getVisibleSegmentRatio(
          lens,
          rayEnd,
          blockers,
        );

        return {
          x: lens.x + (rayEnd.x - lens.x) * visibleRatio,
          y: lens.y + (rayEnd.y - lens.y) * visibleRatio,
        };
      });
      camera.vision
        .clear()
        .fillStyle(0xff5260, 0.2)
        .lineStyle(1, 0xff7a84, 0.45)
        .beginPath()
        .moveTo(lens.x, lens.y);
      for (const point of visiblePoints) {
        camera.vision.lineTo(point.x, point.y);
      }
      camera.vision.closePath().fillPath().strokePath();

      const angleToPlayer = Phaser.Math.Angle.Between(
        camera.config.x,
        camera.config.y,
        this.player.x,
        this.player.y,
      );
      const angleDifference = Math.abs(
        Phaser.Math.Angle.Wrap(angleToPlayer - angle),
      );
      const distance = Phaser.Math.Distance.Between(
        camera.config.x,
        camera.config.y,
        this.player.x,
        this.player.y,
      );
      const detected =
        distance < camera.config.range &&
        angleDifference < 0.4 &&
        hasClearLineOfSight(
          lens,
          { x: this.player.x, y: this.player.y },
          blockers,
        );

      if (!detected) {
        camera.detectedSince = null;
        continue;
      }

      camera.detectedSince ??= this.time.now;
      const detectionElapsed = this.time.now - camera.detectedSince;
      if (detectionElapsed > 350) {
        this.objectiveLabel?.setText(
          `CAMERA DETECTING... ${Math.min(99, Math.round((detectionElapsed / 700) * 100))}%`,
        );
      }
      if (
        detectionElapsed >= 700 &&
        this.time.now - this.lastDetectionAt > 1800
      ) {
        camera.detectedSince = null;
        this.handleDetection();
      }
    }
  }

  private directionTexture(
    character: "guard" | "player",
    velocityX: number,
    velocityY: number,
  ) {
    if (Math.abs(velocityX) > Math.abs(velocityY)) {
      return `keeper-${character}${velocityX < 0 ? "Left" : "Right"}`;
    }
    if (velocityY < 0) {
      return `keeper-${character}Back`;
    }
    return `keeper-${character}Front`;
  }

  private updateGuardVision(guard: GuardPatrol) {
    if (!this.player) {
      return;
    }

    const velocity = guard.sprite.body?.velocity ?? new Phaser.Math.Vector2(1, 0);
    const centerAngle = Math.atan2(velocity.y, velocity.x);
    const range = 235;
    const spread = 0.5;
    const origin = { x: guard.sprite.x, y: guard.sprite.y };
    const visionEnd = {
      x: origin.x + Math.cos(centerAngle) * range,
      y: origin.y + Math.sin(centerAngle) * range,
    };
    const blockers = this.getVisionBlockers();
    const visibleRatio = getVisibleSegmentRatio(
      origin,
      visionEnd,
      blockers,
    );

    guard.vision
      .setPosition(guard.sprite.x, guard.sprite.y + 2)
      .setRotation(centerAngle)
      .setDisplaySize(range * visibleRatio, 148 * visibleRatio)
      .setDepth(guard.sprite.y - 1);

    const angleToPlayer = Phaser.Math.Angle.Between(
      guard.sprite.x,
      guard.sprite.y,
      this.player.x,
      this.player.y,
    );
    const angleDifference = Math.abs(
      Phaser.Math.Angle.Wrap(angleToPlayer - centerAngle),
    );
    const distance = Phaser.Math.Distance.Between(
      guard.sprite.x,
      guard.sprite.y,
      this.player.x,
      this.player.y,
    );

    if (
      distance < range &&
      angleDifference < spread &&
      hasClearLineOfSight(
        origin,
        { x: this.player.x, y: this.player.y },
        blockers,
      ) &&
      this.time.now - this.lastDetectionAt > 1800
    ) {
      this.handleDetection();
    }
  }

  private getVisionBlockers(wallsOnly = false): Rectangle[] {
    if (!this.visionBlockers) {
      return [];
    }

    return this.visionBlockers.getChildren().flatMap((child) => {
      const blocker = child as Phaser.GameObjects.GameObject & {
        body?: Phaser.Physics.Arcade.StaticBody;
        getData(key: string): unknown;
      };
      if (wallsOnly && !blocker.getData("blocksVision")) {
        return [];
      }

      const body = (
        blocker as Phaser.GameObjects.GameObject & {
          body?: Phaser.Physics.Arcade.StaticBody;
        }
      ).body;

      if (!body) {
        return [];
      }

      return [
        {
          x: body.x,
          y: body.y,
          width: body.width,
          height: body.height,
        },
      ];
    });
  }

  private handleDetection() {
    if (!this.player) {
      return;
    }

    this.lastDetectionAt = this.time.now;
    this.showAlert(this.player.x, this.player.y - 62);

    const alerts = useGameStore.getState().keeperAlerts + 1;
    this.remainingMilliseconds = Math.max(
      0,
      this.remainingMilliseconds - 10_000,
    );
    useGameStore.getState().updateKeeper({ alerts });
    this.player
      .setPosition(this.level.playerStart.x, this.level.playerStart.y)
      .setVelocity(0, 0);
    this.cameras.main.shake(170, 0.008);
    this.alarmSiren?.setTint(0xff4545);
    this.time.delayedCall(450, () => this.alarmSiren?.clearTint());
    this.objectiveLabel?.setText("DETECTED  시간 -10초 · 시작 지점 복귀");
  }

  private showAlert(x: number, y: number) {
    const alert = this.add
      .image(x, y, "keeper-alertExclamation")
      .setScale(0.24)
      .setDepth(1800);
    this.tweens.add({
      targets: alert,
      y: y - 24,
      alpha: 0,
      duration: 780,
      ease: "Cubic.Out",
      onComplete: () => alert.destroy(),
    });
  }

  private collectDocument(
    _playerObject: ArcadeCollisionObject,
    documentObject: ArcadeCollisionObject,
  ) {
    const document = documentObject as Phaser.Physics.Arcade.Sprite;
    this.collectDocumentSprite(document);
  }

  private collectDocumentSprite(
    document: Phaser.Physics.Arcade.Sprite,
  ) {
    const id = document.getData("documentId") as KeeperDocumentId | undefined;
    if (!document.active || !id || this.collectedDocuments.has(id)) {
      return;
    }

    this.collectedDocuments.add(id);
    (document.getData("highlight") as Phaser.GameObjects.Image | undefined)?.destroy();
    (document.getData("label") as Phaser.GameObjects.Text | undefined)?.destroy();
    document.disableBody(true, true);

    const collected = [...this.collectedDocuments];
    useGameStore.getState().updateKeeper({
      collectedDocuments: collected,
      documents: collected.length,
    });

    if (collected.length >= this.level.documents.length) {
      this.unlockExit();
    } else {
      this.objectiveLabel?.setText(
        `TASK ${collected.length}/3  업무 파일을 회수하세요`,
      );
    }
    this.cameras.main.flash(120, 238, 213, 83);
  }

  private collectBooster(
    _playerObject: ArcadeCollisionObject,
    boosterObject: ArcadeCollisionObject,
  ) {
    const booster = boosterObject as Phaser.Physics.Arcade.Sprite;
    if (!booster.active) {
      return;
    }

    const id = booster.getData("boosterId") as "keycard" | "usb";
    (booster.getData("highlight") as Phaser.GameObjects.Image | undefined)?.destroy();
    booster.disableBody(true, true);

    if (id === "usb") {
      this.usbAvailable = true;
      this.objectiveLabel?.setText(
        this.level.id === 6
          ? "USB READY  보안 단말기에서 CCTV를 정지하세요"
          : "USB READY  유지보수 단말기로 이동하세요",
      );
    } else {
      this.objectiveLabel?.setText("SECURITY ACCESS GRANTED");
      if (this.level.securityDoor?.method === "keycard") {
        this.unlockSecurityDoor();
      }
    }
    this.cameras.main.flash(100, 96, 198, 241);
  }

  private useSecurityDevice(
    _playerObject: ArcadeCollisionObject,
    deviceObject: ArcadeCollisionObject,
  ) {
    const device = deviceObject as Phaser.Physics.Arcade.Sprite;
    if (!device.active) {
      return;
    }

    const deviceId = device.getData("deviceId") as
      | "breaker"
      | "terminal";
    if (deviceId === "terminal") {
      if (!this.usbAvailable) {
        this.objectiveLabel?.setText("USB REQUIRED  먼저 USB를 찾으세요");
        return;
      }

      this.usbAvailable = false;
      if (this.level.securityDoor?.method === "usb") {
        this.unlockSecurityDoor();
        this.objectiveLabel?.setText("MAINTENANCE ROUTE OPEN");
      } else {
        this.camerasDisabledUntil = this.time.now + 20_000;
        this.objectiveLabel?.setText("CCTV DISABLED · 20 SEC");
        this.time.delayedCall(20_000, () => {
          if (!this.powerOffline && this.runStatus === "playing") {
            this.objectiveLabel?.setText("CCTV NETWORK ONLINE");
          }
        });
      }
    } else {
      this.powerOffline = true;
      this.objectiveLabel?.setText(
        "CAMERA NETWORK OFFLINE · 경비가 전기실로 이동합니다",
      );
      const investigatingGuard = this.guards.at(-1);
      if (investigatingGuard && this.level.breaker) {
        investigatingGuard.investigationTarget = {
          x: this.level.breaker.x,
          y: this.level.breaker.y,
        };
      }
    }

    (device.getData("highlight") as
      | Phaser.GameObjects.Image
      | undefined)?.destroy();
    (device.getData("label") as Phaser.GameObjects.Text | undefined)?.destroy();
    device.disableBody(true, true);
    this.cameras.main.flash(120, 90, 190, 230);
  }

  private unlockSecurityDoor() {
    this.securityDoorCollider?.destroy();
    this.securityDoorCollider = undefined;
    this.securityDoorImage?.setTint(0x72d98b).setAlpha(0.36);
    this.tweens.add({
      targets: this.securityDoorImage,
      alpha: 0,
      duration: 320,
      onComplete: () => {
        this.securityDoorImage?.destroy();
        this.securityDoorImage = undefined;
      },
    });
  }

  private unlockExit() {
    this.objectiveLabel?.setText("TASK 3/3  초록색 EXIT로 이동하세요");
    this.exitZone?.clearTint().setAlpha(1);
    this.exitArrow?.clearTint().setAlpha(0.9);
  }

  private reachExit() {
    if (this.collectedDocuments.size >= this.level.documents.length) {
      this.finishRun("won");
      return;
    }

    this.objectiveLabel?.setText(
      `LOCKED  남은 업무 파일 ${this.level.documents.length - this.collectedDocuments.size}개`,
    );
  }

  private updateTimer(delta: number) {
    this.remainingMilliseconds = Math.max(
      0,
      this.remainingMilliseconds - delta,
    );
    const remainingSecond = Math.ceil(this.remainingMilliseconds / 1000);

    if (remainingSecond !== this.lastReportedSecond) {
      this.lastReportedSecond = remainingSecond;
      useGameStore
        .getState()
        .updateKeeper({ timeRemaining: remainingSecond });
    }

    if (this.remainingMilliseconds <= 0) {
      this.finishRun("lost");
    }
  }

  private finishRun(status: "won" | "lost") {
    if (this.runStatus !== "playing") {
      return;
    }

    this.runStatus = status;
    this.player?.setVelocity(0, 0);
    for (const guard of this.guards) {
      guard.sprite.setVelocity(0, 0);
      guard.vision.setVisible(false);
    }
    for (const camera of this.cameraWatches) {
      camera.vision.setVisible(false);
    }
    this.physics.pause();
    if (status === "won") {
      useGameStore
        .getState()
        .completeKeeperLevel(Math.ceil(this.remainingMilliseconds / 1000));
    } else {
      useGameStore.getState().updateKeeper({ status });
    }
  }
}
