import * as Phaser from "phaser";
import {
  getRpgRelic,
  RPG_RELICS,
  type RpgRelicId,
} from "@/lib/rpgRelics";
import { getRpgEquipment } from "@/lib/rpgShop";
import { useGameStore } from "@/stores/gameStore";

const WORLD_WIDTH = 14_200;
const WORLD_HEIGHT = 4_700;
const CELL_SIZE = 48;
const ASSET_BASE = "/assets/pixel-art/rpg";
const ADVENTURE_BASE = `${ASSET_BASE}/adventure`;
const MAX_MONSTERS = 12;
const ARENA_WIDTH = 1_180;
const ARENA_HEIGHT = 720;
const ARENA_STEP_X = 1_380;
const ARENA_START_X = 680;
const CAVE_CENTER_Y = 2_790;
const SNOW_CENTER_Y = 4_000;

const RPG_ASSETS = {
  bush: "bush.png",
  chest: "chest.png",
  coin: "coin.png",
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
  | "caveBoss"
  | "darkMage"
  | "frostBat"
  | "frostGoblin"
  | "frostOrc"
  | "frostSlime"
  | "frostWolf"
  | "goblin"
  | "mimic"
  | "orc"
  | "skeleton"
  | "skeletonArcher"
  | "slime"
  | "snowBoss"
  | "wolf"
  | "zombie";
type InteractionKind = "elder" | "npc" | "object" | "portal" | "relic";
type HuntingTheme = "cave" | "snow";
type RpgMapId =
  | "town"
  | `cave-${number}`
  | `snow-${number}`;
type DropKind = "gold" | "potion" | "relic";

interface MonsterZone {
  centerX: number;
  centerY: number;
  kind: MonsterKind;
  mapId: RpgMapId;
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
  boss?: boolean;
}

interface MonsterSheetDefinition {
  file: string;
}

interface HuntingMapDefinition {
  centerX: number;
  centerY: number;
  id: RpgMapId;
  label: string;
  monsters: MonsterKind[];
  stage: number;
  theme: HuntingTheme;
}

interface WorldInteraction {
  id: string;
  kind: InteractionKind;
  label: string;
  name: string;
  portrait?: string;
  radius: number;
  text: string;
  targetMap?: RpgMapId;
  x: number;
  y: number;
}

const HUNTING_MAPS: HuntingMapDefinition[] = [
  ...Array.from({ length: 10 }, (_, index) => {
    const stage = index + 1;
    return {
      centerX: ARENA_START_X + index * ARENA_STEP_X,
      centerY: CAVE_CENTER_Y,
      id: `cave-${stage}` as RpgMapId,
      label:
        stage === 10
          ? "CAVE 10 · ABYSSAL THRONE"
          : `CAVE ${String(stage).padStart(2, "0")} · CRYSTAL DEPTHS`,
      monsters:
        stage === 10
          ? (["caveBoss"] as MonsterKind[])
          : ([
              "slime",
              "goblin",
              stage >= 3 ? "bat" : "slime",
              stage >= 5 ? "skeleton" : "goblin",
              stage >= 7 ? "skeletonArcher" : "mimic",
              stage >= 8 ? "darkMage" : "zombie",
            ] as MonsterKind[]),
      stage,
      theme: "cave" as const,
    };
  }),
  ...Array.from({ length: 10 }, (_, index) => {
    const stage = index + 1;
    return {
      centerX: ARENA_START_X + index * ARENA_STEP_X,
      centerY: SNOW_CENTER_Y,
      id: `snow-${stage}` as RpgMapId,
      label:
        stage === 10
          ? "SNOW 10 · FROZEN CROWN"
          : `SNOW ${String(stage).padStart(2, "0")} · WHITE ARCHIVE`,
      monsters:
        stage === 10
          ? (["snowBoss"] as MonsterKind[])
          : ([
              "frostSlime",
              "frostGoblin",
              stage >= 3 ? "frostWolf" : "frostSlime",
              stage >= 5 ? "frostBat" : "frostGoblin",
              stage >= 7 ? "frostOrc" : "frostWolf",
              stage >= 8 ? "darkMage" : "frostBat",
            ] as MonsterKind[]),
      stage,
      theme: "snow" as const,
    };
  }),
];

const MONSTER_SHEETS: Record<MonsterKind, MonsterSheetDefinition> = {
  bat: { file: "monsters/bat-8.png" },
  caveBoss: { file: "monsters/orc-8.png" },
  darkMage: { file: "monsters/dark-mage-8.png" },
  frostBat: { file: "monsters/frost-bat-8.png" },
  frostGoblin: { file: "monsters/frost-goblin-8.png" },
  frostOrc: { file: "monsters/frost-orc-8.png" },
  frostSlime: { file: "monsters/frost-slime-8.png" },
  frostWolf: { file: "monsters/frost-wolf-8.png" },
  goblin: { file: "monsters/goblin-8.png" },
  mimic: { file: "monsters/mimic-8.png" },
  orc: { file: "monsters/orc-8.png" },
  skeleton: { file: "monsters/skeleton-8.png" },
  skeletonArcher: { file: "monsters/skeleton-archer-8.png" },
  slime: { file: "monsters/slime-8.png" },
  snowBoss: { file: "monsters/frost-orc-8.png" },
  wolf: { file: "monsters/wolf-8.png" },
  zombie: { file: "monsters/zombie-8.png" },
};

const CHARACTER_SHEETS = {
  archer: "characters/archer.png",
  frostMage: "characters/frostmage.png",
  mage: "characters/mage.png",
  pirate: "characters/pirate.png",
  swordmaster: "characters/swordmaster.png",
  warrior: "characters/warrior.png",
} as const;

const ADVENTURE_IMAGES = {
  caveFloor: "maps/floor-tile-stone.png",
  cavePillar: "maps/dungeon-pillar.png",
  cavePortal: "maps/portal-purple.png",
  cyanPortal: "maps/portal-cyan.png",
  iceFloor: "maps/floor-ice.png",
  potionDrop: "items/health-potion.png",
} as const;

const MONSTER_DEFINITIONS: Record<MonsterKind, MonsterDefinition> = {
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
  caveBoss: {
    aggroRange: 520,
    boss: true,
    contactDamage: 16,
    experience: 100,
    hp: 52,
    rewardGold: 120,
    scale: 2.35,
    speed: 67,
    texture: "rpg-monster-caveBoss",
  },
  darkMage: {
    aggroRange: 390,
    contactDamage: 11,
    experience: 38,
    hp: 9,
    rewardGold: 14,
    scale: 1.24,
    speed: 60,
    texture: "rpg-monster-darkMage",
  },
  frostBat: {
    aggroRange: 330,
    contactDamage: 7,
    experience: 25,
    hp: 5,
    rewardGold: 8,
    scale: 1.18,
    speed: 98,
    texture: "rpg-monster-frostBat",
  },
  frostGoblin: {
    aggroRange: 340,
    contactDamage: 9,
    experience: 31,
    hp: 8,
    rewardGold: 11,
    scale: 1.24,
    speed: 76,
    texture: "rpg-monster-frostGoblin",
  },
  frostOrc: {
    aggroRange: 390,
    contactDamage: 14,
    experience: 50,
    hp: 13,
    rewardGold: 18,
    scale: 1.38,
    speed: 66,
    texture: "rpg-monster-frostOrc",
  },
  frostSlime: {
    aggroRange: 260,
    contactDamage: 6,
    experience: 20,
    hp: 5,
    rewardGold: 7,
    scale: 1.2,
    speed: 64,
    texture: "rpg-monster-frostSlime",
  },
  frostWolf: {
    aggroRange: 410,
    contactDamage: 10,
    experience: 33,
    hp: 7,
    rewardGold: 11,
    scale: 1.22,
    speed: 112,
    texture: "rpg-monster-frostWolf",
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
  mimic: {
    aggroRange: 250,
    contactDamage: 9,
    experience: 28,
    hp: 8,
    rewardGold: 15,
    scale: 1.2,
    speed: 52,
    texture: "rpg-monster-mimic",
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
  skeletonArcher: {
    aggroRange: 380,
    contactDamage: 8,
    experience: 30,
    hp: 6,
    rewardGold: 10,
    scale: 1.2,
    speed: 64,
    texture: "rpg-monster-skeletonArcher",
  },
  slime: {
    aggroRange: 210,
    contactDamage: 3,
    experience: 10,
    hp: 2,
    rewardGold: 2,
    scale: 1.16,
    speed: 56,
    texture: "rpg-monster-slime",
  },
  snowBoss: {
    aggroRange: 560,
    boss: true,
    contactDamage: 20,
    experience: 140,
    hp: 68,
    rewardGold: 180,
    scale: 2.55,
    speed: 72,
    texture: "rpg-monster-snowBoss",
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
  zombie: {
    aggroRange: 260,
    contactDamage: 7,
    experience: 23,
    hp: 6,
    rewardGold: 7,
    scale: 1.16,
    speed: 48,
    texture: "rpg-monster-zombie",
  },
};

export class CellWorldRpgScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private activeInteraction?: WorldInteraction;
  private player?: Phaser.Physics.Arcade.Sprite;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private elder?: Phaser.Physics.Arcade.Sprite;
  private relic?: Phaser.Physics.Arcade.Sprite;
  private monsters?: Phaser.Physics.Arcade.Group;
  private drops?: Phaser.GameObjects.Group;
  private dialogue?: Phaser.GameObjects.Container;
  private interactionPrompt?: Phaser.GameObjects.Text;
  private regionLabel?: Phaser.GameObjects.Text;
  private monsterSpawnTimer?: Phaser.Time.TimerEvent;
  private interactions: WorldInteraction[] = [];
  private npcSprites: Phaser.GameObjects.Sprite[] = [];
  private currentMap: RpgMapId = "town";
  private defeatedBossMaps = new Set<RpgMapId>();
  private playerFacing: Facing = "front";
  private lastReportedCell = "";
  private lastContactDamageAt = 0;
  private lastFootstepEffectAt = 0;
  private lastDashAfterimageAt = 0;
  private dashUntil = 0;
  private dashCooldownUntil = 0;
  private dashDirection = new Phaser.Math.Vector2(0, 1);
  private nextAttackAt = 0;
  private attackAnimationUntil = 0;
  private spinUntil = 0;
  private spinCooldownUntil = 0;
  private nextSpinDamageAt = 0;
  private spinSword?: Phaser.GameObjects.Image;
  private pickupHint?: Phaser.GameObjects.Text;

  constructor() {
    super("cell-world-rpg");
  }

  preload() {
    for (const [key, file] of Object.entries(RPG_ASSETS)) {
      this.load.image(`rpg-${key}`, `${ASSET_BASE}/${file}`);
    }
    for (const [key, file] of Object.entries(CHARACTER_SHEETS)) {
      this.load.spritesheet(
        `rpg-character-${key}`,
        `${ADVENTURE_BASE}/${file}`,
        {
          frameHeight: 64,
          frameWidth: 64,
        },
      );
    }
    for (const [kind, sheet] of Object.entries(MONSTER_SHEETS)) {
      this.load.spritesheet(
        `rpg-monster-${kind}`,
        `${ADVENTURE_BASE}/${sheet.file}`,
        {
          frameHeight: 48,
          frameWidth: 48,
        },
      );
    }
    for (const [key, file] of Object.entries(ADVENTURE_IMAGES)) {
      this.load.image(`rpg-adventure-${key}`, `${ADVENTURE_BASE}/${file}`);
    }
    for (const relic of RPG_RELICS) {
      this.load.image(`rpg-relic-${relic.id}`, relic.icon);
    }
  }

  create() {
    this.interactions = [];
    this.npcSprites = [];
    this.currentMap = "town";
    this.defeatedBossMaps.clear();
    this.lastReportedCell = "";
    this.dashUntil = 0;
    this.spinUntil = 0;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.createCharacterAnimations();
    this.createMonsterAnimations();
    this.drawWorld();

    const obstacles = this.physics.add.staticGroup();
    this.addVillage(obstacles);
    this.addEasternRuins(obstacles);
    this.addForest(obstacles);
    this.addExpandedRegions(obstacles);
    this.addDecorations(obstacles);
    this.addHuntingMaps(obstacles);

    this.addShadow(960, 586, 48, 17, 556);
    this.elder = this.physics.add
      .staticSprite(960, 560, "rpg-character-mage")
      .setScale(1.18)
      .setDepth(580);
    this.elder.play("rpg-character-mage-idle");
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
    this.drops = this.add.group();
    this.createDrop("potion", 820, 1270, 30);

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
      .sprite(720, 585, "rpg-character-warrior", 0)
      .setScale(1.22)
      .setCollideWorldBounds(true);
    this.player.body?.setSize(26, 24).setOffset(19, 35);
    this.player.play("rpg-character-warrior-idle");
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
    this.input.keyboard?.on("keydown-E", this.handleInteractCommand, this);
    this.input.keyboard?.on("keydown-A", this.handleAttackCommand, this);
    this.input.keyboard?.on("keydown-Z", this.handlePickupCommand, this);
    this.input.keyboard?.on("keydown-D", this.handleSpinCommand, this);
    this.input.keyboard?.on("keydown-SHIFT", this.handleDashCommand, this);
    this.input.keyboard?.on("keydown-ESC", this.handleEscapeCommand, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-E", this.handleInteractCommand, this);
      this.input.keyboard?.off("keydown-A", this.handleAttackCommand, this);
      this.input.keyboard?.off("keydown-Z", this.handlePickupCommand, this);
      this.input.keyboard?.off("keydown-D", this.handleSpinCommand, this);
      this.input.keyboard?.off("keydown-SHIFT", this.handleDashCommand, this);
      this.input.keyboard?.off("keydown-ESC", this.handleEscapeCommand, this);
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.createDialogue();
    this.createInteractionPrompt();
    this.pickupHint = this.add
      .text(0, 0, "[Z] 줍기", {
        backgroundColor: "#10251fe8",
        color: "#fff2a1",
        fontFamily: '"Courier New", monospace',
        fontSize: "12px",
        fontStyle: "bold",
        padding: { x: 9, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(2200)
      .setVisible(false);
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
    if (!this.player || !this.cursors) {
      return;
    }

    const state = useGameStore.getState();
    const accessory = getRpgEquipment(state.rpgEquippedItems.accessory);
    const speed = 190 + (accessory?.stats.moveSpeed ?? 0);
    const isOverlayOpen = Boolean(
      state.npcDialogueOpen || state.rpgDialogue || state.rpgShopOpen,
    );
    const controlsPaused = isOverlayOpen || state.rpgStatus === "lost";
    const velocity = new Phaser.Math.Vector2(0, 0);

    if (!controlsPaused && time < this.dashUntil) {
      velocity.copy(this.dashDirection).scale(560);
      this.createDashAfterimage(time);
    } else if (!controlsPaused && time >= this.spinUntil) {
      velocity.set(
        Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown),
        Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown),
      );
    }

    if (velocity.lengthSq() > 0) {
      if (time >= this.dashUntil) {
        velocity.normalize().scale(speed);
      }
      this.updatePlayerFacing(velocity);
    }

    if (controlsPaused) {
      this.finishSpinAttack();
    }
    this.player.setVelocity(velocity.x, velocity.y);
    this.enforceCurrentMapBounds();
    this.player.setDepth(this.player.y + 32);
    this.updatePlayerAnimation(time, velocity.lengthSq() > 0, controlsPaused);
    this.updateSpinAttack(time, controlsPaused);
    this.updateDropPresentation(time);
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

  private enforceCurrentMapBounds() {
    if (!this.player) {
      return;
    }
    const map = this.getCurrentMapDefinition();
    if (!map) {
      this.player.setPosition(
        Phaser.Math.Clamp(this.player.x, 34, 3_166),
        Phaser.Math.Clamp(this.player.y, 34, 2_014),
      );
      return;
    }
    this.player.setPosition(
      Phaser.Math.Clamp(
        this.player.x,
        map.centerX - ARENA_WIDTH / 2 + 48,
        map.centerX + ARENA_WIDTH / 2 - 48,
      ),
      Phaser.Math.Clamp(
        this.player.y,
        map.centerY - ARENA_HEIGHT / 2 + 48,
        map.centerY + ARENA_HEIGHT / 2 - 48,
      ),
    );
  }

  private createCharacterAnimations() {
    for (const key of Object.keys(CHARACTER_SHEETS)) {
      for (const [action, start, frameRate] of [
        ["idle", 0, 7],
        ["walk", 8, 11],
        ["run", 16, 14],
        ["attack", 24, 16],
        ["skill", 40, 18],
      ] as const) {
        const animationKey = `rpg-character-${key}-${action}`;
        if (this.anims.exists(animationKey)) {
          continue;
        }
        this.anims.create({
          key: animationKey,
          frames: this.anims.generateFrameNumbers(`rpg-character-${key}`, {
            start,
            end: start + 7,
          }),
          frameRate,
          repeat: action === "attack" ? 0 : -1,
        });
      }
    }
  }

  private createMonsterAnimations() {
    for (const kind of Object.keys(MONSTER_SHEETS)) {
      const animationKey = `rpg-${kind}-walk`;
      if (this.anims.exists(animationKey)) {
        continue;
      }
      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(`rpg-monster-${kind}`, {
          start: 8,
          end: 15,
        }),
        frameRate: kind.toLowerCase().includes("bat") ? 12 : 9,
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
      kind: "portal",
      label: "동굴 워크시트로 이동",
      name: "BROKEN CELL PORTAL",
      portrait: "rpg-questRelic",
      radius: 96,
      targetMap: "cave-1",
      text: "삭제된 동굴 워크시트의 첫 번째 구역으로 이동합니다.",
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

  private addHuntingMaps(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    const snowPortal = this.add
      .image(2860, 1040, "rpg-adventure-cyanPortal")
      .setScale(2.7)
      .setDepth(1050);
    this.tweens.add({
      targets: snowPortal,
      alpha: { from: 0.68, to: 1 },
      scale: { from: 2.5, to: 2.82 },
      duration: 880,
      yoyo: true,
      repeat: -1,
    });
    this.registerInteraction({
      id: "town_snow_portal",
      kind: "portal",
      label: "설원 워크시트로 이동",
      name: "SNOW ARCHIVE PORTAL",
      portrait: "rpg-questRelic",
      radius: 100,
      targetMap: "snow-1",
      text: "얼어붙은 워크시트의 첫 번째 구역으로 이동합니다.",
      x: 2860,
      y: 1040,
    });

    for (const map of HUNTING_MAPS) {
      const isSnow = map.theme === "snow";
      const floorKey = isSnow
        ? "rpg-adventure-iceFloor"
        : "rpg-adventure-caveFloor";
      const borderColor = isSnow ? 0x9ed7e7 : 0x342d45;
      const tint = isSnow ? 0xc9efff : 0x9a91a8;
      const left = map.centerX - ARENA_WIDTH / 2;
      const right = map.centerX + ARENA_WIDTH / 2;
      const top = map.centerY - ARENA_HEIGHT / 2;
      const bottom = map.centerY + ARENA_HEIGHT / 2;

      this.add
        .tileSprite(
          map.centerX,
          map.centerY,
          ARENA_WIDTH,
          ARENA_HEIGHT,
          floorKey,
        )
        .setTileScale(isSnow ? 1.4 : 1.65)
        .setTint(tint)
        .setDepth(-65);
      this.add
        .rectangle(
          map.centerX,
          map.centerY,
          ARENA_WIDTH,
          ARENA_HEIGHT,
          isSnow ? 0xbde9f5 : 0x332a43,
          isSnow ? 0.08 : 0.18,
        )
        .setDepth(-64)
        .setStrokeStyle(8, borderColor, 0.94);

      const wallThickness = 32;
      this.addObstacle(
        obstacles,
        map.centerX,
        top + wallThickness / 2,
        ARENA_WIDTH,
        wallThickness,
      );
      this.addObstacle(
        obstacles,
        map.centerX,
        bottom - wallThickness / 2,
        ARENA_WIDTH,
        wallThickness,
      );
      this.addObstacle(
        obstacles,
        left + wallThickness / 2,
        map.centerY,
        wallThickness,
        ARENA_HEIGHT,
      );
      this.addObstacle(
        obstacles,
        right - wallThickness / 2,
        map.centerY,
        wallThickness,
        ARENA_HEIGHT,
      );

      this.add
        .text(map.centerX, top + 42, map.label, {
          color: isSnow ? "#e6fbff" : "#efe7ff",
          fontFamily: '"Courier New", monospace',
          fontSize: "18px",
          fontStyle: "bold",
          stroke: isSnow ? "#265668" : "#231c34",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(top + 80);

      for (const xOffset of [-410, -210, 210, 410]) {
        const yOffset =
          ((map.stage + Math.abs(xOffset)) % 3 - 1) * 84;
        const prop = this.add
          .image(
            map.centerX + xOffset,
            map.centerY + yOffset,
            isSnow ? "rpg-tree" : "rpg-adventure-cavePillar",
          )
          .setOrigin(0.5, 1)
          .setScale(isSnow ? 3.8 : 1.7)
          .setTint(isSnow ? 0xbfeaff : 0xb7abc7)
          .setDepth(map.centerY + yOffset);
        this.addObstacle(
          obstacles,
          prop.x,
          prop.y - (isSnow ? 15 : 30),
          isSnow ? 34 : 26,
          isSnow ? 26 : 54,
        );
      }

      const previousTarget: RpgMapId =
        map.stage === 1
          ? "town"
          : (`${map.theme}-${map.stage - 1}` as RpgMapId);
      const nextTarget: RpgMapId =
        map.stage === 10
          ? "town"
          : (`${map.theme}-${map.stage + 1}` as RpgMapId);
      this.addStagePortal(
        left + 95,
        map.centerY,
        previousTarget,
        `${map.id}-previous`,
        isSnow,
        "이전 구역",
      );
      this.addStagePortal(
        right - 95,
        map.centerY,
        nextTarget,
        `${map.id}-next`,
        isSnow,
        map.stage === 10 ? "마을 귀환" : "다음 구역",
      );

      if (map.stage === 10) {
        this.add
          .image(map.centerX, map.centerY - 180, "rpg-dungeonStatue")
          .setOrigin(0.5, 1)
          .setScale(3.2)
          .setTint(isSnow ? 0xc9f4ff : 0xbca8d9)
          .setDepth(map.centerY - 150);
      }
    }
  }

  private addStagePortal(
    x: number,
    y: number,
    targetMap: RpgMapId,
    id: string,
    cyan: boolean,
    label: string,
  ) {
    const portal = this.add
      .image(
        x,
        y,
        cyan ? "rpg-adventure-cyanPortal" : "rpg-adventure-cavePortal",
      )
      .setScale(2.25)
      .setDepth(y + 5);
    this.tweens.add({
      targets: portal,
      alpha: { from: 0.64, to: 1 },
      scale: { from: 2.08, to: 2.38 },
      duration: 820 + Phaser.Math.Between(0, 240),
      yoyo: true,
      repeat: -1,
    });
    this.registerInteraction({
      id: `portal-${id}`,
      kind: "portal",
      label: `${label}으로 포탈 이동`,
      name: "WORKSHEET PORTAL",
      portrait: "rpg-questRelic",
      radius: 92,
      targetMap,
      text: `${targetMap.toUpperCase()} 좌표로 이동합니다.`,
      x,
      y,
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
    const animatedTexture =
      texture === "rpg-merchant"
        ? "rpg-character-pirate"
        : texture === "rpg-knight"
          ? "rpg-character-swordmaster"
          : id.includes("scholar") || id.includes("herbalist")
            ? "rpg-character-frostMage"
            : id.includes("ranger") || id.includes("scout")
              ? "rpg-character-archer"
              : "rpg-character-warrior";
    this.addShadow(x, y + 23, 38, 11, y - 2);
    const npc = this.add
      .sprite(x, y, animatedTexture, 0)
      .setScale(1.08)
      .setDepth(y + 24)
      .setData("baseY", y)
      .setData("idleOffset", Phaser.Math.FloatBetween(0, Math.PI * 2));
    npc.play(`${animatedTexture}-idle`);
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

    const zones = this.getCurrentMonsterZones();
    if (zones.length === 0) {
      return;
    }
    const selectedZone = zone ?? Phaser.Utils.Array.GetRandom(zones);
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
    const isFlying = kind === "bat" || kind === "frostBat";
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
      .setData("mapId", zone.mapId)
      .setData("textureKey", definition.texture)
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
    monster.body?.setCircle(definition.boss ? 20 : 14, 10, 15);
    this.monsters.add(monster);
    monster.play(`rpg-${kind}-walk`);

    const spawnEffect = this.add
      .circle(
        x,
        y + 10,
        28,
        kind.toLowerCase().includes("frost") || kind === "snowBoss"
          ? 0x8ee9ff
          : kind === "slime"
            ? 0x69d7ff
            : 0x9ed36a,
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
    if (this.currentMap === "town" || !this.monsters) {
      return;
    }
    const map = this.getCurrentMapDefinition();
    if (!map || (map.stage === 10 && this.defeatedBossMaps.has(map.id))) {
      return;
    }
    const desiredPopulation = map.stage === 10 ? 1 : Math.min(10, 5 + map.stage);
    if (this.monsters.countActive(true) < desiredPopulation) {
      this.spawnMonsterFromZone();
    }
  }

  private getCurrentMapDefinition() {
    return HUNTING_MAPS.find((map) => map.id === this.currentMap);
  }

  private getCurrentMonsterZones(): MonsterZone[] {
    const map = this.getCurrentMapDefinition();
    if (!map) {
      return [];
    }
    if (map.stage === 10) {
      return [
        {
          centerX: map.centerX,
          centerY: map.centerY,
          kind: map.monsters[0],
          mapId: map.id,
          radiusX: 90,
          radiusY: 70,
        },
      ];
    }
    return map.monsters.map((kind, index) => ({
      centerX:
        map.centerX +
        ((index % 3) - 1) * 250 +
        Phaser.Math.Between(-35, 35),
      centerY:
        map.centerY +
        (Math.floor(index / 3) - 0.5) * 220 +
        Phaser.Math.Between(-28, 28),
      kind,
      mapId: map.id,
      radiusX: 180,
      radiusY: 120,
    }));
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
      const isFlying = kind === "bat" || kind === "frostBat";
      const motionOffset = Number(monster.getData("motionOffset") ?? 0);
      const baseScale = Number(monster.getData("baseScale") ?? 1);
      const flyingBob =
        isFlying ? Math.sin(time / 125 + motionOffset) * 6 : 0;
      shadow
        ?.setPosition(monster.x, monster.y + (isFlying ? 32 : 20))
        .setScale(isFlying ? 0.86 + Math.abs(flyingBob) * 0.008 : 1)
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
      if (kind === "slime" || kind === "frostSlime") {
        const bounce = Math.sin(time / 115 + motionOffset);
        monster.setScale(
          baseScale + Math.abs(bounce) * 0.08,
          baseScale - Math.abs(bounce) * 0.06,
        );
      } else {
        monster
          .setAngle(Math.sin(time / 220 + motionOffset) * (isFlying ? 3 : 1))
          .setScale(baseScale, baseScale + flyingBob * 0.0025);
      }
    }
  }

  private updateMonsterTexture(monster: Phaser.Physics.Arcade.Sprite) {
    if (!monster.body) {
      return;
    }
    const kind = monster.getData("kind") as MonsterKind;
    const expectedTexture = String(
      monster.getData("textureKey") ?? MONSTER_DEFINITIONS[kind].texture,
    );
    if (monster.texture.key !== expectedTexture) {
      monster.setTexture(expectedTexture);
      monster.play(`rpg-${kind}-walk`, true);
    }
    const velocity = monster.body.velocity;
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      monster.setFlipX(velocity.x < 0);
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

    this.playerFacing = facing;
    if (Math.abs(velocity.x) > 2) {
      this.player?.setFlipX(velocity.x < 0);
    }
  }

  private updatePlayerAnimation(
    time: number,
    isMoving: boolean,
    paused: boolean,
  ) {
    if (!this.player) {
      return;
    }

    this.playerShadow
      ?.setPosition(this.player.x, this.player.y + 27)
      .setDepth(this.player.y - 2);

    if (time < this.spinUntil && !paused) {
      this.player.play("rpg-character-warrior-skill", true);
      this.playerShadow?.setScale(1.2, 0.82).setAlpha(0.34);
      return;
    }

    this.player.setAngle(0).setScale(1.22);
    if (time < this.attackAnimationUntil && !paused) {
      this.player.play("rpg-character-warrior-attack", true);
      this.playerShadow?.setScale(1.06, 0.92).setAlpha(0.3);
      return;
    }
    if (paused || !isMoving) {
      this.player.play("rpg-character-warrior-idle", true);
      this.playerShadow?.setScale(1, 1).setAlpha(0.28);
      return;
    }

    const dashing = time < this.dashUntil;
    const stride = Math.cos(time / (dashing ? 42 : 72));
    this.player.play(
      dashing ? "rpg-character-warrior-run" : "rpg-character-warrior-walk",
      true,
    );
    this.playerShadow
      ?.setScale(
        1 - Math.abs(stride) * (dashing ? 0.16 : 0.08),
        1 + Math.abs(stride) * 0.04,
      )
      .setAlpha(0.24 + Math.abs(stride) * 0.06);

    if (time - this.lastFootstepEffectAt >= (dashing ? 100 : 210)) {
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

  private createDashAfterimage(time: number) {
    if (!this.player || time - this.lastDashAfterimageAt < 70) {
      return;
    }
    this.lastDashAfterimageAt = time;
    const afterimage = this.add
      .sprite(
        this.player.x,
        this.player.y,
        this.player.texture.key,
        this.player.frame.name,
      )
      .setScale(this.player.scaleX, this.player.scaleY)
      .setFlipX(this.player.flipX)
      .setTint(0x8eeeff)
      .setAlpha(0.42)
      .setDepth(this.player.depth - 1);
    this.tweens.add({
      targets: afterimage,
      alpha: 0,
      duration: 180,
      onComplete: () => afterimage.destroy(),
    });
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
      !state.rpgShopOpen &&
      this.time.now >= this.nextAttackAt &&
      this.time.now >= this.spinUntil &&
      this.time.now >= this.dashUntil
    ) {
      this.nextAttackAt = this.time.now + 330;
      this.attackAnimationUntil = this.time.now + 280;
      this.player?.play("rpg-character-warrior-attack", true);
      this.attackNearbyMonsters();
    }
  }

  private updateDropPresentation(time: number) {
    if (!this.player || !this.drops || !this.pickupHint) {
      return;
    }
    const state = useGameStore.getState();
    if (
      state.rpgStatus === "lost" ||
      state.npcDialogueOpen ||
      state.rpgDialogue ||
      state.rpgShopOpen
    ) {
      this.pickupHint.setVisible(false);
      return;
    }
    let nearest:
      | { distance: number; drop: Phaser.GameObjects.Sprite }
      | undefined;
    for (const child of this.drops.getChildren()) {
      const drop = child as Phaser.GameObjects.Sprite;
      if (!drop.active) {
        continue;
      }
      const baseY = Number(drop.getData("baseY") ?? drop.y);
      const offset = Number(drop.getData("motionOffset") ?? 0);
      drop
        .setY(baseY + Math.sin(time / 210 + offset) * 5)
        .setDepth(baseY + 20);
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        drop.x,
        drop.y,
      );
      if (distance <= 110 && (!nearest || distance < nearest.distance)) {
        nearest = { distance, drop };
      }
    }
    this.pickupHint
      .setPosition(
        nearest?.drop.x ?? this.player.x,
        (nearest?.drop.y ?? this.player.y) - 48,
      )
      .setVisible(Boolean(nearest));
  }

  private handlePickupCommand() {
    if (!this.player || !this.drops) {
      return;
    }
    const state = useGameStore.getState();
    if (
      state.rpgStatus !== "playing" ||
      state.npcDialogueOpen ||
      state.rpgDialogue ||
      state.rpgShopOpen
    ) {
      return;
    }
    const nearest = (this.drops.getChildren() as Phaser.GameObjects.Sprite[])
      .filter((drop) => drop.active)
      .map((drop) => ({
        distance: Phaser.Math.Distance.Between(
          this.player!.x,
          this.player!.y,
          drop.x,
          drop.y,
        ),
        drop,
      }))
      .filter(({ distance }) => distance <= 92)
      .sort((first, second) => first.distance - second.distance)[0]?.drop;
    if (!nearest) {
      this.showPickupToast("가까운 아이템이 없습니다.", 0xbdd7c5);
      return;
    }

    const kind = nearest.getData("kind") as DropKind;
    if (kind === "gold") {
      const amount = Number(nearest.getData("value") ?? 1);
      state.earnRpgGold(amount);
      state.setSelectedCell("ITEM", `=PICKUP.GOLD(${amount})`);
      this.showPickupToast(`골드 +${amount}`, 0xffdf66);
    } else if (kind === "potion") {
      const amount = Number(nearest.getData("value") ?? 18);
      state.healRpgPlayer(amount);
      state.setSelectedCell("ITEM", `=PICKUP.POTION(${amount})`);
      this.showPickupToast(`HP +${amount}`, 0xff8f9b);
    } else {
      const relicId = nearest.getData("relicId") as RpgRelicId;
      const collected = state.collectRpgDroppedRelic(relicId);
      const relic = getRpgRelic(relicId);
      if (collected) {
        this.showPickupToast(
          `유물 발견 · ${relic?.name ?? relicId}`,
          0xe8c4ff,
        );
      } else {
        state.earnRpgGold(35);
        this.showPickupToast("중복 유물 변환 · 35G", 0xffdf66);
      }
    }
    nearest.destroy();
  }

  private handleDashCommand(event: KeyboardEvent) {
    if (
      event.location !== 1 ||
      !this.player ||
      this.time.now < this.dashCooldownUntil
    ) {
      return;
    }
    const state = useGameStore.getState();
    if (
      state.rpgStatus !== "playing" ||
      state.npcDialogueOpen ||
      state.rpgDialogue ||
      state.rpgShopOpen
    ) {
      return;
    }
    const direction = new Phaser.Math.Vector2(
      Number(this.cursors?.right.isDown) - Number(this.cursors?.left.isDown),
      Number(this.cursors?.down.isDown) - Number(this.cursors?.up.isDown),
    );
    if (direction.lengthSq() === 0) {
      direction.copy(this.getFacingVector());
    }
    this.dashDirection.copy(direction.normalize());
    this.dashUntil = this.time.now + 250;
    this.dashCooldownUntil = this.time.now + 720;
  }

  private handleSpinCommand() {
    const state = useGameStore.getState();
    if (
      !this.player ||
      state.rpgStatus !== "playing" ||
      state.npcDialogueOpen ||
      state.rpgDialogue ||
      state.rpgShopOpen ||
      this.time.now < this.spinCooldownUntil
    ) {
      return;
    }
    this.spinUntil = this.time.now + 2_000;
    this.spinCooldownUntil = this.time.now + 4_500;
    this.nextSpinDamageAt = this.time.now;
    this.spinSword?.destroy();
    this.spinSword = this.add
      .image(this.player.x + 52, this.player.y, "rpg-sword")
      .setScale(2.25)
      .setDepth(this.player.depth + 2);
  }

  private updateSpinAttack(time: number, paused: boolean) {
    if (!this.player || time >= this.spinUntil || paused) {
      this.finishSpinAttack();
      return;
    }
    const angle = ((this.spinUntil - time) / 2_000) * -1_440;
    const radians = Phaser.Math.DegToRad(angle);
    this.player.setAngle(angle % 360);
    this.spinSword
      ?.setPosition(
        this.player.x + Math.cos(radians) * 58,
        this.player.y + Math.sin(radians) * 44,
      )
      .setAngle(angle + 45)
      .setDepth(this.player.y + (Math.sin(radians) > 0 ? 80 : -3));

    if (time >= this.nextSpinDamageAt) {
      this.nextSpinDamageAt = time + 220;
      const state = useGameStore.getState();
      const weapon = getRpgEquipment(state.rpgEquippedItems.weapon);
      const damage = 1 + (weapon?.stats.attackDamage ?? 0);
      for (const monster of (this.monsters?.getChildren() ??
        []) as Phaser.Physics.Arcade.Sprite[]) {
        if (
          monster.active &&
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            monster.x,
            monster.y,
          ) <= 132
        ) {
          this.damageMonster(monster, damage);
        }
      }
    }
  }

  private finishSpinAttack() {
    if (this.time.now < this.spinUntil) {
      this.spinUntil = 0;
    }
    this.player?.setAngle(0);
    this.spinSword?.destroy();
    this.spinSword = undefined;
  }

  private getFacingVector() {
    return {
      back: new Phaser.Math.Vector2(0, -1),
      front: new Phaser.Math.Vector2(0, 1),
      left: new Phaser.Math.Vector2(-1, 0),
      right: new Phaser.Math.Vector2(1, 0),
    }[this.playerFacing];
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

    if (interaction.kind === "portal" && interaction.targetMap) {
      this.travelToMap(interaction.targetMap);
      return;
    }

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

  private travelToMap(targetMap: RpgMapId) {
    if (!this.player || targetMap === this.currentMap) {
      return;
    }
    const destination =
      targetMap === "town"
        ? { centerX: 2760, centerY: 700, label: "VILLAGE SQUARE" }
        : HUNTING_MAPS.find((map) => map.id === targetMap);
    if (!destination) {
      return;
    }

    this.clearActiveMonstersAndDrops();
    this.currentMap = targetMap;
    this.activeInteraction = undefined;
    this.player.setPosition(
      targetMap === "town" ? destination.centerX : destination.centerX - 350,
      destination.centerY + 120,
    );
    this.player.setVelocity(0, 0);
    this.playerShadow?.setPosition(this.player.x, this.player.y + 27);
    this.cameras.main.flash(
      360,
      targetMap.startsWith("snow") ? 180 : 92,
      targetMap.startsWith("snow") ? 235 : 72,
      targetMap.startsWith("snow") ? 255 : 130,
    );
    useGameStore
      .getState()
      .setSelectedCell("MAP", `=PORTAL.GOTO("${targetMap.toUpperCase()}")`);

    if (targetMap !== "town") {
      const map = this.getCurrentMapDefinition();
      const count =
        map?.stage === 10
          ? this.defeatedBossMaps.has(targetMap)
            ? 0
            : 1
          : Math.min(10, 5 + (map?.stage ?? 1));
      for (let index = 0; index < count; index += 1) {
        this.spawnMonsterFromZone();
      }
    }
    this.updateRegionLabel();
  }

  private clearActiveMonstersAndDrops() {
    for (const child of this.monsters?.getChildren() ?? []) {
      const monster = child as Phaser.Physics.Arcade.Sprite;
      const shadow = monster.getData("shadow") as
        | Phaser.GameObjects.Ellipse
        | undefined;
      shadow?.destroy();
    }
    this.monsters?.clear(true, true);
    this.drops?.clear(true, true);
    this.pickupHint?.setVisible(false);
  }

  private showWorldMessage(name: string, text: string, portrait?: string) {
    useGameStore.getState().openRpgDialogue({ name, portrait, text });
  }

  private attackNearbyMonsters() {
    if (!this.player || !this.monsters) {
      return;
    }

    const state = useGameStore.getState();
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

      this.damageMonster(monster, attackDamage);
    }
  }

  private damageMonster(
    monster: Phaser.Physics.Arcade.Sprite,
    damage: number,
  ) {
    if (!monster.active || monster.getData("defeated")) {
      return;
    }
    const hp = Number(monster.getData("hp") ?? 2) - damage;
    monster.setData("hp", hp);
    monster.setTint(0xffffff);
    this.time.delayedCall(90, () => {
      if (monster.active) {
        monster.clearTint();
      }
    });
    if (hp > 0) {
      return;
    }

    monster.setData("defeated", true);
    const kind = monster.getData("kind") as MonsterKind;
    const definition = MONSTER_DEFINITIONS[kind];
    const shadow = monster.getData("shadow") as
      | Phaser.GameObjects.Ellipse
      | undefined;
    const defeatEffect = this.add
      .circle(
        monster.x,
        monster.y,
        definition.boss ? 72 : 34,
        kind.toLowerCase().includes("frost") || kind === "snowBoss"
          ? 0x91edff
          : kind === "slime"
            ? 0x75dcff
            : 0xa7d36d,
        0.6,
      )
      .setDepth(monster.y + 1);
    this.tweens.add({
      targets: defeatEffect,
      scale: definition.boss ? 2.4 : 1.8,
      alpha: 0,
      duration: definition.boss ? 520 : 260,
      onComplete: () => defeatEffect.destroy(),
    });

    const dropX = monster.x;
    const dropY = monster.y;
    shadow?.destroy();
    monster.disableBody(true, true);
    const rewardState = useGameStore.getState();
    rewardState.gainRpgExperience(
      Number(monster.getData("experience") ?? 10),
    );
    this.createDrop(
      "gold",
      dropX - 18,
      dropY,
      Number(monster.getData("rewardGold") ?? 2),
    );
    if (Math.random() < (definition.boss ? 1 : 0.2)) {
      this.createDrop("potion", dropX + 18, dropY + 4, 20);
    }
    if (definition.boss || Math.random() < 0.09) {
      const relic =
        RPG_RELICS[Phaser.Math.Between(0, RPG_RELICS.length - 1)];
      this.createDrop("relic", dropX, dropY - 22, 1, relic.id);
    }
    if (
      kind === "slime" &&
      rewardState.rpgQuestStage === "defeat_slimes"
    ) {
      rewardState.defeatRpgSlime();
    }
    if (definition.boss) {
      this.defeatedBossMaps.add(this.currentMap);
      this.showPickupToast(
        this.currentMap.startsWith("snow")
          ? "설원 군주 격파! 유물이 떨어졌습니다."
          : "심연의 수호자 격파! 유물이 떨어졌습니다.",
        0xffd76b,
      );
    }
  }

  private createDrop(
    kind: DropKind,
    x: number,
    y: number,
    value: number,
    relicId?: RpgRelicId,
  ) {
    if (!this.drops) {
      return;
    }
    const texture =
      kind === "gold"
        ? "rpg-coin"
        : kind === "potion"
          ? "rpg-adventure-potionDrop"
          : `rpg-relic-${relicId}`;
    const drop = this.add
      .sprite(x, y, texture)
      .setScale(kind === "relic" ? 0.32 : kind === "gold" ? 1.8 : 0.58)
      .setDepth(y + 20)
      .setData("baseY", y)
      .setData("kind", kind)
      .setData("motionOffset", Phaser.Math.FloatBetween(0, Math.PI * 2))
      .setData("relicId", relicId)
      .setData("value", value);
    this.drops.add(drop);
    this.tweens.add({
      targets: drop,
      scaleX: drop.scaleX * 1.16,
      scaleY: drop.scaleY * 1.16,
      duration: 180,
      yoyo: true,
    });
  }

  private showPickupToast(text: string, color: number) {
    if (!this.player) {
      return;
    }
    const toast = this.add
      .text(this.player.x, this.player.y - 56, text, {
        color: `#${color.toString(16).padStart(6, "0")}`,
        fontFamily: '"Courier New", monospace',
        fontSize: "13px",
        fontStyle: "bold",
        stroke: "#10251f",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2400);
    this.tweens.add({
      targets: toast,
      y: toast.y - 34,
      alpha: 0,
      duration: 1_050,
      onComplete: () => toast.destroy(),
    });
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
      defeat_slimes: `OBJECTIVE  균열 슬라임 처치 ${state.rpgSlimesDefeated}/3 [A]`,
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

    const huntingMap = this.getCurrentMapDefinition();
    let region = huntingMap?.label ?? "VILLAGE SQUARE";
    if (this.currentMap !== "town") {
      region = huntingMap?.label ?? this.currentMap.toUpperCase();
    } else if (this.player.x > 2300 && this.player.y < 900) {
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
