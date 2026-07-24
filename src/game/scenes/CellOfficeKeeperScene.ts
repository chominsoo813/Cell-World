import * as Phaser from "phaser";
import {
  useGameStore,
  type KeeperDocumentId,
} from "@/stores/gameStore";

const WORLD_WIDTH = 1400;
const WORLD_HEIGHT = 820;
const START_TIME_SECONDS = 90;
const PLAYER_START = { x: 105, y: 205 } as const;
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
  axis: "horizontal" | "vertical";
  direction: -1 | 1;
  maximum: number;
  minimum: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  vision: Phaser.GameObjects.Image;
}

interface DocumentDefinition {
  filename: string;
  id: KeeperDocumentId;
  texture: string;
  x: number;
  y: number;
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

const DOCUMENTS: DocumentDefinition[] = [
  {
    filename: "REPORT.XLSX",
    id: "report",
    texture: "reportDocument",
    x: 350,
    y: 300,
  },
  {
    filename: "BUDGET.XLSX",
    id: "budget",
    texture: "budgetDocument",
    x: 295,
    y: 685,
  },
  {
    filename: "ID_LIST.XLSX",
    id: "idList",
    texture: "idListDocument",
    x: 1190,
    y: 380,
  },
];

export class CellOfficeKeeperScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys?: MovementKeys;
  private player?: Phaser.Physics.Arcade.Sprite;
  private documents?: Phaser.Physics.Arcade.StaticGroup;
  private boosters?: Phaser.Physics.Arcade.StaticGroup;
  private exitZone?: Phaser.Physics.Arcade.Image;
  private exitArrow?: Phaser.GameObjects.Image;
  private alarmSiren?: Phaser.GameObjects.Image;
  private objectiveLabel?: Phaser.GameObjects.Text;
  private guards: GuardPatrol[] = [];
  private collectedDocuments = new Set<KeeperDocumentId>();
  private remainingMilliseconds = START_TIME_SECONDS * 1000;
  private lastReportedSecond = -1;
  private lastDetectionAt = -2000;
  private securityPassActive = false;
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
    this.resetRuntimeState();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawOfficeFloor();
    const obstacles = this.physics.add.staticGroup();
    this.buildOffice(obstacles);
    this.createMissionObjects();
    this.createExit();
    this.createGuards();
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
      timeRemaining: START_TIME_SECONDS,
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
    this.updateGuards();
    this.updateTimer(delta);
  }

  private resetRuntimeState() {
    this.guards = [];
    this.collectedDocuments = new Set<KeeperDocumentId>();
    this.remainingMilliseconds = START_TIME_SECONDS * 1000;
    this.lastReportedSecond = -1;
    this.lastDetectionAt = -2000;
    this.securityPassActive = false;
    this.runStatus = "playing";
  }

  private drawOfficeFloor() {
    this.add
      .tileSprite(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        "keeper-carpetTile",
      )
      .setTileScale(0.22)
      .setDepth(0);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0xb6c9d4, 0.06);
    for (let x = 0; x <= WORLD_WIDTH; x += 44) {
      grid.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 44) {
      grid.lineBetween(0, y, WORLD_WIDTH, y);
    }

    this.add
      .text(24, 64, "CELL OFFICE / FLOOR_08", {
        color: "#dce8ee",
        fontFamily: '"Courier New", monospace',
        fontSize: "12px",
        fontStyle: "bold",
        stroke: "#17252c",
        strokeThickness: 4,
      })
      .setDepth(1000);
  }

  private buildOffice(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addOpenOffice(obstacles);
    this.addMeetingRoom(obstacles);
    this.addExecutiveRoom(obstacles);
    this.addLounge(obstacles);
    this.addExitRoom(obstacles);
  }

  private addOpenOffice(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addProp(72, 105, "waterDispenser", 0.44);
    this.addProp(128, 112, "plant", 0.42);
    this.addProp(665, 135, "copier", 0.48);
    this.addObstacle(obstacles, 665, 152, 74, 74);

    this.addWorkstation(obstacles, 220, 155);
    this.addWorkstation(obstacles, 485, 155);
    this.addWorkstation(obstacles, 220, 435);
    this.addWorkstation(obstacles, 485, 435);

    this.addProp(675, 455, "filingCabinet", 0.4);
    this.addObstacle(obstacles, 675, 474, 44, 70);
    this.addProp(610, 470, "plant", 0.36);

    const partitionPositions = [
      [110, 255],
      [375, 255],
      [110, 535],
      [375, 535],
    ] as const;
    for (const [x, y] of partitionPositions) {
      this.addProp(x, y, "partitionWall", 0.42, 18);
      this.addObstacle(obstacles, x, y, 104, 32);
    }
  }

  private addWorkstation(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
  ) {
    this.addProp(x, y, "officeDesk", 0.56);
    this.addProp(x, y - 30, "computerMonitor", 0.34, 2);
    this.addProp(x + 38, y + 2, "keyboard", 0.24, 3);
    this.addProp(x - 48, y + 72, "officeChair", 0.4, 4);
    this.addObstacle(obstacles, x, y + 10, 132, 58);
  }

  private addMeetingRoom(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addWall(obstacles, 1040, 60, 560, false);
    this.addWall(obstacles, 770, 175, 230, true);
    this.addWall(obstacles, 1310, 175, 230, true);
    this.addWall(obstacles, 855, 305, 170, false);
    this.addWall(obstacles, 1225, 305, 170, false);
    this.addProp(770, 60, "wallCorner", 0.3, 3);
    this.addProp(1310, 60, "wallCorner", 0.3, 3).setFlipX(true);
    this.addProp(1040, 315, "doorwayThreshold", 0.47, 2);

    this.addProp(1040, 175, "conferenceTable", 0.64);
    this.addObstacle(obstacles, 1040, 186, 250, 92);
    this.addProp(1245, 125, "plant", 0.34);
    this.addProp(815, 128, "officeClock", 0.25);
    this.addProp(1255, 260, "conferenceChair", 0.34);
  }

  private addExecutiveRoom(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addWall(obstacles, 250, 555, 390, false);
    this.addWall(obstacles, 55, 680, 250, true);
    this.addWall(obstacles, 445, 680, 250, true);
    this.addWall(obstacles, 145, 800, 180, false);
    this.addWall(obstacles, 355, 800, 180, false);
    this.addProp(250, 795, "doorwayThreshold", 0.44, 2);

    this.addProp(250, 655, "executiveDesk", 0.63);
    this.addObstacle(obstacles, 250, 670, 132, 62);
    this.addProp(105, 680, "bookshelf", 0.42);
    this.addObstacle(obstacles, 105, 695, 62, 76);
    this.addProp(390, 690, "conferenceChair", 0.36);
  }

  private addLounge(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addProp(650, 665, "sofa", 0.62);
    this.addObstacle(obstacles, 650, 680, 164, 64);
    this.addProp(650, 765, "coffeeTable", 0.52);
    this.addObstacle(obstacles, 650, 776, 105, 42);
    this.addProp(805, 675, "plant", 0.4);
    this.addProp(520, 690, "filingCabinet", 0.34);
    this.addObstacle(obstacles, 520, 706, 36, 62);
  }

  private addExitRoom(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addWall(obstacles, 1190, 555, 360, false);
    this.addWall(obstacles, 1010, 685, 260, true);
    this.addWall(obstacles, 1370, 685, 260, true);
    this.addWall(obstacles, 1095, 805, 160, false);
    this.addWall(obstacles, 1285, 805, 160, false);
    this.addProp(1190, 800, "doorwayThreshold", 0.44, 2);
    this.addProp(1060, 620, "cctvCamera", 0.32);
    this.alarmSiren = this.addProp(1320, 615, "alarmSiren", 0.3, 4);
    this.addProp(1060, 745, "plant", 0.34);
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

  private addObstacle(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const collider = this.add
      .rectangle(x, y, width, height, 0x000000, 0)
      .setVisible(false);
    obstacles.add(collider);
    return collider;
  }

  private createMissionObjects() {
    this.documents = this.physics.add.staticGroup();
    for (const document of DOCUMENTS) {
      this.addDocument(document);
    }

    this.boosters = this.physics.add.staticGroup();
    this.addBooster(560, 610, "usb", "usbDrive");
    this.addBooster(875, 365, "keycard", "keycard");
  }

  private addDocument(definition: DocumentDefinition) {
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

  private createExit() {
    this.exitZone = this.physics.add
      .staticImage(1250, 700, "keeper-exitDoor")
      .setScale(0.45)
      .setDepth(705)
      .setAlpha(0.72)
      .setTint(0x8b9b91);
    this.exitZone.refreshBody();

    this.exitArrow = this.add
      .image(1250, 590, "keeper-exitArrow")
      .setScale(0.28)
      .setDepth(1000)
      .setAlpha(0.36)
      .setTint(0x76977c);
    this.tweens.add({
      targets: this.exitArrow,
      y: 580,
      alpha: 0.6,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private createGuards() {
    this.guards.push(
      this.createGuard(690, 355, "horizontal", 620, 1080, 1),
      this.createGuard(970, 500, "vertical", 370, 700, 1),
    );
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
      .sprite(PLAYER_START.x, PLAYER_START.y, "keeper-playerFront")
      .setScale(0.22)
      .setCollideWorldBounds(true)
      .setDepth(130);
    this.player.body?.setSize(92, 118).setOffset(48, 205);

    this.physics.add.collider(this.player, obstacles);
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
      .text(18, 18, "TASK 0/3  업무 파일을 회수하세요", {
        backgroundColor: "#103e2ee8",
        color: "#ffffff",
        fontFamily: '"Courier New", monospace',
        fontSize: "14px",
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(2000);
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

  private updateGuards() {
    for (const guard of this.guards) {
      const sprite = guard.sprite;
      if (guard.axis === "horizontal") {
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

    guard.vision
      .setPosition(guard.sprite.x, guard.sprite.y + 2)
      .setRotation(centerAngle)
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
      this.time.now - this.lastDetectionAt > 1800
    ) {
      this.handleDetection();
    }
  }

  private handleDetection() {
    if (!this.player) {
      return;
    }

    this.lastDetectionAt = this.time.now;
    this.showAlert(this.player.x, this.player.y - 62);

    if (this.securityPassActive) {
      this.securityPassActive = false;
      this.objectiveLabel?.setText("SECURITY PASS  감지 1회를 무효화했습니다");
      this.cameras.main.flash(100, 95, 218, 130);
      return;
    }

    const alerts = useGameStore.getState().keeperAlerts + 1;
    this.remainingMilliseconds = Math.max(
      0,
      this.remainingMilliseconds - 10_000,
    );
    useGameStore.getState().updateKeeper({ alerts });
    this.player
      .setPosition(PLAYER_START.x, PLAYER_START.y)
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

    if (collected.length >= DOCUMENTS.length) {
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
      this.remainingMilliseconds = Math.min(
        START_TIME_SECONDS * 1000,
        this.remainingMilliseconds + 8000,
      );
      this.objectiveLabel?.setText("USB BACKUP  제한 시간 +8초");
    } else {
      this.securityPassActive = true;
      this.objectiveLabel?.setText("SECURITY PASS  다음 감지 1회 무효");
    }
    this.cameras.main.flash(100, 96, 198, 241);
  }

  private unlockExit() {
    this.objectiveLabel?.setText("TASK 3/3  초록색 EXIT로 이동하세요");
    this.exitZone?.clearTint().setAlpha(1);
    this.exitArrow?.clearTint().setAlpha(0.9);
  }

  private reachExit() {
    if (this.collectedDocuments.size >= DOCUMENTS.length) {
      this.finishRun("won");
      return;
    }

    this.objectiveLabel?.setText(
      `LOCKED  남은 업무 파일 ${DOCUMENTS.length - this.collectedDocuments.size}개`,
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
    this.physics.pause();
    useGameStore.getState().updateKeeper({ status });
  }
}
