import * as Phaser from "phaser";
import { getRpgEquipment } from "@/lib/rpgShop";
import { useGameStore } from "@/stores/gameStore";

const WORLD_WIDTH = 3200;
const WORLD_HEIGHT = 2048;
const CELL_SIZE = 48;
const ASSET_BASE = "/assets/pixel-art/rpg";
const MAX_MONSTERS = 20;

const RPG_ASSETS = {
  bush: "bush.png",
  chest: "chest.png",
  dirt: "dirt.png",
  dungeonBrazier: "dungeon/brazier-orange.png",
  dungeonCrack: "dungeon/floor-cracked.png",
  dungeonFloor: "dungeon/floor-tile-stone.png",
  dungeonPillar: "dungeon/dungeon-pillar.png",
  dungeonPortal: "dungeon/portal-purple.png",
  dungeonStatue: "dungeon/statue-knight.png",
  elder: "elder_front.png",
  fence: "fence.png",
  flowers: "flowers.png",
  goblin: "goblin_front.png",
  goblinBack: "goblin_back.png",
  goblinLeft: "goblin_left.png",
  goblinRight: "goblin_right.png",
  goblinBoss: "goblin_boss_front.png",
  goblinBossBack: "goblin_boss_back.png",
  goblinBossLeft: "goblin_boss_left.png",
  goblinBossRight: "goblin_boss_right.png",
  grass: "grass.png",
  heroSheet: "characters_sheet.png",
  house: "house.png",
  knight: "knight_front.png",
  knightBack: "knight_back.png",
  knightLeft: "knight_left.png",
  knightRight: "knight_right.png",
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
type MonsterKind =
  | "bat"
  | "goblin"
  | "orc"
  | "skeleton"
  | "slime"
  | "wolf";
type InteractionKind = "elder" | "npc" | "object" | "relic";

interface MovementKeys {
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
}

interface MonsterZone {
  centerX: number;
  centerY: number;
  kind: MonsterKind;
  radiusX: number;
  radiusY: number;
}

interface MonsterDefinition {
  aggroRange: number;
  contactDamage: number;
  experience: number;
  hp: number;
  rewardGold: number;
  scale: number;
  speed: number;
  texture: string;
}

interface MonsterSheetDefinition {
  columns: number;
  file: string;
}

interface WorldInteraction {
  id: string;
  kind: InteractionKind;
  label: string;
  name: string;
  portrait?: string;
  radius: number;
  text: string;
  x: number;
  y: number;
}

const MONSTER_ZONES: MonsterZone[] = [
  {
    centerX: 1150,
    centerY: 1160,
    kind: "slime",
    radiusX: 360,
    radiusY: 245,
  },
  {
    centerX: 1840,
    centerY: 790,
    kind: "slime",
    radiusX: 300,
    radiusY: 220,
  },
  {
    centerX: 1850,
    centerY: 1240,
    kind: "goblin",
    radiusX: 330,
    radiusY: 210,
  },
  {
    centerX: 2520,
    centerY: 760,
    kind: "skeleton",
    radiusX: 360,
    radiusY: 230,
  },
  {
    centerX: 1180,
    centerY: 1760,
    kind: "wolf",
    radiusX: 420,
    radiusY: 220,
  },
  {
    centerX: 2700,
    centerY: 1680,
    kind: "orc",
    radiusX: 370,
    radiusY: 240,
  },
  {
    centerX: 2660,
    centerY: 1160,
    kind: "bat",
    radiusX: 330,
    radiusY: 250,
  },
];

const MONSTER_SHEETS: Record<
  Exclude<MonsterKind, "slime">,
  MonsterSheetDefinition
> = {
  bat: { columns: 4, file: "monsters/bat.png" },
  goblin: { columns: 4, file: "monsters/goblin.png" },
  orc: { columns: 3, file: "monsters/orc_warrior.png" },
  skeleton: { columns: 4, file: "monsters/skeleton.png" },
  wolf: { columns: 3, file: "monsters/wolf.png" },
};

const MONSTER_DEFINITIONS: Record<MonsterKind, MonsterDefinition> = {
  slime: {
    aggroRange: 210,
    contactDamage: 3,
    experience: 10,
    hp: 2,
    rewardGold: 2,
    scale: 2.4,
    speed: 56,
    texture: "rpg-slimeFront",
  },
  goblin: {
    aggroRange: 280,
    contactDamage: 5,
    experience: 16,
    hp: 4,
    rewardGold: 5,
    scale: 1.2,
    speed: 68,
    texture: "rpg-monster-goblin",
  },
  orc: {
    aggroRange: 330,
    contactDamage: 10,
    experience: 30,
    hp: 7,
    rewardGold: 10,
    scale: 1.28,
    speed: 58,
    texture: "rpg-monster-orc",
  },
  skeleton: {
    aggroRange: 300,
    contactDamage: 7,
    experience: 24,
    hp: 5,
    rewardGold: 8,
    scale: 1.18,
    speed: 61,
    texture: "rpg-monster-skeleton",
  },
  wolf: {
    aggroRange: 340,
    contactDamage: 6,
    experience: 20,
    hp: 4,
    rewardGold: 6,
    scale: 1.18,
    speed: 92,
    texture: "rpg-monster-wolf",
  },
  bat: {
    aggroRange: 280,
    contactDamage: 4,
    experience: 17,
    hp: 3,
    rewardGold: 4,
    scale: 1.12,
    speed: 84,
    texture: "rpg-monster-bat",
  },
};

export class CellWorldRpgScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private activeInteraction?: WorldInteraction;
  private movementKeys?: MovementKeys;
  private player?: Phaser.Physics.Arcade.Sprite;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private elder?: Phaser.Physics.Arcade.Sprite;
  private relic?: Phaser.Physics.Arcade.Sprite;
  private monsters?: Phaser.Physics.Arcade.Group;
  private dialogue?: Phaser.GameObjects.Container;
  private interactionPrompt?: Phaser.GameObjects.Text;
  private regionLabel?: Phaser.GameObjects.Text;
  private monsterSpawnTimer?: Phaser.Time.TimerEvent;
  private interactions: WorldInteraction[] = [];
  private npcSprites: Phaser.GameObjects.Image[] = [];
  private playerFacing: Facing = "front";
  private lastReportedCell = "";
  private lastContactDamageAt = 0;
  private lastFootstepEffectAt = 0;

  constructor() {
    super("cell-world-rpg");
  }

  preload() {
    for (const [key, file] of Object.entries(RPG_ASSETS)) {
      this.load.image(`rpg-${key}`, `${ASSET_BASE}/${file}`);
    }
    for (const [kind, sheet] of Object.entries(MONSTER_SHEETS)) {
      this.load.spritesheet(`rpg-monster-${kind}`, `${ASSET_BASE}/${sheet.file}`, {
        frameHeight: 48,
        frameWidth: 48,
      });
    }
  }

  create() {
    this.interactions = [];
    this.npcSprites = [];
    this.lastReportedCell = "";
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.createHeroFrames();
    this.createMonsterAnimations();
    this.drawWorld();

    const obstacles = this.physics.add.staticGroup();
    this.addVillage(obstacles);
    this.addEasternRuins(obstacles);
    this.addForest(obstacles);
    this.addExpandedRegions(obstacles);
    this.addDecorations(obstacles);

    this.addShadow(960, 586, 48, 17, 556);
    this.elder = this.physics.add
      .staticSprite(960, 560, "rpg-elder")
      .setScale(3)
      .setDepth(580);
    this.add
      .text(960, 512, "ELDER NORA", {
        color: "#fff7c8",
        fontFamily: '"Courier New", monospace',
        fontSize: "14px",
        fontStyle: "bold",
        stroke: "#17351f",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(900);
    this.registerInteraction({
      id: "elder_nora",
      kind: "elder",
      label: "장로 노라와 대화",
      name: "ELDER NORA / AI GUIDE",
      portrait: "rpg-elder",
      radius: 116,
      text: "셀의 균열에 관해 물어보세요.",
      x: 960,
      y: 560,
    });

    this.monsters = this.physics.add.group();
    for (let index = 0; index < 14; index += 1) {
      this.spawnMonsterFromZone(MONSTER_ZONES[index % MONSTER_ZONES.length]);
    }

    this.relic = this.physics.add
      .staticSprite(1840, 505, "rpg-questRelic")
      .setScale(2.5)
      .setDepth(535)
      .setVisible(false);
    this.add
      .text(1840, 454, "FORMULA CORE", {
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
    this.registerInteraction({
      id: "formula_core",
      kind: "relic",
      label: "수식 코어 회수",
      name: "ANCIENT FORMULA",
      portrait: "rpg-questRelic",
      radius: 82,
      text: "불안정한 셀 값을 고정하는 고대 수식 코어입니다.",
      x: 1840,
      y: 505,
    });

    this.playerShadow = this.addShadow(720, 614, 44, 15, 585);
    this.player = this.physics.add
      .sprite(720, 585, "rpg-heroSheet", "hero-front")
      .setScale(0.48)
      .setCollideWorldBounds(true);
    this.player.body?.setSize(56, 40).setOffset(22, 112);
    this.physics.add.collider(this.player, obstacles);
    this.physics.add.collider(this.monsters, obstacles);
    this.physics.add.collider(
      this.player,
      this.monsters,
      this.handleMonsterContact,
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
    this.input.keyboard?.on("keydown-E", this.handleInteractCommand, this);
    this.input.keyboard?.on("keydown-SPACE", this.handleAttackCommand, this);
    this.input.keyboard?.on("keydown-ESC", this.handleEscapeCommand, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-E", this.handleInteractCommand, this);
      this.input.keyboard?.off("keydown-SPACE", this.handleAttackCommand, this);
      this.input.keyboard?.off("keydown-ESC", this.handleEscapeCommand, this);
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.createDialogue();
    this.createInteractionPrompt();
    this.add
      .text(24, 24, "VILLAGE SQUARE  ·  DISCOVERED", {
        backgroundColor: "#0f412de8",
        color: "#d8ffe8",
        fontFamily: '"Courier New", monospace',
        fontSize: "14px",
        padding: { x: 12, y: 8 },
      })
      .setName("region-label")
      .setScrollFactor(0)
      .setDepth(2000);
    this.regionLabel = this.children.getByName(
      "region-label",
    ) as Phaser.GameObjects.Text;

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

    this.monsterSpawnTimer = this.time.addEvent({
      delay: 3200,
      loop: true,
      callback: this.maintainMonsterPopulation,
      callbackScope: this,
    });

    useGameStore
      .getState()
      .setSelectedCell("N12", '=MAP.LOAD("CELL_WORLD_EXPANDED")');
  }

  update(time: number) {
    if (!this.player || !this.cursors || !this.movementKeys) {
      return;
    }

    const state = useGameStore.getState();
    const accessory = getRpgEquipment(state.rpgEquippedItems.accessory);
    const speed = 190 + (accessory?.stats.moveSpeed ?? 0);
    const isOverlayOpen = Boolean(
      state.npcDialogueOpen || state.rpgDialogue || state.rpgShopOpen,
    );
    const controlsPaused = isOverlayOpen || state.rpgStatus === "lost";
    const left = this.cursors.left.isDown || this.movementKeys.left.isDown;
    const right = this.cursors.right.isDown || this.movementKeys.right.isDown;
    const up = this.cursors.up.isDown || this.movementKeys.up.isDown;
    const down = this.cursors.down.isDown || this.movementKeys.down.isDown;
    const velocity = controlsPaused
      ? new Phaser.Math.Vector2(0, 0)
      : new Phaser.Math.Vector2(
          Number(right) - Number(left),
          Number(down) - Number(up),
        );

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(speed);
      this.updatePlayerFacing(velocity);
    }

    this.player.setVelocity(velocity.x, velocity.y);
    this.player.setDepth(this.player.y + 32);
    this.updatePlayerMotion(time, velocity.lengthSq() > 0);
    this.updateNpcIdleMotion(time);
    this.updateMonsters(time, controlsPaused);
    this.updateRegionLabel();

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

  private createMonsterAnimations() {
    for (const [kind, sheet] of Object.entries(MONSTER_SHEETS)) {
      const animationKey = `rpg-${kind}-walk`;
      if (this.anims.exists(animationKey)) {
        continue;
      }
      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(`rpg-monster-${kind}`, {
          start: sheet.columns,
          end: sheet.columns * 2 - 1,
        }),
        frameRate: kind === "bat" ? 8 : 6,
        repeat: -1,
      });
    }
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
      .tileSprite(WORLD_WIDTH / 2, 560, WORLD_WIDTH, 144, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-80);
    this.add
      .tileSprite(720, WORLD_HEIGHT / 2, 144, WORLD_HEIGHT, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-79);
    this.add
      .tileSprite(1420, 1120, 1760, 120, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-78);
    this.add
      .tileSprite(1760, 850, 120, 700, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-77);
    this.add
      .tileSprite(2300, 1680, 1760, 128, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-76);
    this.add
      .tileSprite(2600, 1110, 128, 1140, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-75);
    this.add
      .tileSprite(1180, 1710, 128, 620, "rpg-dirt")
      .setTileScale(2)
      .setDepth(-74);
    this.add
      .tileSprite(2700, 500, 760, 560, "rpg-dungeonFloor")
      .setTileScale(2)
      .setTint(0xb6bec8)
      .setDepth(-72);
    this.add
      .rectangle(2700, 500, 780, 580, 0x342b48, 0.18)
      .setDepth(-71);

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
    const houses = [
      { id: "west_house", x: 250, y: 405, label: "서쪽 민가에서 휴식" },
      { id: "guild_house", x: 690, y: 365, label: "모험가 길드 조사" },
      { id: "east_house", x: 1280, y: 405, label: "동쪽 민가 살펴보기" },
    ] as const;

    for (const house of houses) {
      this.addShadow(house.x, house.y, 176, 40, house.y - 44);
      this.add
        .image(house.x, house.y, "rpg-house")
        .setOrigin(0.5, 1)
        .setScale(8)
        .setDepth(house.y - 12);
      this.addObstacle(obstacles, house.x, house.y - 52, 150, 86);
      this.registerInteraction({
        id: house.id,
        kind: "object",
        label: house.label,
        name: house.id === "guild_house" ? "ADVENTURER GUILD" : "VILLAGE HOUSE",
        portrait: "rpg-house",
        radius: 105,
        text:
          house.id === "guild_house"
            ? "게시판에는 동쪽 유적과 남쪽 고블린 변경의 위험 정보가 적혀 있습니다."
            : "따뜻한 불빛이 새어 나오는 작은 집입니다.",
        x: house.x,
        y: house.y - 2,
      });
    }

    this.add
      .image(1440, 500, "rpg-chest")
      .setScale(3)
      .setDepth(510);
    this.registerInteraction({
      id: "village_chest",
      kind: "object",
      label: "낡은 보급 상자 열기",
      name: "SUPPLY CHEST",
      portrait: "rpg-chest",
      radius: 78,
      text: "마을 순찰대가 남겨 둔 보급 상자입니다.",
      x: 1440,
      y: 500,
    });

    this.addShadow(360, 860, 150, 34, 816);
    this.add
      .image(360, 868, "rpg-market")
      .setOrigin(0.5, 1)
      .setScale(7)
      .setDepth(850);
    this.addObstacle(obstacles, 360, 814, 140, 66);
    this.registerInteraction({
      id: "market_stall",
      kind: "object",
      label: "상점 진열대 살펴보기",
      name: "CELL ITEM SHOP",
      portrait: "rpg-market",
      radius: 112,
      text: "회복 물약과 모험 장비가 셀 단위로 정리되어 있습니다.",
      x: 360,
      y: 850,
    });

    this.addNpc(
      obstacles,
      640,
      610,
      "rpg-merchant",
      "MERCHANT PICO",
      "merchant_pico",
      "모험 장비가 필요하면 언제든 말을 걸게. 골드만 충분하다면 바로 맞춰 주지.",
    );
    this.addNpc(
      obstacles,
      520,
      600,
      "rpg-villager",
      "VILLAGER MINA",
      "villager_mina",
      "요즘 남쪽 초원에서 슬라임이 길 가까이까지 올라와요. 검을 준비하세요.",
    );
    this.addNpc(
      obstacles,
      780,
      720,
      "rpg-knight",
      "CAPTAIN ARON",
      "captain_aron",
      "동쪽 유적 너머는 고블린 변경이다. 놈들이 가까이 오면 거리를 벌리고 공격하게.",
    );
    this.addNpc(
      obstacles,
      1180,
      620,
      "rpg-villager",
      "SCHOLAR LUMI",
      "scholar_lumi",
      "수식 코어는 유적 중앙의 빛나는 셀에 반응해요. 오래된 표지판도 읽어 보세요.",
    );
  }

  private addEasternRuins(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.addShadow(1840, 500, 190, 36, 460);
    this.add
      .image(1840, 510, "rpg-ruins")
      .setOrigin(0.5, 1)
      .setScale(9)
      .setDepth(495);
    this.addObstacle(obstacles, 1840, 453, 178, 80);

    this.add
      .text(1840, 368, "ANCIENT FORMULA RUINS", {
        color: "#dbe0cc",
        fontFamily: '"Courier New", monospace',
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#303b32",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(900);
    this.registerInteraction({
      id: "formula_ruins",
      kind: "object",
      label: "고대 수식 해독",
      name: "ANCIENT FORMULA RUINS",
      portrait: "rpg-ruins",
      radius: 145,
      text: "무너진 돌기둥에 '=WORLD.RESTORE()'라는 오래된 수식이 새겨져 있습니다.",
      x: 1840,
      y: 500,
    });

    this.addNpc(
      obstacles,
      1580,
      680,
      "rpg-knight",
      "RANGER ROWAN",
      "ranger_rowan",
      "이 길부터는 몬스터의 영역이야. 슬라임은 무리를 짓고, 고블린은 더 멀리까지 추적해.",
    );
  }

  private addForest(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    const treePositions = [
      [72, 145], [160, 190], [390, 145], [500, 180], [980, 150],
      [1380, 175], [1600, 160], [1760, 185], [2040, 145], [2220, 210],
      [90, 760], [180, 900], [90, 1100], [210, 1280], [120, 1460],
      [430, 980], [520, 1190], [420, 1420], [650, 1360], [850, 1450],
      [1040, 970], [1180, 1420], [1390, 930], [1510, 1440],
      [1660, 940], [1880, 1450], [2100, 900], [2200, 1120], [2200, 1440],
      [1470, 720], [2140, 660],
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

    this.add
      .text(430, 1280, "WHISPERING GROVE", {
        color: "#d8ffe3",
        fontFamily: '"Courier New", monospace',
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#17351f",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1450);
    this.addNpc(
      obstacles,
      700,
      1240,
      "rpg-villager",
      "HERBALIST TOMA",
      "herbalist_toma",
      "숲 가장자리의 붉은 물약은 여행자를 위해 둔 거예요. 다치면 사용하세요.",
    );
  }

  private addExpandedRegions(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.add
      .text(2700, 170, "FORGOTTEN CELL CITADEL", {
        color: "#ece7ff",
        fontFamily: '"Courier New", monospace',
        fontSize: "17px",
        fontStyle: "bold",
        stroke: "#2a2138",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(900);

    const citadelPillars = [
      [2380, 330],
      [2380, 660],
      [3020, 330],
      [3020, 660],
      [2540, 260],
      [2860, 260],
    ] as const;
    for (const [x, y] of citadelPillars) {
      this.add
        .image(x, y, "rpg-dungeonPillar")
        .setOrigin(0.5, 1)
        .setScale(2.4)
        .setDepth(y);
      this.addObstacle(obstacles, x, y - 30, 34, 64);
    }

    this.add
      .image(2700, 390, "rpg-dungeonStatue")
      .setOrigin(0.5, 1)
      .setScale(2.6)
      .setDepth(405);
    this.addObstacle(obstacles, 2700, 350, 52, 72);

    const portal = this.add
      .image(2920, 540, "rpg-dungeonPortal")
      .setScale(2.6)
      .setDepth(550);
    this.tweens.add({
      targets: portal,
      alpha: { from: 0.72, to: 1 },
      scale: { from: 2.45, to: 2.72 },
      duration: 950,
      yoyo: true,
      repeat: -1,
    });
    this.registerInteraction({
      id: "citadel_portal",
      kind: "object",
      label: "보랏빛 포탈 조사",
      name: "BROKEN CELL PORTAL",
      portrait: "rpg-questRelic",
      radius: 96,
      text: "포탈 안쪽에서 삭제된 워크시트의 좌표가 반복해서 깜빡입니다.",
      x: 2920,
      y: 540,
    });

    for (const x of [2480, 2920]) {
      this.add
        .image(x, 690, "rpg-dungeonBrazier")
        .setScale(2.5)
        .setDepth(700);
    }

    this.addNpc(
      obstacles,
      2440,
      790,
      "rpg-knight",
      "ARCHIVIST EVE",
      "archivist_eve",
      "성채의 해골 수호자는 오래된 셀 주소를 지키고 있어요. 움직임이 느릴 때 측면을 노리세요.",
    );

    this.add
      .text(1200, 1580, "MOONLIGHT WOLF GROVE", {
        color: "#d8efff",
        fontFamily: '"Courier New", monospace',
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#17351f",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1700);

    const expandedTrees = [
      [120, 1820],
      [300, 1950],
      [560, 1760],
      [760, 1940],
      [980, 1850],
      [1380, 1950],
      [1580, 1800],
      [1860, 1950],
      [2180, 1830],
      [2340, 1960],
      [2860, 1940],
      [3100, 1830],
      [3100, 980],
      [3060, 1280],
      [3020, 1500],
      [2440, 1060],
      [2440, 1420],
    ] as const;
    for (const [x, y] of expandedTrees) {
      this.addShadow(x, y, 54, 16, y - 12);
      this.add
        .image(x, y, "rpg-tree")
        .setOrigin(0.5, 1)
        .setScale(4.4)
        .setDepth(y);
      this.addObstacle(obstacles, x, y - 13, 38, 26);
    }

    this.addNpc(
      obstacles,
      1320,
      1740,
      "rpg-villager",
      "SCOUT RIA",
      "scout_ria",
      "늑대들은 혼자일 때보다 무리일 때 빨라져요. 바람 장화를 준비하면 거리를 유지하기 쉬워요.",
    );

    this.add
      .image(3020, 1720, "rpg-chest")
      .setScale(3.2)
      .setDepth(1730);
    this.registerInteraction({
      id: "citadel_chest",
      kind: "object",
      label: "성채 보물상자 열기",
      name: "CITADEL TREASURE",
      portrait: "rpg-chest",
      radius: 84,
      text: "성채 깊숙한 곳에서 발견한 오래된 보급 상자입니다.",
      x: 3020,
      y: 1720,
    });

    this.add
      .image(2200, 1680, "rpg-sign")
      .setScale(2.8)
      .setDepth(1690);
    this.addObstacle(obstacles, 2200, 1685, 30, 38);
    this.registerInteraction({
      id: "southern_crossroad",
      kind: "object",
      label: "남부 교차로 표지판 읽기",
      name: "SOUTHERN CROSSROAD",
      portrait: "rpg-sign",
      radius: 76,
      text: "← 달빛 늑대 숲 / ↑ 고블린 변경 / → 잊힌 셀 성채",
      x: 2200,
      y: 1680,
    });
  }

  private addDecorations(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    const bushes = [
      [535, 420], [880, 410], [1005, 680], [1265, 680], [610, 850],
      [1320, 880], [1540, 1040], [1720, 910], [1920, 1040], [2070, 1260],
      [960, 1240], [1160, 1320], [360, 1120], [520, 1460],
    ] as const;
    for (const [x, y] of bushes) {
      this.add
        .image(x, y, "rpg-bush")
        .setScale(2.6)
        .setDepth(y);
    }

    const flowerPatches = [
      [430, 480], [820, 700], [970, 805], [1240, 550], [210, 680],
      [720, 1080], [1080, 1140], [1430, 1230], [1830, 900], [2050, 520],
    ] as const;
    for (const [x, y] of flowerPatches) {
      this.add
        .image(x, y, "rpg-flowers")
        .setScale(2.2)
        .setDepth(y);
    }

    const solidDecorations = [
      [430, 760, "rpg-log", 2.8, 50, 24],
      [870, 865, "rpg-rock", 2.7, 42, 30],
      [1350, 700, "rpg-rock", 2.5, 38, 27],
      [1480, 1180, "rpg-log", 2.8, 50, 24],
      [2010, 1160, "rpg-rock", 2.8, 44, 32],
      [1060, 1380, "rpg-rock", 2.4, 38, 27],
      [510, 500, "rpg-fence", 3.2, 62, 24],
      [350, 500, "rpg-sign", 2.8, 30, 38],
      [1660, 590, "rpg-sign", 2.8, 30, 38],
      [1530, 1120, "rpg-sign", 2.8, 30, 38],
    ] as const;

    for (const [x, y, key, scale, width, height] of solidDecorations) {
      this.add
        .image(x, y, key)
        .setScale(scale)
        .setDepth(y);
      this.addObstacle(obstacles, x, y + 5, width, height);
    }

    this.registerInteraction({
      id: "village_sign",
      kind: "object",
      label: "마을 표지판 읽기",
      name: "VILLAGE SIGN",
      portrait: "rpg-sign",
      radius: 76,
      text: "← 상점 · 북쪽 민가 / 동쪽 수식 유적 → / 남쪽 속삭임 숲 ↓",
      x: 350,
      y: 500,
    });
    this.registerInteraction({
      id: "ruins_sign",
      kind: "object",
      label: "유적 경고문 읽기",
      name: "RUINS WARNING",
      portrait: "rpg-sign",
      radius: 76,
      text: "경고: 동쪽 셀의 값이 불안정합니다. 슬라임과 고블린 출현 구역.",
      x: 1660,
      y: 590,
    });
    this.registerInteraction({
      id: "frontier_sign",
      kind: "object",
      label: "변경 표지판 읽기",
      name: "GOBLIN FRONTIER",
      portrait: "rpg-sign",
      radius: 76,
      text: "이 남동쪽 길부터 고블린 변경입니다. 혼자 오래 머무르지 마세요.",
      x: 1530,
      y: 1120,
    });

    this.add
      .image(820, 1270, "rpg-potion")
      .setScale(2.7)
      .setDepth(1280);
    this.registerInteraction({
      id: "forest_potion",
      kind: "object",
      label: "숲의 회복 물약 사용",
      name: "FOREST REMEDY",
      portrait: "rpg-potion",
      radius: 76,
      text: "약초꾼이 여행자를 위해 남겨 둔 회복 물약입니다.",
      x: 820,
      y: 1270,
    });

    this.add
      .image(2100, 1320, "rpg-chest")
      .setScale(3.1)
      .setDepth(1330);
    this.registerInteraction({
      id: "frontier_chest",
      kind: "object",
      label: "고블린 보물 상자 열기",
      name: "GOBLIN CACHE",
      portrait: "rpg-chest",
      radius: 82,
      text: "고블린들이 모아 둔 금화가 들어 있는 상자입니다.",
      x: 2100,
      y: 1320,
    });
  }

  private addNpc(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    texture: string,
    name: string,
    id: string,
    text: string,
  ) {
    this.addShadow(x, y + 23, 38, 11, y - 2);
    const npc = this.add
      .image(x, y, texture)
      .setScale(2.7)
      .setDepth(y + 24)
      .setData("baseY", y)
      .setData("idleOffset", Phaser.Math.FloatBetween(0, Math.PI * 2));
    this.npcSprites.push(npc);
    this.add
      .text(x, y - 48, name, {
        color: "#fff8cc",
        fontFamily: '"Courier New", monospace',
        fontSize: "12px",
        fontStyle: "bold",
        stroke: "#17351f",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(y + 80);
    this.addObstacle(obstacles, x, y + 12, 34, 32);
    this.registerInteraction({
      id,
      kind: "npc",
      label: `${name}와 대화`,
      name,
      portrait: texture,
      radius: 92,
      text,
      x,
      y,
    });
  }

  private registerInteraction(interaction: WorldInteraction) {
    this.interactions.push(interaction);
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

  private spawnMonsterFromZone(zone?: MonsterZone) {
    if (!this.monsters || this.monsters.countActive(true) >= MAX_MONSTERS) {
      return;
    }

    const selectedZone =
      zone ?? Phaser.Utils.Array.GetRandom(MONSTER_ZONES);
    let x = selectedZone.centerX;
    let y = selectedZone.centerY;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      x = Phaser.Math.Clamp(
        selectedZone.centerX +
          Phaser.Math.Between(-selectedZone.radiusX, selectedZone.radiusX),
        72,
        WORLD_WIDTH - 72,
      );
      y = Phaser.Math.Clamp(
        selectedZone.centerY +
          Phaser.Math.Between(-selectedZone.radiusY, selectedZone.radiusY),
        72,
        WORLD_HEIGHT - 72,
      );
      if (
        !this.player ||
        Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) > 280
      ) {
        break;
      }
    }

    this.createMonster(selectedZone.kind, x, y, selectedZone);
  }

  private createMonster(
    kind: MonsterKind,
    x: number,
    y: number,
    zone: MonsterZone,
  ) {
    if (!this.monsters) {
      return;
    }

    const definition = MONSTER_DEFINITIONS[kind];
    const isFlying = kind === "bat";
    const shadow = this.add
      .ellipse(
        x,
        y + (isFlying ? 28 : 20),
        42 * definition.scale,
        12,
        0x10231a,
        isFlying ? 0.16 : 0.28,
      )
      .setDepth(y - 2);
    const monster = this.physics.add
      .sprite(x, y, definition.texture)
      .setScale(definition.scale)
      .setAlpha(0)
      .setCollideWorldBounds(true)
      .setDepth(y);
    monster
      .setData("kind", kind)
      .setData("hp", definition.hp)
      .setData("speed", definition.speed)
      .setData("aggroRange", definition.aggroRange)
      .setData("contactDamage", definition.contactDamage)
      .setData("experience", definition.experience)
      .setData("rewardGold", definition.rewardGold)
      .setData("baseScale", definition.scale)
      .setData("motionOffset", Phaser.Math.FloatBetween(0, Math.PI * 2))
      .setData("homeX", zone.centerX)
      .setData("homeY", zone.centerY)
      .setData("homeRadiusX", zone.radiusX)
      .setData("homeRadiusY", zone.radiusY)
      .setData("nextDecisionAt", this.time.now + Phaser.Math.Between(500, 1600))
      .setData("shadow", shadow);
    monster.body?.setCircle(kind === "slime" ? 9 : 15, 9, 15);
    this.monsters.add(monster);
    if (kind !== "slime") {
      monster.play(`rpg-${kind}-walk`);
    }

    const spawnEffect = this.add
      .circle(
        x,
        y + 10,
        28,
        kind === "slime" ? 0x69d7ff : 0x9ed36a,
        0.26,
      )
      .setDepth(y - 3);
    this.tweens.add({
      targets: monster,
      alpha: { from: 0, to: 1 },
      scaleX: { from: definition.scale * 0.55, to: definition.scale },
      scaleY: { from: definition.scale * 0.55, to: definition.scale },
      duration: 260,
    });
    this.tweens.add({
      targets: spawnEffect,
      alpha: 0,
      scale: 1.7,
      duration: 260,
      onComplete: () => spawnEffect.destroy(),
    });
  }

  private maintainMonsterPopulation() {
    if (this.monsters && this.monsters.countActive(true) < MAX_MONSTERS) {
      this.spawnMonsterFromZone();
    }
  }

  private updateMonsters(time: number, paused: boolean) {
    if (!this.monsters || !this.player) {
      return;
    }

    const playerAlive = useGameStore.getState().hp > 0;
    for (const child of this.monsters.getChildren()) {
      const monster = child as Phaser.Physics.Arcade.Sprite;
      if (!monster.active) {
        continue;
      }

      const shadow = monster.getData("shadow") as
        | Phaser.GameObjects.Ellipse
        | undefined;
      const kind = monster.getData("kind") as MonsterKind;
      const motionOffset = Number(monster.getData("motionOffset") ?? 0);
      const baseScale = Number(monster.getData("baseScale") ?? 1);
      const flyingBob =
        kind === "bat" ? Math.sin(time / 125 + motionOffset) * 6 : 0;
      shadow
        ?.setPosition(monster.x, monster.y + (kind === "bat" ? 32 : 20))
        .setScale(kind === "bat" ? 0.86 + Math.abs(flyingBob) * 0.008 : 1)
        .setDepth(monster.y - 2);
      monster.setDepth(monster.y);

      if (paused || !playerAlive) {
        monster.setVelocity(0, 0);
        monster.setAngle(0);
        continue;
      }

      if (time < Number(monster.getData("stunUntil") ?? 0)) {
        this.updateMonsterTexture(monster);
        continue;
      }

      const distanceToPlayer = Phaser.Math.Distance.Between(
        monster.x,
        monster.y,
        this.player.x,
        this.player.y,
      );
      const aggroRange = Number(monster.getData("aggroRange") ?? 210);
      const speed = Number(monster.getData("speed") ?? 56);
      const homeX = Number(monster.getData("homeX") ?? monster.x);
      const homeY = Number(monster.getData("homeY") ?? monster.y);
      const homeRadiusX = Number(monster.getData("homeRadiusX") ?? 260);
      const homeRadiusY = Number(monster.getData("homeRadiusY") ?? 180);
      const tooFarFromHome =
        Math.abs(monster.x - homeX) > homeRadiusX * 1.25 ||
        Math.abs(monster.y - homeY) > homeRadiusY * 1.25;

      if (distanceToPlayer < aggroRange && !tooFarFromHome) {
        this.physics.moveToObject(monster, this.player, speed + 18);
      } else if (tooFarFromHome) {
        this.physics.moveTo(monster, homeX, homeY, speed);
      } else if (time >= Number(monster.getData("nextDecisionAt") ?? 0)) {
        const targetX = Phaser.Math.Clamp(
          homeX + Phaser.Math.Between(-homeRadiusX, homeRadiusX),
          60,
          WORLD_WIDTH - 60,
        );
        const targetY = Phaser.Math.Clamp(
          homeY + Phaser.Math.Between(-homeRadiusY, homeRadiusY),
          60,
          WORLD_HEIGHT - 60,
        );
        this.physics.moveTo(monster, targetX, targetY, speed);
        monster.setData(
          "nextDecisionAt",
          time + Phaser.Math.Between(1300, 2800),
        );
      }

      this.updateMonsterTexture(monster);
      if (kind === "slime") {
        const bounce = Math.sin(time / 115 + motionOffset);
        monster.setScale(
          baseScale + Math.abs(bounce) * 0.08,
          baseScale - Math.abs(bounce) * 0.06,
        );
      } else {
        monster
          .setAngle(Math.sin(time / 220 + motionOffset) * (kind === "bat" ? 3 : 1))
          .setScale(baseScale, baseScale + flyingBob * 0.0025);
      }
    }
  }

  private updateMonsterTexture(monster: Phaser.Physics.Arcade.Sprite) {
    if (!monster.body) {
      return;
    }
    const kind = monster.getData("kind") as MonsterKind;
    const velocity = monster.body.velocity;
    if (kind !== "slime") {
      if (Math.abs(velocity.x) > 2) {
        monster.setFlipX(velocity.x < 0);
      }
      return;
    }

    let texture = "rpg-slimeFront";
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      texture = velocity.x < 0 ? "rpg-slimeLeft" : "rpg-slimeRight";
    } else if (velocity.y < 0) {
      texture = "rpg-slimeBack";
    }
    if (monster.texture.key !== texture) {
      monster.setTexture(texture);
    }
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

  private createInteractionPrompt() {
    this.interactionPrompt = this.add
      .text(0, 0, "[E] INTERACT", {
        backgroundColor: "#10251fe8",
        color: "#fff4aa",
        fontFamily: '"Courier New", monospace',
        fontSize: "13px",
        fontStyle: "bold",
        padding: { x: 13, y: 8 },
        stroke: "#07140f",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3050)
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

  private updatePlayerMotion(time: number, isMoving: boolean) {
    if (!this.player) {
      return;
    }

    this.playerShadow
      ?.setPosition(this.player.x, this.player.y + 29)
      .setDepth(this.player.y - 2);

    if (!isMoving) {
      this.player.setAngle(0).setScale(0.48);
      this.playerShadow?.setScale(1, 1).setAlpha(0.28);
      return;
    }

    const step = Math.sin(time / 78);
    const stride = Math.cos(time / 78);
    this.player
      .setAngle(step * 1.7)
      .setScale(0.48 + Math.abs(step) * 0.008, 0.48 - Math.abs(step) * 0.01);
    this.playerShadow
      ?.setScale(1 - Math.abs(step) * 0.08, 1 + Math.abs(step) * 0.04)
      .setAlpha(0.24 + Math.abs(stride) * 0.06);

    if (time - this.lastFootstepEffectAt >= 240) {
      this.lastFootstepEffectAt = time;
      const dust = this.add
        .ellipse(
          this.player.x - stride * 8,
          this.player.y + 27,
          12,
          5,
          0xd9c48a,
          0.28,
        )
        .setDepth(this.player.y - 3);
      this.tweens.add({
        targets: dust,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 0.7,
        duration: 260,
        onComplete: () => dust.destroy(),
      });
    }
  }

  private updateNpcIdleMotion(time: number) {
    for (const npc of this.npcSprites) {
      const baseY = Number(npc.getData("baseY") ?? npc.y);
      const offset = Number(npc.getData("idleOffset") ?? 0);
      const bob = Math.sin(time / 520 + offset) * 1.4;
      npc.setY(baseY + bob).setAngle(Math.sin(time / 760 + offset) * 0.7);
    }
  }

  private handleInteractCommand() {
    const state = useGameStore.getState();

    if (state.rpgStatus === "lost") {
      return;
    }

    if (state.rpgDialogue) {
      state.closeRpgDialogue();
      return;
    }
    if (state.npcDialogueOpen || state.rpgShopOpen) {
      return;
    }
    if (this.activeInteraction) {
      this.handleWorldInteraction(this.activeInteraction);
    }
  }

  private handleAttackCommand() {
    const state = useGameStore.getState();
    if (
      state.rpgStatus === "playing" &&
      !state.npcDialogueOpen &&
      !state.rpgDialogue &&
      !state.rpgShopOpen
    ) {
      this.attackNearbyMonsters();
    }
  }

  private handleEscapeCommand() {
    const state = useGameStore.getState();

    if (state.rpgShopOpen) {
      state.closeRpgShop();
    } else if (state.rpgDialogue) {
      state.closeRpgDialogue();
    } else if (state.npcDialogueOpen) {
      state.closeNpcDialogue();
    }
  }

  private updateInteraction() {
    if (!this.player || !this.dialogue || !this.interactionPrompt) {
      return;
    }

    const state = useGameStore.getState();
    const camera = this.cameras.main;
    this.dialogue.setPosition(camera.width / 2, camera.height - 92);
    this.interactionPrompt.setPosition(camera.width / 2, camera.height - 30);

    if (state.rpgStatus === "lost") {
      this.activeInteraction = undefined;
      this.dialogue.setVisible(false);
      this.interactionPrompt.setVisible(false);
      return;
    }

    if (state.npcDialogueOpen || state.rpgDialogue || state.rpgShopOpen) {
      this.activeInteraction = undefined;
      this.dialogue.setVisible(false);
      this.interactionPrompt.setVisible(false);
      return;
    }

    const nearby = this.interactions
      .filter(
        (interaction) =>
          interaction.kind !== "relic" || Boolean(this.relic?.visible),
      )
      .map((interaction) => ({
        interaction,
        distance: Phaser.Math.Distance.Between(
          this.player!.x,
          this.player!.y,
          interaction.x,
          interaction.y,
        ),
      }))
      .filter(({ interaction, distance }) => distance < interaction.radius)
      .sort((first, second) => first.distance - second.distance)[0]?.interaction;

    this.activeInteraction = nearby;
    this.dialogue.setVisible(nearby?.kind === "elder");
    this.interactionPrompt
      .setText(nearby ? `[E] ${nearby.label}` : "[E] INTERACT")
      .setVisible(Boolean(nearby));
  }

  private handleWorldInteraction(interaction: WorldInteraction) {
    const state = useGameStore.getState();

    if (interaction.kind === "elder") {
      state.setSelectedCell("AI01", '=NPC.CHAT("ELDER_NORA")');
      state.openNpcDialogue();
      return;
    }

    if (interaction.id === "merchant_pico" || interaction.id === "market_stall") {
      state.setSelectedCell("SHOP", '=SHOP.OPEN("MERCHANT_PICO")');
      state.openRpgShop();
      return;
    }

    if (interaction.kind === "relic") {
      if (this.relic?.visible) {
        state.collectRpgRelic();
        this.relic.setVisible(false);
        this.showWorldMessage(
          interaction.name,
          "수식 코어를 회수했습니다. 주변의 균열 슬라임 3마리를 처치하세요.",
          interaction.portrait,
        );
      }
      return;
    }

    if (interaction.kind === "npc") {
      this.showWorldMessage(
        interaction.name,
        interaction.text,
        interaction.portrait,
      );
      state.setSelectedCell(
        "NPC",
        `=NPC.TALK("${interaction.id.toUpperCase()}")`,
      );
      return;
    }

    const opened = state.rpgOpenedObjects.includes(interaction.id);
    let message = interaction.text;
    if (interaction.id === "village_chest") {
      if (!opened) {
        state.claimRpgReward(interaction.id, { gold: 35, heal: 8 });
        message = "상자에서 35G와 작은 회복 물약을 얻었습니다.";
      } else {
        message = "이미 확인한 보급 상자입니다.";
      }
    } else if (interaction.id === "frontier_chest") {
      if (!opened) {
        state.claimRpgReward(interaction.id, { gold: 80 });
        message = "고블린 보물 상자에서 80G를 획득했습니다!";
      } else {
        message = "금화는 모두 회수했습니다.";
      }
    } else if (interaction.id === "citadel_chest") {
      if (!opened) {
        state.claimRpgReward(interaction.id, { gold: 120, heal: 20 });
        message = "성채 보물 상자에서 120G와 회복 물약을 획득했습니다!";
      } else {
        message = "오래된 성채 상자는 이미 비어 있습니다.";
      }
    } else if (interaction.id === "forest_potion") {
      if (!opened) {
        state.claimRpgReward(interaction.id, { heal: 30 });
        message = "숲의 회복 물약을 사용해 HP를 30 회복했습니다.";
      } else {
        message = "빈 물약병만 남아 있습니다.";
      }
    } else if (
      interaction.id === "west_house" ||
      interaction.id === "east_house"
    ) {
      state.healRpgPlayer(18);
      message = "잠시 쉬어 HP를 18 회복했습니다.";
    }

    state.setSelectedCell(
      "OBJ",
      `=OBJECT.INTERACT("${interaction.id.toUpperCase()}")`,
    );
    this.showWorldMessage(interaction.name, message, interaction.portrait);
  }

  private showWorldMessage(name: string, text: string, portrait?: string) {
    useGameStore.getState().openRpgDialogue({ name, portrait, text });
  }

  private attackNearbyMonsters() {
    if (!this.player || !this.monsters) {
      return;
    }

    const state = useGameStore.getState();
    const stage = state.rpgQuestStage;
    const weapon = getRpgEquipment(state.rpgEquippedItems.weapon);
    const accessory = getRpgEquipment(state.rpgEquippedItems.accessory);
    const attackDamage = 1 + (weapon?.stats.attackDamage ?? 0);
    const attackRange = 80 + (accessory?.stats.attackRange ?? 0);
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

    const children = this.monsters
      .getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (const monster of children) {
      if (!monster.active) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        monster.x,
        monster.y,
      );

      if (distance > attackRange) {
        continue;
      }

      const hp = Number(monster.getData("hp") ?? 2) - attackDamage;
      monster.setData("hp", hp);
      monster.setTint(0xffffff);
      this.time.delayedCall(90, () => {
        if (monster.active) {
          monster.clearTint();
        }
      });

      if (hp <= 0) {
        const kind = monster.getData("kind") as MonsterKind;
        const shadow = monster.getData("shadow") as
          | Phaser.GameObjects.Ellipse
          | undefined;
        const defeatEffect = this.add
          .circle(
            monster.x,
            monster.y,
            34,
            kind === "slime" ? 0x75dcff : 0xa7d36d,
            0.6,
          )
          .setDepth(monster.y + 1);
        this.tweens.add({
          targets: defeatEffect,
          scale: 1.8,
          alpha: 0,
          duration: 260,
          onComplete: () => defeatEffect.destroy(),
        });
        shadow?.destroy();
        monster.disableBody(true, true);
        const rewardState = useGameStore.getState();
        rewardState.gainRpgExperience(
          Number(monster.getData("experience") ?? 10),
        );
        rewardState.earnRpgGold(Number(monster.getData("rewardGold") ?? 2));
        if (kind === "slime" && stage === "defeat_slimes") {
          rewardState.defeatRpgSlime();
        }
      }
    }
  }

  private handleMonsterContact(
    _playerObject: ArcadeCollisionObject,
    monsterObject: ArcadeCollisionObject,
  ) {
    const now = this.time.now;
    const state = useGameStore.getState();

    if (
      state.rpgStatus === "lost" ||
      now - this.lastContactDamageAt < 1100
    ) {
      return;
    }

    this.lastContactDamageAt = now;
    const monster = monsterObject as Phaser.Physics.Arcade.Sprite;
    const damage = Number(monster.getData("contactDamage") ?? 5);
    state.damageRpgPlayer(damage);
    monster.setData("stunUntil", now + 650);
    monster.setVelocity(
      Phaser.Math.Between(-220, 220),
      Phaser.Math.Between(-220, 220),
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

  }

  private updateRegionLabel() {
    if (!this.player || !this.regionLabel) {
      return;
    }

    let region = "VILLAGE SQUARE";
    if (this.player.x > 2300 && this.player.y < 900) {
      region = "FORGOTTEN CELL CITADEL";
    } else if (this.player.x > 2300 && this.player.y < 1450) {
      region = "DELETED SHEET MARSH";
    } else if (this.player.x > 2300 && this.player.y >= 1450) {
      region = "ORC ARCHIVE CAMP";
    } else if (this.player.y > 1500 && this.player.x < 2200) {
      region = "MOONLIGHT WOLF GROVE";
    } else if (this.player.x > 1580 && this.player.y > 980) {
      region = "GOBLIN FRONTIER";
    } else if (this.player.x > 1500 && this.player.y < 930) {
      region = "ANCIENT FORMULA RUINS";
    } else if (this.player.y > 1040 && this.player.x < 900) {
      region = "WHISPERING GROVE";
    } else if (this.player.y > 960) {
      region = "SOUTH CELL MEADOW";
    }

    if (this.regionLabel.getData("region") !== region) {
      this.regionLabel
        .setData("region", region)
        .setText(`${region}  ·  DISCOVERED`);
    }
  }

  private toCellAddress(x: number, y: number) {
    const maxColumnIndex = Math.ceil(WORLD_WIDTH / CELL_SIZE) - 1;
    const maxRow = Math.ceil(WORLD_HEIGHT / CELL_SIZE);
    const columnIndex = Phaser.Math.Clamp(
      Math.floor(x / CELL_SIZE),
      0,
      maxColumnIndex,
    );
    const row = Phaser.Math.Clamp(Math.floor(y / CELL_SIZE) + 1, 1, maxRow);
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
