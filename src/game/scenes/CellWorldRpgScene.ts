import * as Phaser from "phaser";
import { useGameStore } from "@/stores/gameStore";

const WORLD_WIDTH = 1536;
const WORLD_HEIGHT = 960;
const CELL_SIZE = 48;
const ASSET_BASE = "/assets/pixel-art/rpg";

const RPG_ASSETS = {
  bush: "bush.png",
  chest: "chest.png",
  dirt: "dirt.png",
  elder: "elder_front.png",
  fence: "fence.png",
  flowers: "flowers.png",
  goblinBoss: "goblin_boss_front.png",
  grass: "grass.png",
  heroSheet: "characters_sheet.png",
  house: "house.png",
  knight: "knight_front.png",
  log: "log.png",
  market: "market.png",
  merchant: "merchant_front.png",
  potion: "potion.png",
  questRelic: "quest_relic.png",
  rock: "rock.png",
  ruins: "ruins.png",
  sign: "sign.png",
  slimeBack: "slime_back.png",
  slimeFront: "slime_front.png",
  slimeLeft: "slime_left.png",
  slimeRight: "slime_right.png",
  sword: "sword.png",
  tree: "tree.png",
  villager: "villager_front.png",
} as const;

type ArcadeCollisionObject = Parameters<
  Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
>[0];
type Facing = "back" | "front" | "left" | "right";

interface MovementKeys {
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
}

export class CellWorldRpgScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private movementKeys?: MovementKeys;
  private player?: Phaser.Physics.Arcade.Sprite;
  private elder?: Phaser.Physics.Arcade.Sprite;
  private relic?: Phaser.Physics.Arcade.Sprite;
  private slimes?: Phaser.Physics.Arcade.Group;
  private dialogue?: Phaser.GameObjects.Container;
  private playerFacing: Facing = "front";
  private lastReportedCell = "";
  private lastContactDamageAt = 0;

  constructor() {
    super("cell-world-rpg");
  }

  preload() {
    for (const [key, file] of Object.entries(RPG_ASSETS)) {
      this.load.image(`rpg-${key}`, `${ASSET_BASE}/${file}`);
    }
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.createHeroFrames();
    this.drawWorld();

    const obstacles = this.physics.add.staticGroup();
    this.addVillage(obstacles);
    this.addEasternRuins(obstacles);
    this.addForest(obstacles);
    this.addDecorations(obstacles);

    this.addShadow(930, 546, 48, 17, 516);
    this.elder = this.physics.add
      .staticSprite(930, 520, "rpg-elder")
      .setScale(3)
      .setDepth(540);
    this.add
      .text(930, 472, "ELDER NORA", {
        color: "#fff7c8",
        fontFamily: '"Courier New", monospace',
        fontSize: "14px",
        fontStyle: "bold",
        stroke: "#17351f",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.slimes = this.physics.add.group();
    this.createSlime(1065, 705);
    this.createSlime(1190, 650);
    this.createSlime(1320, 770);

    this.relic = this.physics.add
      .staticSprite(1120, 425, "rpg-questRelic")
      .setScale(2.5)
      .setDepth(455)
      .setVisible(false);
    this.add
      .text(1120, 374, "FORMULA CORE", {
        color: "#fff2a1",
        fontFamily: '"Courier New", monospace',
        fontSize: "13px",
        fontStyle: "bold",
        stroke: "#382e12",
        strokeThickness: 4,
      })
      .setName("relic-label")
      .setOrigin(0.5)
      .setDepth(900)
      .setVisible(false);

    this.addShadow(720, 574, 44, 15, 545);
    this.player = this.physics.add
      .sprite(720, 545, "rpg-heroSheet", "hero-front")
      .setScale(0.48)
      .setCollideWorldBounds(true);
    this.player.body?.setSize(56, 40).setOffset(22, 112);
    this.physics.add.collider(this.player, obstacles);
    this.physics.add.overlap(
      this.player,
      this.slimes,
      this.handleSlimeContact,
      undefined,
      this,
    );

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;
    this.interactKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );
    this.attackKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.escapeKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.createDialogue();
    this.add
      .text(24, 24, "VILLAGE_01  ·  DISCOVERED", {
        backgroundColor: "#0f412de8",
        color: "#d8ffe8",
        fontFamily: '"Courier New", monospace',
        fontSize: "14px",
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(2000);

    this.add
      .text(24, 66, "OBJECTIVE", {
        backgroundColor: "#10251fe8",
        color: "#f4d96a",
        fontFamily: '"Courier New", monospace',
        fontSize: "11px",
        padding: { x: 10, y: 7 },
      })
      .setName("objective-label")
      .setScrollFactor(0)
      .setDepth(2000);

    useGameStore
      .getState()
      .setSelectedCell("N10", '=MAP.LOAD("VILLAGE_01")');
  }

  update() {
    if (!this.player || !this.cursors || !this.movementKeys) {
      return;
    }

    const state = useGameStore.getState();
    const speed = 190;
    const left = this.cursors.left.isDown || this.movementKeys.left.isDown;
    const right = this.cursors.right.isDown || this.movementKeys.right.isDown;
    const up = this.cursors.up.isDown || this.movementKeys.up.isDown;
    const down = this.cursors.down.isDown || this.movementKeys.down.isDown;
    const velocity = state.npcDialogueOpen
      ? new Phaser.Math.Vector2(0, 0)
      : new Phaser.Math.Vector2(
          Number(right) - Number(left),
          Number(down) - Number(up),
        );

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(speed);
      this.updatePlayerFacing(velocity);
    }

    if (
      this.attackKey &&
      Phaser.Input.Keyboard.JustDown(this.attackKey) &&
      !state.npcDialogueOpen
    ) {
      this.attackNearbySlimes();
    }

    if (
      this.escapeKey &&
      Phaser.Input.Keyboard.JustDown(this.escapeKey) &&
      state.npcDialogueOpen
    ) {
      state.closeNpcDialogue();
    }

    this.player.setVelocity(velocity.x, velocity.y);
    this.player.setDepth(this.player.y + 32);

    const cell = this.toCellAddress(this.player.x, this.player.y);

    if (cell !== this.lastReportedCell) {
      this.lastReportedCell = cell;
      useGameStore.getState().setPlayerPosition(cell);
    }

    this.updateInteraction();
    this.updateQuestPresentation();
  }

  private createHeroFrames() {
    const texture = this.textures.get("rpg-heroSheet");
    texture.add("hero-front", 0, 69, 58, 100, 155);
    texture.add("hero-back", 0, 288, 58, 97, 155);
    texture.add("hero-left", 0, 505, 58, 98, 156);
    texture.add("hero-right", 0, 721, 58, 97, 156);
  }

  private drawWorld() {
    this.add
      .tileSprite(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        "rpg-grass",
      )
      .setTileScale(2)
      .setDepth(-100);

    this.add
      .tileSprite(WORLD_WIDTH / 2, 520, WORLD_WIDTH, 144, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-80);
    this.add
      .tileSprite(720, WORLD_HEIGHT / 2, 144, WORLD_HEIGHT, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-79);

    const grid = this.add.graphics().setDepth(-20);
    grid.lineStyle(1, 0x335c37, 0.38);
    for (let x = 0; x <= WORLD_WIDTH; x += CELL_SIZE) {
      grid.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += CELL_SIZE) {
      grid.lineBetween(0, y, WORLD_WIDTH, y);
    }
  }

  private addVillage(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addShadow(250, 356, 176, 40, 318);
    this.add
      .image(250, 362, "rpg-house")
      .setOrigin(0.5, 1)
      .setScale(8)
      .setDepth(350);
    this.addObstacle(obstacles, 250, 310, 150, 86);

    this.addShadow(1280, 350, 176, 40, 312);
    this.add
      .image(1280, 356, "rpg-house")
      .setOrigin(0.5, 1)
      .setScale(8)
      .setDepth(345);
    this.addObstacle(obstacles, 1280, 304, 150, 86);

    this.add
      .image(1405, 420, "rpg-chest")
      .setScale(3)
      .setDepth(430);

    this.addShadow(330, 820, 150, 34, 776);
    this.add
      .image(330, 828, "rpg-market")
      .setOrigin(0.5, 1)
      .setScale(7)
      .setDepth(810);
    this.addObstacle(obstacles, 330, 774, 140, 66);

    this.addShadow(330, 820, 40, 12, 817);
    this.physics.add
      .staticSprite(330, 790, "rpg-merchant")
      .setScale(2.8)
      .setDepth(840);
    this.add
      .text(330, 672, "ITEM SHOP", {
        color: "#fff2bd",
        fontFamily: '"Courier New", monospace',
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#4c3020",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.addShadow(500, 525, 38, 11, 505);
    this.add
      .image(500, 502, "rpg-villager")
      .setScale(2.7)
      .setDepth(525);
    this.addShadow(585, 525, 38, 11, 505);
    this.add
      .image(585, 502, "rpg-knight")
      .setScale(2.7)
      .setDepth(525);
  }

  private addEasternRuins(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addShadow(1120, 390, 190, 36, 350);
    this.add
      .image(1120, 400, "rpg-ruins")
      .setOrigin(0.5, 1)
      .setScale(9)
      .setDepth(385);
    this.addObstacle(obstacles, 1120, 343, 178, 80);

    this.add
      .text(1120, 258, "ANCIENT FORMULA", {
        color: "#dbe0cc",
        fontFamily: '"Courier New", monospace',
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#303b32",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.add
      .image(1215, 332, "rpg-goblinBoss")
      .setScale(2.2)
      .setAlpha(0.72)
      .setDepth(365);
  }

  private addForest(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    const treePositions = [
      [72, 152],
      [150, 182],
      [390, 152],
      [475, 184],
      [980, 160],
      [1380, 180],
      [86, 760],
      [180, 885],
      [440, 825],
      [540, 920],
      [890, 905],
      [1070, 900],
      [1420, 735],
      [1450, 910],
    ] as const;

    for (const [x, y] of treePositions) {
      this.addShadow(x, y, 54, 16, y - 12);
      this.add
        .image(x, y, "rpg-tree")
        .setOrigin(0.5, 1)
        .setScale(4.4)
        .setDepth(y);
      this.addObstacle(obstacles, x, y - 13, 38, 26);
    }
  }

  private addDecorations(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    const bushes = [
      [535, 335],
      [880, 350],
      [1005, 620],
      [1265, 600],
      [610, 780],
      [1320, 840],
    ] as const;
    for (const [x, y] of bushes) {
      this.add
        .image(x, y, "rpg-bush")
        .setScale(2.6)
        .setDepth(y);
    }

    const flowerPatches = [
      [430, 410],
      [820, 640],
      [970, 745],
      [1240, 490],
      [210, 620],
    ] as const;
    for (const [x, y] of flowerPatches) {
      this.add
        .image(x, y, "rpg-flowers")
        .setScale(2.2)
        .setDepth(y);
    }

    const solidDecorations = [
      [430, 720, "rpg-log", 2.8, 50, 24],
      [870, 805, "rpg-rock", 2.7, 42, 30],
      [1350, 620, "rpg-rock", 2.5, 38, 27],
      [510, 440, "rpg-fence", 3.2, 62, 24],
      [350, 430, "rpg-sign", 2.8, 30, 38],
    ] as const;

    for (const [x, y, key, scale, width, height] of solidDecorations) {
      this.add
        .image(x, y, key)
        .setScale(scale)
        .setDepth(y);
      this.addObstacle(obstacles, x, y + 5, width, height);
    }
  }

  private addObstacle(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const obstacle = this.add
      .rectangle(x, y, width, height, 0x000000, 0)
      .setVisible(false);
    obstacles.add(obstacle);
  }

  private addShadow(
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number,
  ) {
    return this.add
      .ellipse(x, y, width, height, 0x10231a, 0.28)
      .setDepth(depth);
  }

  private createSlime(x: number, y: number) {
    this.addShadow(x, y + 20, 42, 13, y - 2);
    const slime = this.physics.add
      .sprite(x, y, "rpg-slimeFront")
      .setScale(2.4)
      .setDepth(y);
    slime.setData("hp", 2);
    slime.body?.setCircle(9, 3, 5);
    this.slimes?.add(slime);
    this.tweens.add({
      targets: slime,
      x: x + Phaser.Math.Between(-70, 70),
      y: y + Phaser.Math.Between(-40, 40),
      duration: Phaser.Math.Between(1700, 2400),
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
      onUpdate: () => slime.setDepth(slime.y),
    });
  }

  private createDialogue() {
    const panel = this.add
      .rectangle(0, 0, 510, 118, 0x10251f, 0.96)
      .setStrokeStyle(3, 0xe8d787);
    const portrait = this.add
      .image(-214, 0, "rpg-elder")
      .setScale(2.6)
      .setOrigin(0.5);
    const name = this.add.text(-168, -43, "ELDER NORA / AI GUIDE", {
      color: "#f8d968",
      fontFamily: '"Courier New", monospace',
      fontSize: "15px",
      fontStyle: "bold",
    });
    const copy = this.add.text(
      -168,
      -13,
      "북쪽 숲의 셀 값이 불안정하군요.\n[E]를 눌러 현재 상태에 맞는 힌트를 확인하세요.",
      {
        color: "#ecf7ef",
        fontFamily: '"Courier New", monospace',
        fontSize: "14px",
        lineSpacing: 7,
      },
    );

    this.dialogue = this.add
      .container(0, 0, [panel, portrait, name, copy])
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);
  }

  private updatePlayerFacing(velocity: Phaser.Math.Vector2) {
    let facing: Facing;
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      facing = velocity.x < 0 ? "left" : "right";
    } else {
      facing = velocity.y < 0 ? "back" : "front";
    }

    if (facing !== this.playerFacing) {
      this.playerFacing = facing;
      this.player?.setFrame(`hero-${facing}`);
    }
  }

  private updateInteraction() {
    if (!this.player || !this.elder || !this.dialogue) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.elder.x,
      this.elder.y,
    );
    const nearby = distance < 115;
    const camera = this.cameras.main;

    this.dialogue.setPosition(camera.width / 2, camera.height - 92);
    this.dialogue.setVisible(nearby && !useGameStore.getState().npcDialogueOpen);

    if (
      nearby &&
      this.interactKey &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      const state = useGameStore.getState();
      state.setSelectedCell("AI01", '=NPC.CHAT("ELDER_NORA")');
      state.openNpcDialogue();
      return;
    }

    if (!this.relic?.visible || !this.interactKey) {
      return;
    }

    const relicDistance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.relic.x,
      this.relic.y,
    );

    if (
      relicDistance < 72 &&
      Phaser.Input.Keyboard.JustDown(this.interactKey)
    ) {
      useGameStore.getState().collectRpgRelic();
      this.relic.setVisible(false);
    }
  }

  private attackNearbySlimes() {
    if (!this.player || !this.slimes) {
      return;
    }

    const stage = useGameStore.getState().rpgQuestStage;
    const attackPose = {
      back: { angle: 45, x: 0, y: -42 },
      front: { angle: 135, x: 0, y: 42 },
      left: { angle: 45, x: -42, y: 0 },
      right: { angle: -45, x: 42, y: 0 },
    }[this.playerFacing];
    const slashGlow = this.add
      .circle(this.player.x, this.player.y, 58, 0xf8e58a, 0.2)
      .setStrokeStyle(3, 0xfff4b8, 0.8)
      .setDepth(1900);
    const sword = this.add
      .image(
        this.player.x + attackPose.x,
        this.player.y + attackPose.y,
        "rpg-sword",
      )
      .setScale(2.15)
      .setAngle(attackPose.angle)
      .setDepth(1950);

    this.tweens.add({
      targets: [slashGlow, sword],
      alpha: 0,
      angle: `+=70`,
      scale: 2.7,
      duration: 180,
      onComplete: () => {
        slashGlow.destroy();
        sword.destroy();
      },
    });

    if (stage !== "defeat_slimes") {
      return;
    }

    const children = this.slimes.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (const slime of children) {
      if (!slime.active) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        slime.x,
        slime.y,
      );

      if (distance > 72) {
        continue;
      }

      const hp = Number(slime.getData("hp") ?? 2) - 1;
      slime.setData("hp", hp);
      slime.setTint(0xffffff);
      this.time.delayedCall(90, () => slime.clearTint());

      if (hp <= 0) {
        slime.disableBody(true, true);
        useGameStore.getState().defeatRpgSlime();
      }
    }
  }

  private handleSlimeContact(
    _playerObject: ArcadeCollisionObject,
    slimeObject: ArcadeCollisionObject,
  ) {
    const now = this.time.now;

    if (now - this.lastContactDamageAt < 850) {
      return;
    }

    this.lastContactDamageAt = now;
    useGameStore.getState().damageRpgPlayer(5);
    const slime = slimeObject as Phaser.Physics.Arcade.Sprite;
    slime.setVelocity(
      Phaser.Math.Between(-170, 170),
      Phaser.Math.Between(-170, 170),
    );
    this.cameras.main.shake(110, 0.004);
  }

  private updateQuestPresentation() {
    const state = useGameStore.getState();
    const relicVisible =
      state.rpgQuestStage === "collect_relic" && !state.rpgRelicCollected;
    this.relic?.setVisible(relicVisible);
    const relicLabel = this.children.getByName(
      "relic-label",
    ) as Phaser.GameObjects.Text | null;
    relicLabel?.setVisible(relicVisible);

    const objective = {
      meet_elder: "OBJECTIVE  장로 노라와 대화 [E]",
      collect_relic: "OBJECTIVE  동쪽 폐허의 수식 코어 회수 [E]",
      defeat_slimes: `OBJECTIVE  균열 슬라임 처치 ${state.rpgSlimesDefeated}/3 [SPACE]`,
      return_elder: "OBJECTIVE  장로에게 돌아가기",
      complete: "OBJECTIVE  첫 번째 수식 복구 완료",
    }[state.rpgQuestStage];

    const objectiveLabel = this.children.getByName(
      "objective-label",
    ) as Phaser.GameObjects.Text | null;
    objectiveLabel?.setText(objective);

    if (
      (state.rpgQuestStage === "return_elder" ||
        state.rpgQuestStage === "complete") &&
      this.slimes
    ) {
      for (const child of this.slimes.getChildren()) {
        const slime = child as Phaser.Physics.Arcade.Sprite;
        slime.disableBody(true, true);
      }
    }
  }

  private toCellAddress(x: number, y: number) {
    const columnIndex = Phaser.Math.Clamp(Math.floor(x / CELL_SIZE), 0, 31);
    const row = Phaser.Math.Clamp(Math.floor(y / CELL_SIZE) + 1, 1, 20);
    let column = "";
    let value = columnIndex + 1;

    while (value > 0) {
      const remainder = (value - 1) % 26;
      column = String.fromCharCode(65 + remainder) + column;
      value = Math.floor((value - 1) / 26);
    }

    return `${column}${row}`;
  }
}
