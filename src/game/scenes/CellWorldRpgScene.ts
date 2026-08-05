import * as Phaser from "phaser";
import {
  getRpgBossDefeatKey,
  resetRpgBossEncounter,
} from "@/game/bossEncounter";
import {
  getBossPhase,
  getBossSkillCooldownMs,
  getBossSkillForCast,
  isPointInCone,
  isRpgBossKind,
  type RpgBossKind,
  type RpgBossSkillId,
} from "@/game/bossSkills";
import { getCoveringCameraZoom } from "@/game/camera";
import {
  getRpgRelic,
  getRpgRelicBonuses,
  RPG_RELICS,
  rollRpgRelicDrop,
  type RpgRelicId,
} from "@/lib/rpgRelics";
import {
  getRpgClass,
  getRpgJobChangeOptions,
  RPG_CLASS_DEFINITIONS,
  RPG_CLASS_IDS,
  type RpgClassDefinition,
  type RpgClassId,
} from "@/lib/rpgClasses";
import {
  BRAWLER_MAX_CHARGE_MS,
  getBrawlerChargeStats,
  getLongbowChargeStats,
  LONGBOW_MAX_CHARGE_MS,
} from "@/lib/rpgChargedSkills";
import {
  RPG_COMBAT_COOLDOWN_EVENT,
  type RpgCombatCooldownDetail,
} from "@/lib/rpgCombatHud";
import { normalizeRpgDirection } from "@/lib/rpgDirection";
import {
  getRpgWeaponEnhancedCooldownMs,
  getRpgWeaponEnhancementMultiplier,
} from "@/lib/rpgEnhancement";
import { getRpgEquipment } from "@/lib/rpgShop";
import {
  getRpgBasicAttackSfxPlayback,
  getRpgSfxAssetKey,
  getRpgSfxAssetPath,
  getRpgSkillActivationDurationMs,
  getRpgSkillSfxKey,
  isRpgSfxKey,
  isSnowRpgBoss,
  isSnowRpgMap,
  RPG_BASIC_ATTACK_ACTIVE_MS,
  RPG_SFX_FILES,
  RPG_SFX_REQUEST_EVENT,
  type RpgSfxKey,
  type RpgSfxRequestDetail,
} from "@/lib/rpgSfx";
import { useGameStore } from "@/stores/gameStore";

const WORLD_WIDTH = 14_200;
const WORLD_HEIGHT = 5_900;
const CELL_SIZE = 48;
const ASSET_BASE = "/assets/pixel-art/rpg";
const ADVENTURE_BASE = `${ASSET_BASE}/adventure`;
const AUDIO_BASE = "/assets/audio/rpg";
const ADVENTURER_DIRECTIONAL_SHEET =
  `${ADVENTURE_BASE}/characters/adventurer-directional.png`;
const MAX_MONSTERS = 12;
const ARENA_WIDTH = 1_180;
const ARENA_HEIGHT = 720;
const ARENA_STEP_X = 1_380;
const ARENA_START_X = 680;
const CAVE_CENTER_Y = 2_790;
const SNOW_CENTER_Y = 4_000;
const WOLF_DEN_CENTER_Y = 5_210;
const HUNTING_CAMERA_EDGE_INSET = 8;
const DASH_COOLDOWN_MS = 720;
const COMBAT_COOLDOWN_EVENT_THROTTLE_MS = 100;
const DIALOGUE_BOTTOM_OFFSET = 150;
const MAGE_BASIC_ATTACK_RANGE = 390;
const MAGE_CLASS_IDS: readonly RpgClassId[] = [
  "mage",
  "firemage",
  "frostmage",
  "stormmage",
  "toxicmage",
];
const ARCHER_CLASS_IDS: readonly RpgClassId[] = [
  "archer",
  "longbow",
  "crossbow",
];
const RPG_BACKGROUND_MUSIC = {
  cave: "ancient-dungeon.mp3",
  caveBoss: "abyssal-throne.mp3",
  snow: "frozen-hunt.mp3",
  snowBoss: "frozen-boss.mp3",
  town: "moonlit-well.mp3",
} as const;

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
  | "arcticWolf"
  | "bat"
  | "darkMage"
  | "dragonBoss"
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
  | "snowGiantBoss"
  | "snowWitchBoss"
  | "shadowWolf"
  | "tundraWerewolf"
  | "hellCerberus"
  | "wolf"
  | "zombie";
type InteractionKind = "elder" | "npc" | "object" | "portal" | "relic";
type HuntingTheme = "cave" | "snow" | "wolf";
type RpgMapId =
  | "town"
  | `cave-${number}`
  | `snow-${number}`
  | `wolf-${number}`;
type DropKind = "gold" | "potion" | "relic";
type RpgBackgroundMusicKey = keyof typeof RPG_BACKGROUND_MUSIC;
type RpgSfxChannel =
  | "blacksmith"
  | "bossSkill"
  | "playerAttack"
  | "playerSkill"
  | "snowAmbience";
type SkillProjectileKind =
  | "arrow"
  | "bullet"
  | "hook"
  | "orb"
  | "potion"
  | "shuriken"
  | "spear";
type ChargedSkillClassId = "brawler" | "longbow";

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
  displayName?: string;
  experience: number;
  hp: number;
  rewardGold: number;
  scale: number;
  speed: number;
  texture: string;
  boss?: boolean;
}

interface MonsterSheetDefinition {
  animationFrames?: number[];
  file: string;
  frameHeight?: number;
  frameWidth?: number;
  frameRate?: number;
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

interface ActiveRpgSfxChannel {
  cleanup: () => void;
  owner?: Phaser.Physics.Arcade.Sprite;
  sound?: Phaser.Sound.BaseSound;
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
          ? (["dragonBoss"] as MonsterKind[])
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
          ? (["snowGiantBoss", "snowWitchBoss"] as MonsterKind[])
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
  ...Array.from({ length: 10 }, (_, index) => {
    const stage = index + 1;
    return {
      centerX: ARENA_START_X + index * ARENA_STEP_X,
      centerY: WOLF_DEN_CENTER_Y,
      id: `wolf-${stage}` as RpgMapId,
      label:
        stage === 10
          ? "WOLF DEN 10 · HELL CERBERUS LAIR"
          : `WOLF DEN ${String(stage).padStart(2, "0")} · FROZEN TUNDRA`,
      monsters:
        stage === 10
          ? (["hellCerberus"] as MonsterKind[])
          : ([
              "arcticWolf",
              stage >= 2 ? "shadowWolf" : "arcticWolf",
              stage >= 4 ? "tundraWerewolf" : "arcticWolf",
              stage >= 6 ? "shadowWolf" : "arcticWolf",
              stage >= 8 ? "tundraWerewolf" : "shadowWolf",
            ] as MonsterKind[]),
      stage,
      theme: "wolf" as const,
    };
  }),
];

const MONSTER_SHEETS: Record<MonsterKind, MonsterSheetDefinition> = {
  arcticWolf: {
    animationFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    file: "wolf-den/arctic-wolf-8.png",
    frameHeight: 318,
    frameRate: 12,
    frameWidth: 271,
  },
  bat: { file: "monsters/bat-8.png" },
  darkMage: { file: "monsters/dark-mage-8.png" },
  dragonBoss: {
    animationFrames: [0, 1, 2, 3, 2, 1, 5, 6],
    file: "bosses/ancient-dragon.png",
    frameHeight: 192,
    frameRate: 7,
    frameWidth: 192,
  },
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
  snowGiantBoss: {
    animationFrames: [0, 1, 0, 1, 4, 1],
    file: "bosses/snow-giant-8.png",
    frameHeight: 192,
    frameRate: 5,
    frameWidth: 192,
  },
  snowWitchBoss: {
    animationFrames: [0, 1, 0, 2, 0, 3],
    file: "bosses/snow-witch-8.png",
    frameHeight: 192,
    frameRate: 6,
    frameWidth: 192,
  },
  shadowWolf: {
    animationFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    file: "wolf-den/shadow-wolf-8.png",
    frameHeight: 338,
    frameRate: 12,
    frameWidth: 221,
  },
  tundraWerewolf: {
    animationFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    file: "wolf-den/tundra-werewolf-8.png",
    frameHeight: 368,
    frameRate: 10,
    frameWidth: 221,
  },
  hellCerberus: {
    animationFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    file: "wolf-den/hell-cerberus-8.png",
    frameHeight: 472,
    frameRate: 8,
    frameWidth: 271,
  },
  wolf: { file: "monsters/wolf-8.png" },
  zombie: { file: "monsters/zombie-8.png" },
};

const BOSS_SKILL_POSES: Record<RpgBossSkillId, number> = {
  cerberusFrostBreath: 6,
  cerberusHellfire: 6,
  cerberusPounce: 4,
  dragonBreath: 8,
  dragonClaw: 13,
  dragonDarkOrb: 20,
  dragonTail: 15,
  giantAvalancheRoar: 5,
  giantBoulder: 4,
  giantCharge: 1,
  giantClubSweep: 2,
  giantSlam: 3,
  witchBlizzard: 3,
  witchFrostNova: 5,
  witchFrostVolley: 2,
  witchMirrorBurst: 4,
};

const ADVENTURE_IMAGES = {
  caveFloor: "maps/floor-tile-stone.png",
  cavePillar: "maps/dungeon-pillar.png",
  cavePortal: "maps/portal-purple.png",
  cyanPortal: "maps/portal-cyan.png",
  iceFloor: "maps/floor-ice.png",
  potionDrop: "items/health-potion.png",
  wolfDenBackground: "../wolf-den/concepts/wolf-den-map-background.png",
} as const;

const MONSTER_DEFINITIONS: Record<MonsterKind, MonsterDefinition> = {
  arcticWolf: {
    aggroRange: 430,
    contactDamage: 11,
    experience: 38,
    hp: 9,
    rewardGold: 13,
    scale: 0.34,
    speed: 118,
    texture: "rpg-monster-arcticWolf",
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
  dragonBoss: {
    aggroRange: 520,
    boss: true,
    contactDamage: 24,
    displayName: "고대 화염룡",
    experience: 240,
    hp: 130,
    rewardGold: 260,
    scale: 0.82,
    speed: 72,
    texture: "rpg-monster-dragonBoss",
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
  snowGiantBoss: {
    aggroRange: 560,
    boss: true,
    contactDamage: 28,
    displayName: "눈사태 거인 흐라움",
    experience: 280,
    hp: 170,
    rewardGold: 320,
    scale: 0.88,
    speed: 58,
    texture: "rpg-monster-snowGiantBoss",
  },
  snowWitchBoss: {
    aggroRange: 620,
    boss: true,
    contactDamage: 20,
    displayName: "백야의 마녀 세라피네",
    experience: 260,
    hp: 115,
    rewardGold: 300,
    scale: 0.8,
    speed: 90,
    texture: "rpg-monster-snowWitchBoss",
  },
  shadowWolf: {
    aggroRange: 470,
    contactDamage: 14,
    experience: 48,
    hp: 12,
    rewardGold: 17,
    scale: 0.36,
    speed: 126,
    texture: "rpg-monster-shadowWolf",
  },
  tundraWerewolf: {
    aggroRange: 500,
    contactDamage: 18,
    experience: 68,
    hp: 18,
    rewardGold: 25,
    scale: 0.34,
    speed: 92,
    texture: "rpg-monster-tundraWerewolf",
  },
  hellCerberus: {
    aggroRange: 660,
    boss: true,
    contactDamage: 30,
    displayName: "지옥의 케르베로스",
    experience: 420,
    hp: 190,
    rewardGold: 480,
    scale: 0.42,
    speed: 96,
    texture: "rpg-monster-hellCerberus",
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
  private defeatedBossKinds = new Set<string>();
  private playerFacing: Facing = "front";
  private aimDirection = new Phaser.Math.Vector2(0, 1);
  private lastReportedCell = "";
  private lastContactDamageAt = 0;
  private lastFootstepEffectAt = 0;
  private lastDashAfterimageAt = 0;
  private dashUntil = 0;
  private dashCooldownUntil = 0;
  private dashDirection = new Phaser.Math.Vector2(0, 1);
  private nextAttackAt = 0;
  private attackAnimationUntil = 0;
  private activePlayerClassId: RpgClassId = "adventurer";
  private classSkillCooldownUntil = 0;
  private classSkillUntil = 0;
  private chargedSkillClassId?: ChargedSkillClassId;
  private chargedSkillStartedAt = 0;
  private chargedSkillDirection = new Phaser.Math.Vector2(0, 1);
  private chargedSkillIndicator?: Phaser.GameObjects.Graphics;
  private chargedSkillLabel?: Phaser.GameObjects.Text;
  private brawlerPunchUntil = 0;
  private brawlerPunchImpactAt = 0;
  private brawlerPunchDamage = 1;
  private brawlerPunchRange = 100;
  private brawlerPunchStunMs = 0;
  private brawlerPunchDidHit = false;
  private skillDashUntil = 0;
  private nextSkillDashDamageAt = 0;
  private skillDashDamage = 1;
  private skillDashRange = 120;
  private skillDashColor = 0xffffff;
  private skillDashStunMs = 0;
  private spinUntil = 0;
  private nextSpinDamageAt = 0;
  private spinDuration = 2_000;
  private spinDamage = 1;
  private spinRange = 132;
  private spinColor = 0xffd36a;
  private spinSword?: Phaser.GameObjects.Image;
  private pickupHint?: Phaser.GameObjects.Text;
  private combatBlockers: Phaser.Geom.Rectangle[] = [];
  private bossSkillEffects = new Set<Phaser.GameObjects.GameObject>();
  private lastBossSkillDamageAt = 0;
  private playerSlowUntil = 0;
  private lastCombatCooldownDispatchAt = Number.NEGATIVE_INFINITY;
  private backgroundMusic?: Phaser.Sound.BaseSound;
  private backgroundMusicKey?: RpgBackgroundMusicKey;
  private musicUnlockHandler?: () => void;
  private activeRpgSfxChannels = new Map<
    RpgSfxChannel,
    ActiveRpgSfxChannel
  >();

  constructor() {
    super("cell-world-rpg");
  }

  preload() {
    for (const [key, file] of Object.entries(RPG_ASSETS)) {
      this.load.image(`rpg-${key}`, `${ASSET_BASE}/${file}`);
    }
    for (const definition of Object.values(RPG_CLASS_DEFINITIONS)) {
      this.load.spritesheet(
        `rpg-character-${definition.id}`,
        definition.spriteFile,
        {
          frameHeight: 64,
          frameWidth: 64,
        },
      );
    }
    this.load.spritesheet(
      "rpg-character-adventurer-directional",
      ADVENTURER_DIRECTIONAL_SHEET,
      {
        frameHeight: 64,
        frameWidth: 64,
      },
    );
    for (const [kind, sheet] of Object.entries(MONSTER_SHEETS)) {
      this.load.spritesheet(
        `rpg-monster-${kind}`,
        `${ADVENTURE_BASE}/${sheet.file}`,
        {
          frameHeight: sheet.frameHeight ?? 48,
          frameWidth: sheet.frameWidth ?? 48,
        },
      );
    }
    for (const [key, file] of Object.entries(ADVENTURE_IMAGES)) {
      this.load.image(`rpg-adventure-${key}`, `${ADVENTURE_BASE}/${file}`);
    }
    for (const relic of RPG_RELICS) {
      this.load.image(`rpg-relic-${relic.id}`, relic.icon);
    }
    for (const [key, file] of Object.entries(RPG_BACKGROUND_MUSIC)) {
      this.load.audio(`rpg-bgm-${key}`, `${AUDIO_BASE}/${file}`);
    }
    for (const key of Object.keys(RPG_SFX_FILES) as RpgSfxKey[]) {
      this.load.audio(getRpgSfxAssetKey(key), getRpgSfxAssetPath(key));
    }
  }

  create() {
    this.interactions = [];
    this.npcSprites = [];
    this.combatBlockers = [];
    this.currentMap = "town";
    this.defeatedBossMaps.clear();
    this.defeatedBossKinds.clear();
    this.aimDirection.set(0, 1);
    this.lastReportedCell = "";
    this.dashUntil = 0;
    this.dashCooldownUntil = 0;
    this.spinUntil = 0;
    this.classSkillCooldownUntil = 0;
    this.classSkillUntil = 0;
    this.cancelChargedSkill();
    this.brawlerPunchUntil = 0;
    this.skillDashUntil = 0;
    this.lastBossSkillDamageAt = 0;
    this.playerSlowUntil = 0;
    this.lastCombatCooldownDispatchAt = Number.NEGATIVE_INFINITY;
    this.bossSkillEffects.clear();
    this.stopAllRpgSfx();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, 3_200, 2_050);
    this.createCharacterAnimations();
    this.createMonsterAnimations();
    this.createBossSkillTextures();
    this.drawWorld();
    this.syncBackgroundMusic();

    const obstacles = this.physics.add.staticGroup();
    this.addVillage(obstacles);
    this.addEasternRuins(obstacles);
    this.addForest(obstacles);
    this.addExpandedRegions(obstacles);
    this.addDecorations(obstacles);
    this.addHuntingMaps(obstacles);

    this.addShadow(1210, 596, 48, 17, 566);
    this.elder = this.physics.add
      .staticSprite(1210, 570, "rpg-character-mage")
      .setScale(1.18)
      .setDepth(590);
    this.elder.play("rpg-character-mage-idle");
    this.add
      .text(1210, 522, "장로 노라", {
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
      label: "장로 노라에게 말 걸기",
      name: "장로 노라 / AI 안내자",
      portrait: "rpg-character-mage",
      radius: 116,
      text: "셀의 균열에 관해 물어보세요.",
      x: 1210,
      y: 570,
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

    this.activePlayerClassId = useGameStore.getState().rpgClassId;
    this.playerShadow = this.addShadow(720, 614, 44, 15, 585);
    this.player = this.physics.add
      .sprite(
        720,
        585,
        this.getPlayerTextureKey(this.activePlayerClassId),
        0,
      )
      .setScale(1.22)
      .setCollideWorldBounds(true);
    this.player.body?.setSize(26, 24).setOffset(19, 35);
    this.playPlayerAnimation("idle");
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
    this.input.keyboard?.on("keydown-D", this.handleClassSkillPressed, this);
    this.input.keyboard?.on("keyup-D", this.handleClassSkillReleased, this);
    this.input.keyboard?.on("keydown-SHIFT", this.handleDashCommand, this);
    this.input.keyboard?.on("keydown-ESC", this.handleEscapeCommand, this);
    this.input.on("pointerdown", this.handleAudioActivation, this);
    this.input.keyboard?.on("keydown", this.handleAudioActivation, this);
    window.addEventListener(
      RPG_SFX_REQUEST_EVENT,
      this.handleRpgSfxRequest,
    );
    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.handleViewportResize,
      this,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-E", this.handleInteractCommand, this);
      this.input.keyboard?.off("keydown-A", this.handleAttackCommand, this);
      this.input.keyboard?.off("keydown-Z", this.handlePickupCommand, this);
      this.input.keyboard?.off("keydown-D", this.handleClassSkillPressed, this);
      this.input.keyboard?.off("keyup-D", this.handleClassSkillReleased, this);
      this.input.keyboard?.off("keydown-SHIFT", this.handleDashCommand, this);
      this.input.keyboard?.off("keydown-ESC", this.handleEscapeCommand, this);
      this.input.off("pointerdown", this.handleAudioActivation, this);
      this.input.keyboard?.off("keydown", this.handleAudioActivation, this);
      window.removeEventListener(
        RPG_SFX_REQUEST_EVENT,
        this.handleRpgSfxRequest,
      );
      this.scale.off(
        Phaser.Scale.Events.RESIZE,
        this.handleViewportResize,
        this,
      );
      this.stopAllRpgSfx();
      this.stopBackgroundMusic();
      this.cancelChargedSkill();
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
    this.applyCameraBoundsForCurrentMap();

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
        fontSize: "13px",
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
    this.dispatchCombatCooldowns(this.time.now, true);
  }

  update(time: number) {
    if (!this.player || !this.cursors) {
      return;
    }

    const state = useGameStore.getState();
    const accessory = getRpgEquipment(state.rpgEquippedItems.accessory);
    const relicBonuses = getRpgRelicBonuses(state.rpgRelicLevels);
    const baseSpeed =
      (190 + (accessory?.stats.moveSpeed ?? 0)) *
      (1 + relicBonuses.moveSpeedPercent / 100);
    const speed = baseSpeed * (time < this.playerSlowUntil ? 0.58 : 1);
    const isOverlayOpen = this.isRpgModalOpen(state);
    const isJobChangeOpen =
      getRpgJobChangeOptions(state.level, state.rpgClassId).length > 0;
    const controlsPaused =
      isOverlayOpen || isJobChangeOpen || state.rpgStatus === "lost";
    const velocity = new Phaser.Math.Vector2(0, 0);
    this.syncPlayerClass(state.rpgClassId);
    this.updateChargedSkill(time, controlsPaused);
    this.dispatchCombatCooldowns(time);
    this.syncRpgSfxLifetimes(time, controlsPaused);

    if (!controlsPaused && time < this.dashUntil) {
      velocity.copy(this.dashDirection).scale(560);
      this.createDashAfterimage(time);
    } else if (
      !controlsPaused &&
      !this.chargedSkillClassId &&
      time >= this.spinUntil
    ) {
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
    this.updateClassSkillEffects(time, controlsPaused);
    this.updateBrawlerPunch(time, controlsPaused);
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

  private applyCameraBoundsForCurrentMap() {
    const camera = this.cameras.main;
    const map = this.getCurrentMapDefinition();
    if (!map) {
      camera.setZoom(1);
      camera.setBounds(0, 0, 3_200, 2_050, true);
      return;
    }

    camera.setZoom(
      getCoveringCameraZoom(
        camera.width,
        camera.height,
        ARENA_WIDTH - HUNTING_CAMERA_EDGE_INSET * 2,
        ARENA_HEIGHT - HUNTING_CAMERA_EDGE_INSET * 2,
      ),
    );
    camera.setBounds(
      map.centerX - ARENA_WIDTH / 2,
      map.centerY - ARENA_HEIGHT / 2,
      ARENA_WIDTH,
      ARENA_HEIGHT,
      true,
    );
  }

  private handleViewportResize() {
    this.applyCameraBoundsForCurrentMap();
  }

  private createCharacterAnimations() {
    for (const key of RPG_CLASS_IDS) {
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

    for (const [facing, start] of [
      ["front", 0],
      ["back", 8],
      // The authored right-facing row is substantially smaller than the
      // other directions. Mirror the full-size left row for a consistent
      // silhouette and walk cycle in both horizontal directions.
      ["right", 24],
      ["left", 24],
    ] as const) {
      for (const [action, frameRate] of [
        ["walk", 11],
        ["run", 15],
      ] as const) {
        const animationKey =
          `rpg-character-adventurer-directional-${facing}-${action}`;
        if (!this.anims.exists(animationKey)) {
          this.anims.create({
            key: animationKey,
            frames: this.anims.generateFrameNumbers(
              "rpg-character-adventurer-directional",
              { start, end: start + 7 },
            ),
            frameRate,
            repeat: -1,
          });
        }
      }
      const idleKey =
        `rpg-character-adventurer-directional-${facing}-idle`;
      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          key: idleKey,
          frames: [{ key: "rpg-character-adventurer-directional", frame: start }],
          frameRate: 1,
          repeat: -1,
        });
      }
    }
  }

  private createMonsterAnimations() {
    for (const kind of Object.keys(MONSTER_SHEETS) as MonsterKind[]) {
      const animationKey = `rpg-${kind}-walk`;
      if (this.anims.exists(animationKey)) {
        continue;
      }
      const sheet = MONSTER_SHEETS[kind];
      this.anims.create({
        key: animationKey,
        frames: sheet.animationFrames
          ? sheet.animationFrames.map((frame) => ({
              frame,
              key: `rpg-monster-${kind}`,
            }))
          : this.anims.generateFrameNumbers(`rpg-monster-${kind}`, {
              start: 8,
              end: 15,
            }),
        frameRate:
          sheet.frameRate ?? (kind.toLowerCase().includes("bat") ? 12 : 9),
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
      250,
      565,
      "warrior",
      "주민 미나",
      "villager_mina",
      "요즘 남쪽 초원에서 슬라임이 길 가까이까지 올라와요. 검을 준비하세요.",
    );
    this.addNpc(
      obstacles,
      625,
      605,
      "swordmaster",
      "전직 관리자 아론",
      "captain_aron",
      "LV.30 이상이며 2차 전직을 마쳤다면 같은 직업군 안에서 다른 2차 직업으로 자유롭게 전환해 주지.",
    );
    this.addNpc(
      obstacles,
      800,
      605,
      "longbow",
      "용병 관리자 세라오스",
      "character_keeper",
      "등록된 용병을 불러오거나 새로운 용병을 등록해 드릴게요. 각자의 성장 기록은 따로 관리됩니다.",
    );
    this.addNpc(
      obstacles,
      1350,
      570,
      "frostmage",
      "학자 루미",
      "scholar_lumi",
      "수식 코어는 유적 중앙의 빛나는 셀에 반응해요. 오래된 표지판도 읽어 보세요.",
    );
    this.addNpc(
      obstacles,
      300,
      940,
      "pirate",
      "상인 피코",
      "merchant_pico",
      "모험 장비가 필요하면 언제든 말을 걸게. 골드만 충분하다면 바로 맞춰 주지.",
    );
    this.addNpc(
      obstacles,
      520,
      925,
      "greatsword",
      "대장장이 브람",
      "blacksmith_bram",
      "골드와 무기만 준비해 오게. 운이 따른다면 더 강한 무기로 벼려 주지.",
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
      "archer",
      "순찰자 로완",
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
      "frostmage",
      "약초사 토마",
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
      "mage",
      "기록관 이브",
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
      "archer",
      "정찰병 리아",
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
    const wolfDenPortal = this.add
      .image(1600, 1840, "rpg-adventure-cyanPortal")
      .setScale(2.9)
      .setTint(0x9fc9e8)
      .setDepth(1850);
    this.tweens.add({
      targets: wolfDenPortal,
      alpha: { from: 0.64, to: 1 },
      scale: { from: 2.65, to: 3.05 },
      duration: 960,
      yoyo: true,
      repeat: -1,
    });
    this.add
      .text(1600, 1746, "늑대소굴 입구", {
        color: "#e8f8ff",
        fontFamily: '"Courier New", monospace',
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#17283b",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1900);
    this.registerInteraction({
      id: "town_wolf_den_portal",
      kind: "portal",
      label: "늑대소굴로 이동",
      name: "늑대소굴 입구",
      portrait: "rpg-adventure-cyanPortal",
      radius: 110,
      targetMap: "wolf-1",
      text: "차가운 툰드라 너머에서 늑대 무리의 울음소리가 들려옵니다.",
      x: 1600,
      y: 1840,
    });

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
      const isWolfDen = map.theme === "wolf";
      const floorKey = isSnow
        ? "rpg-adventure-iceFloor"
        : "rpg-adventure-caveFloor";
      const borderColor = isWolfDen
        ? 0x6ba4bf
        : isSnow
          ? 0x9ed7e7
          : 0x342d45;
      const tint = isWolfDen ? 0xb8d8ea : isSnow ? 0xc9efff : 0x9a91a8;
      const left = map.centerX - ARENA_WIDTH / 2;
      const right = map.centerX + ARENA_WIDTH / 2;
      const top = map.centerY - ARENA_HEIGHT / 2;
      const bottom = map.centerY + ARENA_HEIGHT / 2;

      if (isWolfDen) {
        this.add
          .image(map.centerX, map.centerY, "rpg-adventure-wolfDenBackground")
          .setDisplaySize(ARENA_WIDTH - 12, ARENA_HEIGHT - 12)
          .setTint(map.stage === 10 ? 0x9aa8c8 : tint)
          .setDepth(-65);
      } else {
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
      }
      this.add
        .rectangle(
          map.centerX,
          map.centerY,
          ARENA_WIDTH,
          ARENA_HEIGHT,
          isWolfDen ? 0x193247 : isSnow ? 0xbde9f5 : 0x332a43,
          isWolfDen ? 0.08 : isSnow ? 0.08 : 0.18,
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
          color: isWolfDen ? "#fff1ca" : isSnow ? "#e6fbff" : "#efe7ff",
          fontFamily: '"Courier New", monospace',
          fontSize: "18px",
          fontStyle: "bold",
          stroke: isWolfDen ? "#1b2d42" : isSnow ? "#265668" : "#231c34",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(top + 80);

      this.addHuntingMapDecorations(map, obstacles);

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
        isSnow || isWolfDen,
        "이전 구역",
      );
      this.addStagePortal(
        right - 95,
        map.centerY,
        nextTarget,
        `${map.id}-next`,
        isSnow || isWolfDen,
        map.stage === 10 ? "마을 귀환" : "다음 구역",
      );

      if (map.stage === 10) {
        this.add
          .image(map.centerX, map.centerY - 180, "rpg-dungeonStatue")
          .setOrigin(0.5, 1)
          .setScale(3.2)
          .setTint(isWolfDen ? 0xff9a58 : isSnow ? 0xc9f4ff : 0xbca8d9)
          .setDepth(map.centerY - 150);
      }
    }
  }

  private addHuntingMapDecorations(
    map: HuntingMapDefinition,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
  ) {
    const isSnow = map.theme === "snow";
    const isWolfDen = map.theme === "wolf";
    const offsets = [
      { x: -420, y: -170 },
      { x: -390, y: 165 },
      { x: -205, y: map.stage % 2 === 0 ? -205 : 205 },
      { x: 205, y: map.stage % 2 === 0 ? 205 : -205 },
      { x: 390, y: -165 },
      { x: 420, y: 170 },
    ];

    for (const [index, offset] of offsets.entries()) {
      const texture = isWolfDen
        ? index % 3 === 0
          ? "rpg-tree"
          : index % 2 === 0
            ? "rpg-bush"
            : "rpg-rock"
        : isSnow
        ? index % 3 === 0
          ? "rpg-rock"
          : index % 2 === 0
            ? "rpg-bush"
            : "rpg-tree"
        : index % 3 === 0
          ? "rpg-dungeonStatue"
          : index % 2 === 0
            ? "rpg-rock"
            : "rpg-adventure-cavePillar";
      const scale = isWolfDen
        ? texture === "rpg-tree"
          ? 3.7
          : texture === "rpg-bush"
            ? 2.2
            : 2.5
        : isSnow
        ? texture === "rpg-tree"
          ? 3.5
          : texture === "rpg-bush"
            ? 2.1
            : 2.4
        : texture === "rpg-dungeonStatue"
          ? 2.35
          : texture === "rpg-adventure-cavePillar"
            ? 1.65
            : 2.15;
      const prop = this.add
        .image(map.centerX + offset.x, map.centerY + offset.y, texture)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setTint(isWolfDen ? 0xa8c9df : isSnow ? 0xc6efff : 0xb9acc8)
        .setDepth(map.centerY + offset.y);
      this.addObstacle(
        obstacles,
        prop.x,
        prop.y - (texture.includes("Pillar") || texture.includes("Statue") ? 34 : 18),
        texture === "rpg-tree" ? 38 : 32,
        texture.includes("Pillar") || texture.includes("Statue") ? 62 : 34,
      );
    }

    if (isWolfDen) {
      for (let index = 0; index < 7; index += 1) {
        const x = map.centerX - 210 + index * 70;
        const y = map.centerY + 205 - index * 18;
        const paw = this.add.graphics().setPosition(x, y).setDepth(y - 2);
        paw.fillStyle(0x172638, 0.52);
        paw.fillEllipse(0, 5, 12, 15);
        paw.fillCircle(-7, -3, 3.5);
        paw.fillCircle(0, -7, 3.5);
        paw.fillCircle(7, -3, 3.5);
        paw.setRotation(-0.35);
      }
      for (const xOffset of [-145, 145]) {
        this.add
          .image(map.centerX + xOffset, map.centerY - 235, "rpg-log")
          .setScale(2.25)
          .setTint(0xa4c3d2)
          .setDepth(map.centerY - 215);
      }
      return;
    }

    if (isSnow) {
      for (const xOffset of [-120, 120]) {
        this.add
          .image(
            map.centerX + xOffset,
            map.centerY - 245,
            map.stage % 2 === 0 ? "rpg-log" : "rpg-flowers",
          )
          .setScale(map.stage % 2 === 0 ? 2.4 : 1.8)
          .setTint(0xc9f4ff)
          .setDepth(map.centerY - 225);
      }
      return;
    }

    for (const xOffset of [-135, 135]) {
      this.add
        .image(
          map.centerX + xOffset,
          map.centerY - 238,
          "rpg-dungeonBrazier",
        )
        .setScale(1.9)
        .setDepth(map.centerY - 210);
      this.add
        .image(
          map.centerX + xOffset * 1.55,
          map.centerY + 230,
          "rpg-dungeonCrack",
        )
        .setScale(1.7)
        .setTint(0xa59bb8)
        .setDepth(map.centerY + 220);
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
    classId: RpgClassId,
    name: string,
    id: string,
    text: string,
  ) {
    const animatedTexture = `rpg-character-${classId}`;
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
        fontSize: "14px",
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
      label: `${name}에게 말 걸기`,
      name,
      portrait: animatedTexture,
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
    this.combatBlockers.push(
      new Phaser.Geom.Rectangle(
        x - width / 2,
        y - height / 2,
        width,
        height,
      ),
    );
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
    const currentMap = this.getCurrentMapDefinition();
    if (
      currentMap?.stage === 10 &&
      (this.defeatedBossKinds.has(
        getRpgBossDefeatKey(currentMap.id, selectedZone.kind),
      ) ||
        this.hasActiveMonsterKind(selectedZone.kind))
    ) {
      return;
    }
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
    const isWolfDenMonster = this.isWolfDenMonster(kind);
    const shadowOffsetY = definition.boss
      ? 62
      : isFlying
        ? 28
        : isWolfDenMonster
          ? kind === "tundraWerewolf"
            ? 38
            : 28
          : 20;
    const shadowWidth = definition.boss
      ? 126
      : isWolfDenMonster
        ? kind === "tundraWerewolf"
          ? 74
          : 68
        : 42 * definition.scale;
    const shadow = this.add
      .ellipse(
        x,
        y + shadowOffsetY,
        shadowWidth,
        definition.boss ? 24 : 12,
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
      .setData("maxHp", definition.hp)
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
      .setData("bossBusyUntil", 0)
      .setData("bossCastIndex", 0)
      .setData("bossMovementMode", "idle")
      .setData("bossPoseLocked", false)
      .setData("nextBossSkillAt", this.time.now + Phaser.Math.Between(1_400, 2_000))
      .setData("shadow", shadow);
    if (isWolfDenMonster) {
      const sheet = MONSTER_SHEETS[kind];
      const radius = definition.boss
        ? 88
        : kind === "tundraWerewolf"
          ? 52
          : 44;
      monster.body?.setCircle(
        radius,
        (sheet.frameWidth ?? 221) / 2 - radius,
        (sheet.frameHeight ?? 338) * 0.58 - radius,
      );
    } else {
      monster.body?.setCircle(
        definition.boss ? 46 : 14,
        definition.boss ? 50 : 10,
        definition.boss ? 82 : 15,
      );
    }
    this.monsters.add(monster);
    monster.play(`rpg-${kind}-walk`);
    this.createMonsterHealthBar(monster, definition);

    const spawnEffect = this.add
      .circle(
        x,
        y + 10,
        28,
        this.isSnowMonster(kind)
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

  private createMonsterHealthBar(
    monster: Phaser.Physics.Arcade.Sprite,
    definition: MonsterDefinition,
  ) {
    const width = definition.boss ? 150 : 48;
    const height = definition.boss ? 10 : 6;
    const background = this.add
      .rectangle(0, 0, width + 4, height + 4, 0x140f12, 0.94)
      .setStrokeStyle(definition.boss ? 2 : 1, 0xf3e6d2, 0.92);
    const fill = this.add
      .rectangle(-width / 2, 0, width, height, 0x5fd16f, 1)
      .setOrigin(0, 0.5);
    const children: Phaser.GameObjects.GameObject[] = [background, fill];

    if (definition.boss) {
      children.push(
        this.add
          .text(0, -18, definition.displayName ?? "BOSS", {
            color: "#fff1cf",
            fontFamily: '"Courier New", monospace',
            fontSize: "14px",
            fontStyle: "bold",
            stroke: "#32171d",
            strokeThickness: 4,
          })
          .setOrigin(0.5),
      );
    }

    const healthBar = this.add.container(monster.x, monster.y, children);
    healthBar.setDepth(monster.y + 100);
    monster
      .setData("healthBar", healthBar)
      .setData("healthBarFill", fill)
      .setData("healthBarWidth", width);
    monster.once("destroy", () => healthBar.destroy(true));
    this.updateMonsterHealthBar(monster);
  }

  private updateMonsterHealthBar(monster: Phaser.Physics.Arcade.Sprite) {
    const healthBar = monster.getData("healthBar") as
      | Phaser.GameObjects.Container
      | undefined;
    const fill = monster.getData("healthBarFill") as
      | Phaser.GameObjects.Rectangle
      | undefined;
    if (!healthBar || !fill || !monster.active) {
      return;
    }

    const kind = monster.getData("kind") as MonsterKind;
    const definition = MONSTER_DEFINITIONS[kind];
    const hp = Math.max(0, Number(monster.getData("hp") ?? 0));
    const maxHp = Math.max(1, Number(monster.getData("maxHp") ?? definition.hp));
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    const width = Number(monster.getData("healthBarWidth") ?? 48);
    const yOffset = monster.displayHeight * 0.52 + (definition.boss ? 24 : 10);

    healthBar
      .setPosition(monster.x, monster.y - yOffset)
      .setDepth(monster.y + 100)
      .setVisible(monster.visible);
    fill.setDisplaySize(width * ratio, fill.height);
    fill.setFillStyle(ratio > 0.5 ? 0x5fd16f : ratio > 0.25 ? 0xf0be4e : 0xe14d4d);
  }

  private destroyMonsterHealthBar(monster: Phaser.Physics.Arcade.Sprite) {
    const healthBar = monster.getData("healthBar") as
      | Phaser.GameObjects.Container
      | undefined;
    healthBar?.destroy(true);
    monster.setData("healthBar", undefined);
    monster.setData("healthBarFill", undefined);
  }

  private isSnowMonster(kind: MonsterKind) {
    const normalized = kind.toLowerCase();
    return (
      normalized.includes("frost") ||
      normalized.includes("snow") ||
      this.isWolfDenMonster(kind)
    );
  }

  private isWolfDenMonster(kind: MonsterKind) {
    return (
      kind === "arcticWolf" ||
      kind === "shadowWolf" ||
      kind === "tundraWerewolf" ||
      kind === "hellCerberus"
    );
  }

  private maintainMonsterPopulation() {
    if (this.currentMap === "town" || !this.monsters) {
      return;
    }
    const map = this.getCurrentMapDefinition();
    if (!map || (map.stage === 10 && this.defeatedBossMaps.has(map.id))) {
      return;
    }
    if (map.stage === 10) {
      for (const zone of this.getCurrentMonsterZones()) {
        this.spawnMonsterFromZone(zone);
      }
      return;
    }
    const desiredPopulation = Math.min(10, 5 + map.stage);
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
      return map.monsters.map((kind, index) => ({
        centerX:
          map.centerX + (map.monsters.length > 1 ? (index * 2 - 1) * 190 : 0),
        centerY: map.centerY,
        kind,
        mapId: map.id,
        radiusX: 90,
        radiusY: 70,
      }));
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

  private hasActiveMonsterKind(kind: MonsterKind) {
    return (this.monsters?.getChildren() ?? []).some((child) => {
      const monster = child as Phaser.Physics.Arcade.Sprite;
      return (
        monster.active &&
        monster.getData("mapId") === this.currentMap &&
        monster.getData("kind") === kind
      );
    });
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
      const definition = MONSTER_DEFINITIONS[kind];
      const isFlying = kind === "bat" || kind === "frostBat";
      const isWolfDenMonster = this.isWolfDenMonster(kind);
      const motionOffset = Number(monster.getData("motionOffset") ?? 0);
      const baseScale = Number(monster.getData("baseScale") ?? 1);
      const flyingBob =
        isFlying ? Math.sin(time / 125 + motionOffset) * 6 : 0;
      shadow
        ?.setPosition(
          monster.x,
          monster.y +
            (definition.boss
              ? 62
              : isFlying
                ? 32
                : isWolfDenMonster
                  ? kind === "tundraWerewolf"
                    ? 38
                    : 28
                  : 20),
        )
        .setScale(isFlying ? 0.86 + Math.abs(flyingBob) * 0.008 : 1)
        .setDepth(monster.y - 2);
      monster.setDepth(monster.y);
      this.updateMonsterHealthBar(monster);

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

      const bossControlsMovement =
        definition.boss &&
        isRpgBossKind(kind) &&
        this.updateBossBehavior(monster, kind, time, distanceToPlayer);

      if (!bossControlsMovement) {
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
      monster.setFlipX(
        kind === "dragonBoss" ? velocity.x > 0 : velocity.x < 0,
      );
    }
  }

  private createBossSkillTextures() {
    const createTexture = (
      key: string,
      width: number,
      height: number,
      draw: (graphics: Phaser.GameObjects.Graphics) => void,
    ) => {
      if (this.textures.exists(key)) {
        return;
      }
      const graphics = this.make.graphics({ x: 0, y: 0 });
      draw(graphics);
      graphics.generateTexture(key, width, height);
      graphics.destroy();
    };

    createTexture("rpg-boss-fireball", 24, 24, (graphics) => {
      graphics.fillStyle(0x74190e, 1).fillRect(3, 6, 18, 14);
      graphics.fillStyle(0xe54820, 1).fillRect(5, 3, 14, 17);
      graphics.fillStyle(0xff9b35, 1).fillRect(8, 2, 11, 14);
      graphics.fillStyle(0xffef78, 1).fillRect(11, 5, 6, 7);
    });
    createTexture("rpg-boss-dark-orb", 22, 22, (graphics) => {
      graphics.fillStyle(0x301052, 1).fillRect(3, 5, 16, 12);
      graphics.fillStyle(0x6f2eb5, 1).fillRect(5, 3, 12, 16);
      graphics.fillStyle(0xc26dff, 1).fillRect(7, 6, 9, 9);
      graphics.fillStyle(0xffffff, 1).fillRect(10, 8, 4, 4);
    });
    createTexture("rpg-boss-ice-shard", 26, 10, (graphics) => {
      graphics.fillStyle(0x3f82ad, 1).fillRect(1, 3, 17, 4);
      graphics.fillStyle(0x8de9ff, 1).fillRect(7, 2, 14, 6);
      graphics.fillStyle(0xe7fdff, 1).fillRect(18, 1, 8, 8);
      graphics.fillStyle(0xffffff, 1).fillRect(19, 3, 4, 3);
    });
    createTexture("rpg-boss-ice-boulder", 30, 30, (graphics) => {
      graphics.fillStyle(0x30465a, 1).fillRect(3, 7, 24, 17);
      graphics.fillStyle(0x466f8b, 1).fillRect(7, 3, 17, 24);
      graphics.fillStyle(0x7ec5e8, 1).fillRect(7, 6, 15, 15);
      graphics.fillStyle(0xd5f6ff, 1).fillRect(10, 7, 7, 6);
      graphics.fillStyle(0x27445b, 1).fillRect(12, 21, 12, 5);
    });
  }

  private updateBossBehavior(
    monster: Phaser.Physics.Arcade.Sprite,
    kind: RpgBossKind,
    time: number,
    distanceToPlayer: number,
  ) {
    const busyUntil = Number(monster.getData("bossBusyUntil") ?? 0);
    if (time < busyUntil) {
      if (monster.getData("bossMovementMode") !== "charge") {
        monster.setVelocity(0, 0);
      }
      return true;
    }

    this.releaseBossSkillPose(monster, kind);
    monster.setData("bossMovementMode", "idle");
    const hp = Number(monster.getData("hp") ?? 1);
    const maxHp = Number(monster.getData("maxHp") ?? hp);
    const phase = getBossPhase(hp, maxHp);
    if (phase === 2 && !monster.getData("bossEnraged")) {
      monster.setData("bossEnraged", true);
      this.showBossCastLabel(monster, "PHASE 2 · ENRAGED", 0xffd45f);
      this.drawBossShockwave(
        monster.x,
        monster.y,
        kind === "dragonBoss" || kind === "hellCerberus"
          ? 0xff5b2d
          : 0xa8efff,
        210,
      );
      monster.setTint(
        kind === "dragonBoss" || kind === "hellCerberus"
          ? 0xff8266
          : 0xc6f5ff,
      );
      this.time.delayedCall(420, () => monster.active && monster.clearTint());
    }

    const aggroRange = Number(monster.getData("aggroRange") ?? 520);
    if (
      distanceToPlayer > aggroRange * 1.2 ||
      time < Number(monster.getData("nextBossSkillAt") ?? 0)
    ) {
      return false;
    }

    const castIndex = Number(monster.getData("bossCastIndex") ?? 0);
    const skill = getBossSkillForCast(kind, castIndex);
    monster
      .setData("bossCastIndex", castIndex + 1)
      .setData(
        "nextBossSkillAt",
        time + getBossSkillCooldownMs(kind, hp, maxHp),
      )
      .setData("bossBusyUntil", time + 600)
      .setVelocity(0, 0);
    this.castBossSkill(monster, kind, skill, phase);
    return true;
  }

  private castBossSkill(
    monster: Phaser.Physics.Arcade.Sprite,
    kind: RpgBossKind,
    skill: RpgBossSkillId,
    phase: number,
  ) {
    if (!this.player) {
      return;
    }
    const direction = new Phaser.Math.Vector2(
      this.player.x - monster.x,
      this.player.y - monster.y,
    ).normalize();
    this.setBossSkillPose(monster, skill);

    switch (skill) {
      case "dragonBreath":
        this.castDragonBreath(monster, direction, phase);
        break;
      case "dragonClaw":
        this.castDragonClaw(monster, direction, phase);
        break;
      case "dragonTail":
        this.castDragonTail(monster, phase);
        break;
      case "dragonDarkOrb":
        this.castDragonDarkOrb(monster, direction, phase);
        break;
      case "cerberusHellfire":
        this.castCerberusHellfire(monster, direction, phase);
        break;
      case "cerberusFrostBreath":
        this.castCerberusFrostBreath(monster, direction, phase);
        break;
      case "cerberusPounce":
        this.castCerberusPounce(monster, direction, phase);
        break;
      case "giantCharge":
        this.castGiantCharge(monster, direction, phase);
        break;
      case "giantClubSweep":
        this.castGiantClubSweep(monster, direction, phase);
        break;
      case "giantBoulder":
        this.castGiantBoulder(monster, phase);
        break;
      case "giantSlam":
        this.castGiantSlam(monster, phase);
        break;
      case "giantAvalancheRoar":
        this.castGiantAvalancheRoar(monster, phase);
        break;
      case "witchFrostVolley":
        this.castWitchFrostVolley(monster, direction, phase);
        break;
      case "witchBlizzard":
        this.castWitchBlizzard(monster, phase);
        break;
      case "witchFrostNova":
        this.castWitchFrostNova(monster, phase);
        break;
      case "witchMirrorBurst":
        this.castWitchMirrorBurst(monster, phase);
        break;
    }

    if (isSnowRpgBoss(kind)) {
      this.playRpgSfx("snowBossSkill", "bossSkill", {
        maxDurationMs: Math.max(
          0,
          Number(monster.getData("bossBusyUntil") ?? this.time.now) -
            this.time.now,
        ),
        owner: monster,
        volume: 0.42,
      });
    }

    if (kind === "dragonBoss") {
      monster.setFlipX(direction.x > 0);
    } else if (kind === "hellCerberus") {
      monster.setFlipX(direction.x < 0);
    }
  }

  private setBossSkillPose(
    monster: Phaser.Physics.Arcade.Sprite,
    skill: RpgBossSkillId,
  ) {
    monster.anims.pause();
    monster
      .setData("bossPoseLocked", true)
      .setFrame(BOSS_SKILL_POSES[skill]);
  }

  private releaseBossSkillPose(
    monster: Phaser.Physics.Arcade.Sprite,
    kind: RpgBossKind,
  ) {
    if (!monster.getData("bossPoseLocked")) {
      return;
    }
    monster.setData("bossPoseLocked", false);
    monster.play(`rpg-${kind}-walk`, true);
  }

  private castCerberusHellfire(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    const range = phase === 2 ? 470 : 400;
    const halfAngle = phase === 2 ? 0.72 : 0.58;
    monster.setData("bossBusyUntil", this.time.now + 1_180);
    this.showBossCastLabel(monster, "TRIPLE HELLFIRE", 0xff9b45);
    this.createBossConeWarning(
      monster,
      direction,
      range,
      halfAngle,
      0xff6a2f,
      680,
      () => {
        if (
          this.player &&
          isPointInCone(
            monster,
            this.player,
            direction,
            range,
            halfAngle,
          )
        ) {
          this.damagePlayerFromBoss(
            phase === 2 ? 31 : 24,
            monster.x,
            monster.y,
            86,
          );
        }
        for (const offset of [-0.24, 0, 0.24]) {
          this.launchBossProjectile({
            color: offset === 0 ? 0xff7a2f : 0x9feaff,
            damage: phase === 2 ? 16 : 12,
            direction: direction.clone().rotate(offset),
            monster,
            radius: 22,
            range: 560,
            scale: offset === 0 ? 1.55 : 1.2,
            slowMs: offset === 0 ? 0 : 850,
            speed: phase === 2 ? 490 : 420,
            texture:
              offset === 0 ? "rpg-boss-fireball" : "rpg-boss-ice-shard",
          });
        }
      },
    );
  }

  private castCerberusFrostBreath(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    monster.setData("bossBusyUntil", this.time.now + 980);
    this.showBossCastLabel(monster, "FROZEN HOWL", 0xbdefff);
    this.createBossLineWarning(
      monster,
      direction,
      phase === 2 ? 660 : 580,
      phase === 2 ? 72 : 56,
      0x91e9ff,
      560,
      () => {
        const offsets = phase === 2
          ? [-0.28, -0.14, 0, 0.14, 0.28]
          : [-0.16, 0, 0.16];
        for (const offset of offsets) {
          this.launchBossProjectile({
            color: 0xa9efff,
            damage: phase === 2 ? 15 : 11,
            direction: direction.clone().rotate(offset),
            monster,
            radius: 20,
            range: 650,
            scale: 1.3,
            slowMs: 1_250,
            speed: phase === 2 ? 520 : 450,
            texture: "rpg-boss-ice-shard",
          });
        }
      },
    );
  }

  private castCerberusPounce(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    const range = phase === 2 ? 560 : 470;
    monster.setData("bossBusyUntil", this.time.now + 1_260);
    this.showBossCastLabel(monster, "INFERNAL POUNCE", 0xffb05d);
    this.createBossLineWarning(
      monster,
      direction,
      range,
      48,
      0xff7c3b,
      580,
      (end) => {
        const startX = monster.x;
        const startY = monster.y;
        let hasHit = false;
        monster
          .setData("bossMovementMode", "charge")
          .setData("bossBusyUntil", this.time.now + 620);
        this.tweens.add({
          targets: monster,
          x: end.x,
          y: end.y,
          duration: phase === 2 ? 340 : 420,
          ease: "Cubic.easeIn",
          onUpdate: () => {
            if (!monster.active) {
              return;
            }
            this.drawBossDashTrail(monster.x, monster.y, 0xff7138);
            if (
              !hasHit &&
              this.player &&
              Phaser.Math.Distance.Between(
                monster.x,
                monster.y,
                this.player.x,
                this.player.y,
              ) < 96
            ) {
              hasHit = true;
              this.damagePlayerFromBoss(
                phase === 2 ? 36 : 28,
                startX,
                startY,
                124,
                650,
              );
            }
          },
          onComplete: () => {
            if (!monster.active) {
              return;
            }
            monster
              .setData("bossMovementMode", "idle")
              .setVelocity(0, 0);
            this.drawBossShockwave(monster.x, monster.y, 0xff8b49, 132);
          },
        });
      },
    );
  }

  private castDragonBreath(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    const range = phase === 2 ? 430 : 360;
    const halfAngle = phase === 2 ? 0.62 : 0.48;
    monster.setData("bossBusyUntil", this.time.now + 1_120);
    this.showBossCastLabel(monster, "INFERNO BREATH", 0xff9b47);
    this.createBossConeWarning(
      monster,
      direction,
      range,
      halfAngle,
      0xff5a24,
      720,
      () => {
        this.drawBossConeBurst(
          monster.x,
          monster.y,
          direction,
          range,
          halfAngle,
          0xff6a2d,
        );
        if (
          this.player &&
          isPointInCone(
            monster,
            this.player,
            direction,
            range,
            halfAngle,
          ) &&
          this.hasClearAttackPath(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          )
        ) {
          this.damagePlayerFromBoss(
            phase === 2 ? 28 : 22,
            monster.x,
            monster.y,
            48,
          );
        }
      },
    );
  }

  private castDragonClaw(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    const range = phase === 2 ? 170 : 145;
    monster.setData("bossBusyUntil", this.time.now + 760);
    this.showBossCastLabel(monster, "TWIN CLAW", 0xffd074);
    this.createBossConeWarning(
      monster,
      direction,
      range,
      1.02,
      0xffb14a,
      440,
      () => {
        this.drawBossSlash(monster.x, monster.y, direction.angle() - 0.18);
        this.time.delayedCall(90, () => {
          if (this.isBossCastValid(monster)) {
            this.drawBossSlash(
              monster.x,
              monster.y,
              direction.angle() + 0.24,
              0xffe3a0,
            );
          }
        });
        if (
          this.player &&
          isPointInCone(monster, this.player, direction, range, 1.02) &&
          this.hasClearAttackPath(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          )
        ) {
          this.damagePlayerFromBoss(
            phase === 2 ? 23 : 18,
            monster.x,
            monster.y,
            62,
          );
        }
      },
    );
  }

  private castDragonTail(
    monster: Phaser.Physics.Arcade.Sprite,
    phase: number,
  ) {
    const radius = phase === 2 ? 205 : 170;
    monster.setData("bossBusyUntil", this.time.now + 900);
    this.showBossCastLabel(monster, "TAIL SWEEP", 0xffc566);
    this.createBossCircleWarning(
      monster,
      monster.x,
      monster.y,
      radius,
      0xff8a35,
      560,
      () => {
        this.drawBossShockwave(monster.x, monster.y, 0xff8a35, radius);
        if (
          this.player &&
          Phaser.Math.Distance.Between(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          ) <= radius &&
          this.hasClearAttackPath(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          )
        ) {
          this.damagePlayerFromBoss(
            phase === 2 ? 26 : 20,
            monster.x,
            monster.y,
            96,
          );
        }
      },
    );
  }

  private castDragonDarkOrb(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    monster.setData("bossBusyUntil", this.time.now + 760);
    this.showBossCastLabel(monster, "ABYSS ORB", 0xd389ff);
    this.createBossLineWarning(
      monster,
      direction,
      560,
      22,
      0xa749e8,
      420,
      () => {
        const offsets = phase === 2 ? [-0.14, 0.14] : [0];
        for (const offset of offsets) {
          this.launchBossProjectile({
            color: 0xb84cff,
            damage: phase === 2 ? 22 : 17,
            direction: direction.clone().rotate(offset),
            monster,
            radius: 30,
            range: 620,
            scale: 1.6,
            speed: phase === 2 ? 420 : 350,
            texture: "rpg-boss-dark-orb",
          });
        }
      },
    );
  }

  private castGiantCharge(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    const range = phase === 2 ? 520 : 440;
    monster.setData("bossBusyUntil", this.time.now + 1_350);
    this.showBossCastLabel(monster, "GLACIER CHARGE", 0xbdefff);
    this.createBossLineWarning(
      monster,
      direction,
      range,
      42,
      0x9fe8ff,
      620,
      (end) => {
        const startX = monster.x;
        const startY = monster.y;
        let hasHit = false;
        monster
          .setData("bossMovementMode", "charge")
          .setData("bossBusyUntil", this.time.now + 620);
        this.tweens.add({
          targets: monster,
          x: end.x,
          y: end.y,
          duration: phase === 2 ? 390 : 470,
          ease: "Cubic.easeIn",
          onUpdate: () => {
            if (!monster.active) {
              return;
            }
            this.drawBossDashTrail(monster.x, monster.y, 0x9fe8ff);
            if (
              !hasHit &&
              this.player &&
              Phaser.Math.Distance.Between(
                monster.x,
                monster.y,
                this.player.x,
                this.player.y,
              ) < 88
            ) {
              hasHit = true;
              this.damagePlayerFromBoss(
                phase === 2 ? 32 : 25,
                startX,
                startY,
                110,
              );
            }
          },
          onComplete: () => {
            if (!monster.active) {
              return;
            }
            monster
              .setData("bossMovementMode", "idle")
              .setVelocity(0, 0);
            this.drawBossShockwave(monster.x, monster.y, 0xbdefff, 110);
          },
        });
      },
    );
  }

  private castGiantClubSweep(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    const range = phase === 2 ? 235 : 195;
    const halfAngle = phase === 2 ? 1.42 : 1.24;
    monster.setData("bossBusyUntil", this.time.now + 920);
    this.showBossCastLabel(monster, "FROST CLUB SWEEP", 0xd7f8ff);
    this.createBossConeWarning(
      monster,
      direction,
      range,
      halfAngle,
      0x8fd9f5,
      560,
      () => {
        this.drawBossSlash(
          monster.x,
          monster.y,
          direction.angle(),
          0xc9f6ff,
          range,
        );
        if (
          this.player &&
          isPointInCone(
            monster,
            this.player,
            direction,
            range,
            halfAngle,
          ) &&
          this.hasClearAttackPath(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          )
        ) {
          this.damagePlayerFromBoss(
            phase === 2 ? 28 : 22,
            monster.x,
            monster.y,
            118,
            650,
          );
        }
      },
    );
  }

  private castGiantBoulder(
    monster: Phaser.Physics.Arcade.Sprite,
    phase: number,
  ) {
    if (!this.player) {
      return;
    }
    const target = new Phaser.Math.Vector2(this.player.x, this.player.y);
    monster.setData("bossBusyUntil", this.time.now + 1_050);
    this.showBossCastLabel(monster, "ICE BOULDER", 0xd7f8ff);
    this.createBossCircleWarning(
      monster,
      target.x,
      target.y,
      54,
      0xb9e8ff,
      620,
      () => {
        const direction = target
          .clone()
          .subtract(new Phaser.Math.Vector2(monster.x, monster.y))
          .normalize();
        this.launchBossProjectile({
          color: 0xb9e8ff,
          damage: phase === 2 ? 30 : 23,
          direction,
          monster,
          radius: 42,
          range: Math.max(
            180,
            Phaser.Math.Distance.Between(
              monster.x,
              monster.y,
              target.x,
              target.y,
            ) + 40,
          ),
          scale: phase === 2 ? 2 : 1.7,
          slowMs: 1_200,
          speed: phase === 2 ? 420 : 340,
          texture: "rpg-boss-ice-boulder",
        });
      },
    );
  }

  private castGiantSlam(
    monster: Phaser.Physics.Arcade.Sprite,
    phase: number,
  ) {
    const radius = phase === 2 ? 230 : 195;
    monster.setData("bossBusyUntil", this.time.now + 1_120);
    this.showBossCastLabel(monster, "FROZEN EARTHQUAKE", 0xc9f6ff);
    this.createBossCircleWarning(
      monster,
      monster.x,
      monster.y,
      radius,
      0xaadfff,
      720,
      () => {
        this.drawBossShockwave(monster.x, monster.y, 0xb9e8ff, radius);
        if (
          this.player &&
          Phaser.Math.Distance.Between(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          ) <= radius &&
          this.hasClearAttackPath(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          )
        ) {
          this.damagePlayerFromBoss(
            phase === 2 ? 34 : 26,
            monster.x,
            monster.y,
            120,
            1_100,
          );
        }
        for (const offset of [-110, 0, 110]) {
          this.spawnBossHazard(
            monster.x + offset,
            monster.y + 64,
            42,
            phase === 2 ? 12 : 9,
            2_800,
            0x86cbe8,
            900,
          );
        }
      },
    );
  }

  private castGiantAvalancheRoar(
    monster: Phaser.Physics.Arcade.Sprite,
    phase: number,
  ) {
    const map = this.getCurrentMapDefinition();
    if (!map || !this.player) {
      return;
    }
    const count = phase === 2 ? 9 : 6;
    const centerX = this.player.x;
    const centerY = this.player.y;
    monster.setData("bossBusyUntil", this.time.now + 1_520);
    this.showBossCastLabel(monster, "AVALANCHE ROAR", 0xe6fbff);
    this.time.delayedCall(360, () => {
      if (!this.isBossCastValid(monster)) {
        return;
      }
      this.drawBossShockwave(monster.x, monster.y, 0xc8f3ff, 250);
      this.cameras.main.shake(280, 0.005);
    });

    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + 0.35;
      const distance = index === 0 ? 0 : 88 + (index % 3) * 62;
      const x = Phaser.Math.Clamp(
        centerX + Math.cos(angle) * distance,
        map.centerX - ARENA_WIDTH / 2 + 70,
        map.centerX + ARENA_WIDTH / 2 - 70,
      );
      const y = Phaser.Math.Clamp(
        centerY + Math.sin(angle) * distance,
        map.centerY - ARENA_HEIGHT / 2 + 70,
        map.centerY + ARENA_HEIGHT / 2 - 70,
      );
      this.createBossCircleWarning(
        monster,
        x,
        y,
        phase === 2 ? 52 : 44,
        0xbdefff,
        580 + index * 65,
        () => {
          this.drawBossShockwave(x, y, 0xe8fdff, phase === 2 ? 68 : 58);
          this.spawnBossHazard(
            x,
            y,
            phase === 2 ? 48 : 40,
            phase === 2 ? 16 : 12,
            2_200,
            0x8dcbe8,
            1_100,
          );
        },
      );
    }
  }

  private castWitchFrostVolley(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    phase: number,
  ) {
    monster.setData("bossBusyUntil", this.time.now + 820);
    this.showBossCastLabel(monster, "ICE VOLLEY", 0xcdf8ff);
    this.createBossLineWarning(
      monster,
      direction,
      620,
      phase === 2 ? 86 : 62,
      0x9fe8ff,
      430,
      () => {
        const offsets =
          phase === 2
            ? [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]
            : [-0.3, -0.15, 0, 0.15, 0.3];
        for (const offset of offsets) {
          this.launchBossProjectile({
            color: 0x9fe8ff,
            damage: phase === 2 ? 13 : 10,
            direction: direction.clone().rotate(offset),
            monster,
            radius: 20,
            range: 650,
            scale: 1.25,
            slowMs: 900,
            speed: phase === 2 ? 520 : 440,
            texture: "rpg-boss-ice-shard",
          });
        }
      },
    );
  }

  private castWitchBlizzard(
    monster: Phaser.Physics.Arcade.Sprite,
    phase: number,
  ) {
    if (!this.player) {
      return;
    }
    const targetX = this.player.x;
    const targetY = this.player.y;
    const radius = phase === 2 ? 190 : 155;
    monster.setData("bossBusyUntil", this.time.now + 1_180);
    this.showBossCastLabel(monster, "WHITEOUT BLIZZARD", 0xdffcff);
    this.createBossCircleWarning(
      monster,
      targetX,
      targetY,
      radius,
      0x8de9ff,
      720,
      () => {
        const count = phase === 2 ? 9 : 7;
        for (let index = 0; index < count; index += 1) {
          const angle = (index / count) * Math.PI * 2;
          const distance = index % 2 === 0 ? radius * 0.38 : radius * 0.72;
          this.spawnBossHazard(
            targetX + Math.cos(angle) * distance,
            targetY + Math.sin(angle) * distance,
            38,
            phase === 2 ? 13 : 10,
            3_600,
            0x82caee,
            1_500,
          );
        }
        this.spawnBossHazard(
          targetX,
          targetY,
          52,
          phase === 2 ? 18 : 14,
          3_600,
          0xbceeff,
          1_900,
        );
      },
    );
  }

  private castWitchFrostNova(
    monster: Phaser.Physics.Arcade.Sprite,
    phase: number,
  ) {
    const radius = phase === 2 ? 230 : 195;
    monster.setData("bossBusyUntil", this.time.now + 1_000);
    this.showBossCastLabel(monster, "FROST NOVA", 0xe9feff);
    this.createBossCircleWarning(
      monster,
      monster.x,
      monster.y,
      radius,
      0xbceeff,
      620,
      () => {
        this.drawBossShockwave(monster.x, monster.y, 0xdffcff, radius);
        if (
          this.player &&
          Phaser.Math.Distance.Between(
            monster.x,
            monster.y,
            this.player.x,
            this.player.y,
          ) <= radius
        ) {
          this.damagePlayerFromBoss(
            phase === 2 ? 24 : 18,
            monster.x,
            monster.y,
            72,
            1_800,
          );
        }
        const count = phase === 2 ? 14 : 10;
        for (let index = 0; index < count; index += 1) {
          this.launchBossProjectile({
            color: 0xbceeff,
            damage: phase === 2 ? 12 : 9,
            direction: new Phaser.Math.Vector2(1, 0).rotate(
              (index / count) * Math.PI * 2,
            ),
            monster,
            radius: 18,
            range: 520,
            scale: 1.1,
            slowMs: 900,
            speed: 390,
            texture: "rpg-boss-ice-shard",
          });
        }
      },
    );
  }

  private castWitchMirrorBurst(
    monster: Phaser.Physics.Arcade.Sprite,
    phase: number,
  ) {
    const map = this.getCurrentMapDefinition();
    if (!map || !this.player) {
      return;
    }
    const destinationX = Phaser.Math.Clamp(
      this.player.x < map.centerX ? map.centerX + 360 : map.centerX - 360,
      map.centerX - ARENA_WIDTH / 2 + 90,
      map.centerX + ARENA_WIDTH / 2 - 90,
    );
    const destinationY = Phaser.Math.Clamp(
      map.centerY + Phaser.Math.Between(-230, 230),
      map.centerY - ARENA_HEIGHT / 2 + 90,
      map.centerY + ARENA_HEIGHT / 2 - 90,
    );
    monster.setData("bossBusyUntil", this.time.now + 1_020);
    this.showBossCastLabel(monster, "MIRROR BURST", 0xc99dff);
    this.createBossCircleWarning(
      monster,
      monster.x,
      monster.y,
      120,
      0xb58aff,
      520,
      () => {
        this.drawBossShockwave(monster.x, monster.y, 0x8bcfff, 92);
        monster.setPosition(destinationX, destinationY);
        this.drawBossShockwave(destinationX, destinationY, 0xd9f8ff, 140);
        const count = phase === 2 ? 16 : 12;
        for (let index = 0; index < count; index += 1) {
          this.launchBossProjectile({
            color: 0xc8edff,
            damage: phase === 2 ? 13 : 10,
            direction: new Phaser.Math.Vector2(1, 0).rotate(
              (index / count) * Math.PI * 2,
            ),
            monster,
            radius: 18,
            range: 560,
            scale: 1.15,
            slowMs: 700,
            speed: phase === 2 ? 470 : 410,
            texture: "rpg-boss-ice-shard",
          });
        }
      },
    );
  }

  private createBossConeWarning(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    range: number,
    halfAngle: number,
    color: number,
    delay: number,
    onResolve: () => void,
  ) {
    const angle = direction.angle();
    const warning = this.trackBossSkillEffect(
      this.add.graphics().setDepth(2_050),
    );
    warning.fillStyle(color, 0.16);
    warning.lineStyle(3, color, 0.88);
    warning.beginPath();
    warning.moveTo(monster.x, monster.y);
    warning.arc(
      monster.x,
      monster.y,
      range,
      angle - halfAngle,
      angle + halfAngle,
      false,
    );
    warning.closePath();
    warning.fillPath();
    warning.strokePath();
    this.pulseBossWarning(warning, delay);
    this.time.delayedCall(delay, () => {
      this.destroyBossSkillEffect(warning);
      if (this.isBossCastValid(monster)) {
        onResolve();
      }
    });
  }

  private createBossCircleWarning(
    monster: Phaser.Physics.Arcade.Sprite,
    x: number,
    y: number,
    radius: number,
    color: number,
    delay: number,
    onResolve: () => void,
  ) {
    const warning = this.trackBossSkillEffect(
      this.add
        .circle(x, y, radius, color, 0.14)
        .setStrokeStyle(4, color, 0.9)
        .setDepth(2_050),
    );
    this.pulseBossWarning(warning, delay);
    this.time.delayedCall(delay, () => {
      this.destroyBossSkillEffect(warning);
      if (this.isBossCastValid(monster)) {
        onResolve();
      }
    });
  }

  private createBossLineWarning(
    monster: Phaser.Physics.Arcade.Sprite,
    direction: Phaser.Math.Vector2,
    range: number,
    width: number,
    color: number,
    delay: number,
    onResolve: (end: { x: number; y: number }) => void,
  ) {
    const end = this.clipAttackLine(
      monster.x,
      monster.y,
      monster.x + direction.x * range,
      monster.y + direction.y * range,
    );
    const normal = new Phaser.Math.Vector2(-direction.y, direction.x).scale(
      width,
    );
    const warning = this.trackBossSkillEffect(
      this.add.graphics().setDepth(2_050),
    );
    warning.fillStyle(color, 0.16);
    warning.lineStyle(3, color, 0.88);
    warning.fillPoints(
      [
        new Phaser.Math.Vector2(
          monster.x + normal.x,
          monster.y + normal.y,
        ),
        new Phaser.Math.Vector2(end.x + normal.x, end.y + normal.y),
        new Phaser.Math.Vector2(end.x - normal.x, end.y - normal.y),
        new Phaser.Math.Vector2(
          monster.x - normal.x,
          monster.y - normal.y,
        ),
      ],
      true,
    );
    warning.strokePoints(
      [
        new Phaser.Math.Vector2(
          monster.x + normal.x,
          monster.y + normal.y,
        ),
        new Phaser.Math.Vector2(end.x + normal.x, end.y + normal.y),
        new Phaser.Math.Vector2(end.x - normal.x, end.y - normal.y),
        new Phaser.Math.Vector2(
          monster.x - normal.x,
          monster.y - normal.y,
        ),
      ],
      true,
    );
    this.pulseBossWarning(warning, delay);
    this.time.delayedCall(delay, () => {
      this.destroyBossSkillEffect(warning);
      if (this.isBossCastValid(monster)) {
        onResolve(end);
      }
    });
  }

  private pulseBossWarning(
    warning: Phaser.GameObjects.GameObject,
    duration: number,
  ) {
    this.tweens.add({
      targets: warning,
      alpha: { from: 0.38, to: 0.92 },
      duration: 110,
      yoyo: true,
      repeat: Math.max(1, Math.floor(duration / 220)),
    });
  }

  private launchBossProjectile({
    color,
    damage,
    direction,
    monster,
    radius,
    range,
    scale,
    slowMs = 0,
    speed,
    texture,
  }: {
    color: number;
    damage: number;
    direction: Phaser.Math.Vector2;
    monster: Phaser.Physics.Arcade.Sprite;
    radius: number;
    range: number;
    scale: number;
    slowMs?: number;
    speed: number;
    texture: string;
  }) {
    const normalized = direction.clone().normalize();
    const startX = monster.x + normalized.x * 52;
    const startY = monster.y + normalized.y * 42;
    const end = this.clipAttackLine(
      startX,
      startY,
      startX + normalized.x * range,
      startY + normalized.y * range,
    );
    const projectile = this.trackBossSkillEffect(
      this.add
        .image(startX, startY, texture)
        .setScale(scale)
        .setTint(color)
        .setAngle(Phaser.Math.RadToDeg(normalized.angle()))
        .setDepth(2_120),
    );
    const travelDistance = Phaser.Math.Distance.Between(
      startX,
      startY,
      end.x,
      end.y,
    );
    let hasHit = false;
    this.tweens.add({
      targets: projectile,
      x: end.x,
      y: end.y,
      angle:
        texture === "rpg-boss-ice-boulder"
          ? projectile.angle + 540
          : projectile.angle,
      duration: Math.max(150, (travelDistance / speed) * 1_000),
      ease: "Linear",
      onUpdate: () => {
        if (
          hasHit ||
          !projectile.active ||
          !this.player ||
          useGameStore.getState().rpgStatus === "lost"
        ) {
          return;
        }
        if (
          Phaser.Math.Distance.Between(
            projectile.x,
            projectile.y,
            this.player.x,
            this.player.y,
          ) <= radius + 18
        ) {
          hasHit = true;
          projectile.setAlpha(0.25);
          this.damagePlayerFromBoss(
            damage,
            monster.x,
            monster.y,
            34,
            slowMs,
          );
        }
      },
      onComplete: () => {
        if (projectile.active) {
          this.drawBossShockwave(projectile.x, projectile.y, 0xc7f5ff, radius);
          this.destroyBossSkillEffect(projectile);
        }
      },
    });
  }

  private spawnBossHazard(
    x: number,
    y: number,
    radius: number,
    damage: number,
    duration: number,
    color: number,
    slowMs: number,
  ) {
    const hazard = this.trackBossSkillEffect(
      this.add
        .circle(x, y, radius, color, 0.18)
        .setStrokeStyle(3, 0xe8fdff, 0.86)
        .setDepth(2_040),
    );
    this.tweens.add({
      targets: hazard,
      alpha: { from: 0.18, to: 0.5 },
      scale: { from: 0.9, to: 1.08 },
      duration: 420,
      yoyo: true,
      repeat: -1,
    });
    let hasHit = false;
    const startedAt = this.time.now;
    this.time.addEvent({
      delay: 90,
      repeat: Math.ceil(duration / 90),
      callback: () => {
        if (!hazard.active) {
          return;
        }
        if (
          !hasHit &&
          this.time.now - startedAt >= 430 &&
          this.player &&
          Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <=
            radius + 18
        ) {
          hasHit = true;
          this.damagePlayerFromBoss(damage, x, y, 22, slowMs);
        }
        if (this.time.now - startedAt >= duration) {
          this.destroyBossSkillEffect(hazard);
        }
      },
    });
  }

  private damagePlayerFromBoss(
    rawDamage: number,
    sourceX: number,
    sourceY: number,
    knockback: number,
    slowMs = 0,
  ) {
    const now = this.time.now;
    const state = useGameStore.getState();
    if (
      !this.player ||
      state.rpgStatus === "lost" ||
      this.isRpgModalOpen(state) ||
      now - this.lastBossSkillDamageAt < 380
    ) {
      return;
    }
    this.lastBossSkillDamageAt = now;
    const relicBonuses = getRpgRelicBonuses(state.rpgRelicLevels);
    const damage = Math.max(
      1,
      Math.round(
        rawDamage * (1 - relicBonuses.damageReductionPercent / 100),
      ),
    );
    state.damageRpgPlayer(damage);
    this.playerSlowUntil = Math.max(this.playerSlowUntil, now + slowMs);

    const knockbackDirection = new Phaser.Math.Vector2(
      this.player.x - sourceX,
      this.player.y - sourceY,
    );
    if (knockbackDirection.lengthSq() > 0 && knockback > 0) {
      knockbackDirection.normalize().scale(knockback);
      this.player.setPosition(
        this.player.x + knockbackDirection.x,
        this.player.y + knockbackDirection.y,
      );
      this.enforceCurrentMapBounds();
    }
    this.showPickupToast(`-${damage} HP`, 0xff6b62);
    this.cameras.main.shake(170, 0.007);
    this.cameras.main.flash(110, 150, 22, 34, false);
  }

  private showBossCastLabel(
    monster: Phaser.Physics.Arcade.Sprite,
    text: string,
    color: number,
  ) {
    const label = this.trackBossSkillEffect(
      this.add
        .text(monster.x, monster.y - monster.displayHeight * 0.58 - 42, text, {
          color: `#${color.toString(16).padStart(6, "0")}`,
          fontFamily: '"Courier New", monospace',
          fontSize: "14px",
          fontStyle: "bold",
          stroke: "#160d18",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(2_180),
    );
    this.tweens.add({
      targets: label,
      y: label.y - 24,
      alpha: 0,
      duration: 950,
      onComplete: () => this.destroyBossSkillEffect(label),
    });
  }

  private drawBossConeBurst(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2,
    range: number,
    halfAngle: number,
    color: number,
  ) {
    const effect = this.trackBossSkillEffect(
      this.add.graphics().setDepth(2_130),
    );
    effect.fillStyle(color, 0.58);
    effect.lineStyle(8, 0xffd36a, 0.82);
    effect.beginPath();
    effect.moveTo(x, y);
    effect.arc(
      x,
      y,
      range,
      direction.angle() - halfAngle,
      direction.angle() + halfAngle,
      false,
    );
    effect.closePath();
    effect.fillPath();
    effect.strokePath();
    this.tweens.add({
      targets: effect,
      alpha: 0,
      duration: 360,
      onComplete: () => this.destroyBossSkillEffect(effect),
    });
  }

  private drawBossSlash(
    x: number,
    y: number,
    angle: number,
    color = 0xff7b35,
    radius = 126,
  ) {
    const slash = this.trackBossSkillEffect(
      this.add.graphics().setDepth(2_130),
    );
    slash.lineStyle(15, color, 0.7);
    slash.beginPath();
    slash.arc(x, y, radius, angle - 0.95, angle + 0.95, false);
    slash.strokePath();
    slash.lineStyle(4, 0xfff1b5, 0.92);
    slash.beginPath();
    slash.arc(x, y, radius + 6, angle - 0.9, angle + 0.9, false);
    slash.strokePath();
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.12,
      duration: 230,
      onComplete: () => this.destroyBossSkillEffect(slash),
    });
  }

  private drawBossShockwave(
    x: number,
    y: number,
    color: number,
    radius: number,
  ) {
    const ring = this.trackBossSkillEffect(
      this.add
        .ellipse(x, y, 24, 12, color, 0.22)
        .setStrokeStyle(5, color, 0.9)
        .setDepth(2_110),
    );
    this.tweens.add({
      targets: ring,
      displayWidth: radius * 2,
      displayHeight: radius,
      alpha: 0,
      duration: 380,
      onComplete: () => this.destroyBossSkillEffect(ring),
    });
  }

  private drawBossDashTrail(x: number, y: number, color: number) {
    const trail = this.trackBossSkillEffect(
      this.add
        .ellipse(x, y + 28, 88, 32, color, 0.2)
        .setDepth(2_030),
    );
    this.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 1.45,
      duration: 240,
      onComplete: () => this.destroyBossSkillEffect(trail),
    });
  }

  private trackBossSkillEffect<T extends Phaser.GameObjects.GameObject>(
    effect: T,
  ) {
    this.bossSkillEffects.add(effect);
    effect.once("destroy", () => this.bossSkillEffects.delete(effect));
    return effect;
  }

  private destroyBossSkillEffect(effect: Phaser.GameObjects.GameObject) {
    this.bossSkillEffects.delete(effect);
    if (effect.active) {
      effect.destroy();
    }
  }

  private clearBossSkillEffects() {
    for (const effect of [...this.bossSkillEffects]) {
      if (effect.active) {
        effect.destroy();
      }
    }
    this.bossSkillEffects.clear();
  }

  private isBossCastValid(monster: Phaser.Physics.Arcade.Sprite) {
    return (
      monster.active &&
      !monster.getData("defeated") &&
      monster.getData("mapId") === this.currentMap
    );
  }

  private createDialogue() {
    const panel = this.add
      .rectangle(0, 0, 510, 118, 0x10251f, 0.96)
      .setStrokeStyle(3, 0xe8d787);
    const portrait = this.add
      .image(-214, 0, "rpg-character-mage", 0)
      .setScale(0.78)
      .setOrigin(0.5);
    const name = this.add.text(-168, -43, "장로 노라 / AI 안내자", {
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

  private getPlayerTextureKey(classId = this.activePlayerClassId) {
    return `rpg-character-${classId}`;
  }

  private getPlayerAnimationKey(
    action: "attack" | "idle" | "run" | "skill" | "walk",
  ) {
    if (
      this.activePlayerClassId === "adventurer" &&
      (action === "idle" || action === "run" || action === "walk")
    ) {
      return `rpg-character-adventurer-directional-${this.playerFacing}-${action}`;
    }
    return `${this.getPlayerTextureKey()}-${action}`;
  }

  private playPlayerAnimation(
    action: "attack" | "idle" | "run" | "skill" | "walk",
  ) {
    if (!this.player) {
      return;
    }

    if (this.activePlayerClassId === "adventurer") {
      const usesDirectionalSheet =
        action === "idle" || action === "run" || action === "walk";
      this.player.setFlipX(usesDirectionalSheet && this.playerFacing === "right");
    }
    this.player.play(this.getPlayerAnimationKey(action), true);
  }

  private syncPlayerClass(classId: RpgClassId) {
    if (!this.player || this.activePlayerClassId === classId) {
      return;
    }

    this.finishSpinAttack();
    this.cancelChargedSkill();
    this.brawlerPunchUntil = 0;
    this.activePlayerClassId = classId;
    const textureKey =
      classId === "adventurer"
        ? "rpg-character-adventurer-directional"
        : this.getPlayerTextureKey(classId);
    this.player.setTexture(textureKey, 0);
    this.playPlayerAnimation("idle");
    const definition = getRpgClass(classId);
    this.showPickupToast(`전직 완료 · ${definition.name}`, definition.skill.color);
    this.cameras.main.flash(260, 255, 232, 154, false);
    this.dispatchCombatCooldowns(this.time.now, true);
  }

  private updatePlayerFacing(velocity: Phaser.Math.Vector2) {
    if (velocity.lengthSq() > 0) {
      const aim = normalizeRpgDirection(velocity.x, velocity.y);
      this.aimDirection.set(aim.x, aim.y);
    }
    let facing: Facing;
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      facing = velocity.x < 0 ? "left" : "right";
    } else {
      facing = velocity.y < 0 ? "back" : "front";
    }

    this.playerFacing = facing;
    if (
      this.activePlayerClassId !== "adventurer" &&
      Math.abs(velocity.x) > 2
    ) {
      // The promotion sheets are authored looking left. Mirror only when
      // travelling right so the run cycle never appears to move backwards.
      this.player?.setFlipX(velocity.x > 0);
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

    if (
      (time < this.classSkillUntil || this.chargedSkillClassId) &&
      !paused
    ) {
      this.playPlayerAnimation("skill");
      this.playerShadow?.setScale(1.2, 0.82).setAlpha(0.34);
      return;
    }

    this.player.setAngle(0).setScale(1.22);
    if (time < this.attackAnimationUntil && !paused) {
      this.playPlayerAnimation("attack");
      this.playerShadow?.setScale(1.06, 0.92).setAlpha(0.3);
      return;
    }
    if (paused || !isMoving) {
      this.playPlayerAnimation("idle");
      this.playerShadow?.setScale(1, 1).setAlpha(0.28);
      return;
    }

    const dashing = time < this.dashUntil;
    const stride = Math.cos(time / (dashing ? 42 : 72));
    this.playPlayerAnimation(dashing ? "run" : "walk");
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

  private isRpgModalOpen(state = useGameStore.getState()) {
    return Boolean(
      state.npcDialogueOpen ||
        state.rpgDialogue ||
        state.rpgShopOpen ||
        state.rpgCharacterSelectOpen ||
        state.rpgBlacksmithOpen ||
        state.rpgJobSwitchOpen,
    );
  }

  private getCurrentClassSkillCooldownMs(state = useGameStore.getState()) {
    const definition = getRpgClass(state.rpgClassId);
    const relicBonuses = getRpgRelicBonuses(state.rpgRelicLevels);
    return getRpgWeaponEnhancedCooldownMs(
      definition.skill.cooldownMs *
        (1 - relicBonuses.skillCooldownPercent / 100),
      state.rpgWeaponEnhancementLevel,
    );
  }

  private getCurrentDashCooldownMs(state = useGameStore.getState()) {
    return getRpgWeaponEnhancedCooldownMs(
      DASH_COOLDOWN_MS,
      state.rpgWeaponEnhancementLevel,
    );
  }

  private dispatchCombatCooldowns(time: number, force = false) {
    if (
      typeof window === "undefined" ||
      (!force &&
        time - this.lastCombatCooldownDispatchAt <
          COMBAT_COOLDOWN_EVENT_THROTTLE_MS)
    ) {
      return;
    }

    this.lastCombatCooldownDispatchAt = time;
    const detail: RpgCombatCooldownDetail = {
      skillRemainingMs: Math.max(
        0,
        Math.ceil(this.classSkillCooldownUntil - time),
      ),
      skillTotalMs: this.getCurrentClassSkillCooldownMs(),
      dashRemainingMs: Math.max(
        0,
        Math.ceil(this.dashCooldownUntil - time),
      ),
      dashTotalMs: this.getCurrentDashCooldownMs(),
    };
    window.dispatchEvent(
      new CustomEvent<RpgCombatCooldownDetail>(RPG_COMBAT_COOLDOWN_EVENT, {
        detail,
      }),
    );
  }

  private handleInteractCommand() {
    const state = useGameStore.getState();

    if (state.rpgStatus === "lost") {
      return;
    }
    if (getRpgJobChangeOptions(state.level, state.rpgClassId).length > 0) {
      return;
    }

    if (state.rpgDialogue) {
      state.closeRpgDialogue();
      return;
    }
    if (this.isRpgModalOpen(state)) {
      return;
    }
    if (this.activeInteraction) {
      this.handleWorldInteraction(this.activeInteraction);
    }
  }

  private handleAttackCommand() {
    const state = useGameStore.getState();
    const relicBonuses = getRpgRelicBonuses(state.rpgRelicLevels);
    if (
      state.rpgStatus === "playing" &&
      !this.isRpgModalOpen(state) &&
      getRpgJobChangeOptions(state.level, state.rpgClassId).length === 0 &&
      this.time.now >= this.nextAttackAt &&
      this.time.now >= this.classSkillUntil &&
      this.time.now >= this.dashUntil &&
      !this.chargedSkillClassId
    ) {
      this.nextAttackAt =
        this.time.now +
        Math.max(
          145,
          Math.round(330 / (1 + relicBonuses.attackSpeedPercent / 100)),
        );
      this.attackAnimationUntil =
        this.time.now + RPG_BASIC_ATTACK_ACTIVE_MS;
      this.playPlayerAnimation("attack");
      const basicAttackSfx = getRpgBasicAttackSfxPlayback(state.rpgClassId);
      this.playRpgSfx(basicAttackSfx.key, "playerAttack", {
        maxDurationMs: RPG_BASIC_ATTACK_ACTIVE_MS,
        seekSeconds: basicAttackSfx.seekSeconds,
        volume: 0.42,
      });
      if (MAGE_CLASS_IDS.includes(state.rpgClassId)) {
        this.castMageBasicAttack(state.rpgClassId);
      } else if (ARCHER_CLASS_IDS.includes(state.rpgClassId)) {
        this.castArcherBasicAttack(state.rpgClassId);
      } else {
        this.attackNearbyMonsters();
      }
    }
  }

  private updateDropPresentation(time: number) {
    if (!this.player || !this.drops || !this.pickupHint) {
      return;
    }
    const state = useGameStore.getState();
    if (
      state.rpgStatus === "lost" ||
      this.isRpgModalOpen(state) ||
      getRpgJobChangeOptions(state.level, state.rpgClassId).length > 0
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
      this.isRpgModalOpen(state) ||
      getRpgJobChangeOptions(state.level, state.rpgClassId).length > 0
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
      state.collectRpgPotion(1);
      state.setSelectedCell("ITEM", "=PICKUP.POTION(1)");
      this.showPickupToast("회복 물약 +1", 0xff8f9b);
    } else {
      const relicId = nearest.getData("relicId") as RpgRelicId;
      const previousLevel = state.rpgRelicLevels[relicId] ?? 0;
      state.collectRpgDroppedRelic(relicId);
      const relic = getRpgRelic(relicId);
      const nextLevel =
        useGameStore.getState().rpgRelicLevels[relicId] ?? 1;
      this.showPickupToast(
        previousLevel > 0
          ? `중복 강화 · ${relic?.name ?? relicId} Lv.${nextLevel}`
          : `유물 발견 · ${relic?.name ?? relicId}`,
        previousLevel > 0 ? 0xffd76b : 0xe8c4ff,
      );
    }
    nearest.destroy();
  }

  private handleDashCommand(event: KeyboardEvent) {
    if (
      event.location !== 1 ||
      !this.player ||
      this.time.now < this.dashCooldownUntil ||
      Boolean(this.chargedSkillClassId)
    ) {
      return;
    }
    const state = useGameStore.getState();
    if (
      state.rpgStatus !== "playing" ||
      this.isRpgModalOpen(state) ||
      getRpgJobChangeOptions(state.level, state.rpgClassId).length > 0
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
    this.dashCooldownUntil =
      this.time.now + this.getCurrentDashCooldownMs(state);
    this.dispatchCombatCooldowns(this.time.now, true);
  }

  private handleClassSkillPressed(event: KeyboardEvent) {
    if (event.repeat || this.chargedSkillClassId) {
      return;
    }

    const state = useGameStore.getState();
    if (
      !this.player ||
      state.rpgStatus !== "playing" ||
      this.isRpgModalOpen(state) ||
      getRpgJobChangeOptions(state.level, state.rpgClassId).length > 0 ||
      this.time.now < this.classSkillCooldownUntil ||
      this.time.now < this.classSkillUntil ||
      this.time.now < this.dashUntil
    ) {
      return;
    }

    const definition = getRpgClass(state.rpgClassId);
    if (definition.id === "longbow" || definition.id === "brawler") {
      this.startChargedSkill(definition.id);
      return;
    }

    this.activateClassSkill(definition, state);
  }

  private handleClassSkillReleased() {
    if (!this.chargedSkillClassId) {
      return;
    }

    const state = useGameStore.getState();
    const chargedClassId = this.chargedSkillClassId;
    const elapsedMs = Math.max(0, this.time.now - this.chargedSkillStartedAt);
    const direction = this.chargedSkillDirection.clone().normalize();
    this.clearChargedSkillPresentation();
    this.chargedSkillClassId = undefined;

    if (
      !this.player ||
      state.rpgStatus !== "playing" ||
      state.rpgClassId !== chargedClassId ||
      this.isRpgModalOpen(state)
    ) {
      return;
    }

    const definition = getRpgClass(chargedClassId);
    this.classSkillCooldownUntil =
      this.time.now + this.getCurrentClassSkillCooldownMs(state);
    this.playPlayerAnimation("skill");

    if (chargedClassId === "longbow") {
      this.releaseLongbowChargedArrow(definition, direction, elapsedMs);
    } else {
      this.releaseBrawlerChargedPunch(definition, direction, elapsedMs);
    }

    this.dispatchCombatCooldowns(this.time.now, true);
    this.playRpgSfx(getRpgSkillSfxKey(definition.id), "playerSkill", {
      maxDurationMs: Math.max(0, this.classSkillUntil - this.time.now),
      volume: 0.5,
    });
  }

  private startChargedSkill(classId: ChargedSkillClassId) {
    if (!this.player) {
      return;
    }

    this.chargedSkillClassId = classId;
    this.chargedSkillStartedAt = this.time.now;
    this.chargedSkillDirection.copy(this.getFacingVector().normalize());
    this.chargedSkillIndicator?.destroy();
    this.chargedSkillLabel?.destroy();
    this.chargedSkillIndicator = this.add.graphics().setDepth(2_180);
    this.chargedSkillLabel = this.add
      .text(this.player.x, this.player.y - 70, "CHARGE 0%", {
        backgroundColor: "#071710dd",
        color: classId === "longbow" ? "#fff0a0" : "#ffc58a",
        fontFamily: '"Courier New", monospace',
        fontSize: "12px",
        fontStyle: "bold",
        padding: { x: 8, y: 5 },
        stroke: "#07140f",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(2_190);
    this.updateChargedSkill(this.time.now, false);
  }

  private updateChargedSkill(time: number, paused: boolean) {
    if (!this.chargedSkillClassId) {
      return;
    }

    const state = useGameStore.getState();
    if (
      paused ||
      !this.player ||
      state.rpgClassId !== this.chargedSkillClassId
    ) {
      this.cancelChargedSkill();
      return;
    }

    const isLongbow = this.chargedSkillClassId === "longbow";
    const elapsedMs = Math.max(0, time - this.chargedSkillStartedAt);
    const maximumMs = isLongbow
      ? LONGBOW_MAX_CHARGE_MS
      : BRAWLER_MAX_CHARGE_MS;
    const progress = isLongbow
      ? getLongbowChargeStats(elapsedMs).progress
      : getBrawlerChargeStats(elapsedMs).progress;
    const color = isLongbow ? 0xffe96d : 0xff9d4d;
    const pulse = 1 + Math.sin(time / 95) * 0.06;
    const radius = (28 + progress * 22) * pulse;
    const direction = this.chargedSkillDirection;
    const indicator = this.chargedSkillIndicator;
    indicator?.clear();
    indicator?.fillStyle(color, 0.08 + progress * 0.13);
    indicator?.fillCircle(this.player.x, this.player.y, radius);
    indicator?.lineStyle(3 + progress * 3, color, 0.88);
    indicator?.strokeCircle(this.player.x, this.player.y, radius);
    indicator?.lineStyle(5 + progress * 5, color, 0.72);
    indicator?.lineBetween(
      this.player.x + direction.x * 28,
      this.player.y + direction.y * 28,
      this.player.x + direction.x * (76 + progress * 44),
      this.player.y + direction.y * (76 + progress * 44),
    );
    this.chargedSkillLabel
      ?.setPosition(this.player.x, this.player.y - radius - 28)
      .setText(
        progress >= 1
          ? "MAX CHARGE"
          : `CHARGE ${Math.round(progress * 100)}%`,
      );

    if (elapsedMs >= maximumMs && this.chargedSkillLabel) {
      this.chargedSkillLabel.setColor("#ffffff");
    }
  }

  private clearChargedSkillPresentation() {
    this.chargedSkillIndicator?.destroy();
    this.chargedSkillLabel?.destroy();
    this.chargedSkillIndicator = undefined;
    this.chargedSkillLabel = undefined;
  }

  private cancelChargedSkill() {
    this.clearChargedSkillPresentation();
    this.chargedSkillClassId = undefined;
    this.chargedSkillStartedAt = 0;
  }

  private releaseLongbowChargedArrow(
    definition: RpgClassDefinition,
    direction: Phaser.Math.Vector2,
    elapsedMs: number,
  ) {
    const stats = getLongbowChargeStats(elapsedMs);
    const range =
      this.getAdjustedSkillRange(definition.skill.range) *
      stats.rangeMultiplier;
    const damage = Math.max(
      1,
      Math.round(
        this.getAdjustedCombatDamage(definition.skill.power, true) *
          stats.damageMultiplier,
      ),
    );
    const cameraZoom = Math.max(0.01, this.cameras.main.zoom);
    const visualScale = stats.arrowThicknessPx / 14 / cameraZoom;
    const flightDurationMs = Math.max(460, (range / stats.speed) * 1_000);
    this.classSkillUntil = this.time.now + flightDurationMs;
    this.launchSkillProjectile({
      color: definition.skill.color,
      damage,
      direction,
      kind: "arrow",
      maxHits: 12,
      range,
      speed: stats.speed,
      visualScale,
      width: Math.min(38, 16 + stats.arrowThicknessPx * 0.58),
    });
    this.drawMuzzleFlash(direction, definition.skill.color);
    this.showPickupToast(
      `차지 관통화살 · ${Math.round(stats.progress * 100)}%`,
      definition.skill.color,
    );
  }

  private releaseBrawlerChargedPunch(
    definition: RpgClassDefinition,
    direction: Phaser.Math.Vector2,
    elapsedMs: number,
  ) {
    const stats = getBrawlerChargeStats(elapsedMs);
    this.dashDirection.copy(direction);
    this.dashUntil = this.time.now + stats.dashDurationMs;
    this.brawlerPunchUntil = this.dashUntil;
    this.brawlerPunchImpactAt =
      this.time.now + Math.round(stats.dashDurationMs * 0.68);
    this.brawlerPunchDamage = Math.max(
      1,
      Math.round(
        this.getAdjustedCombatDamage(definition.skill.power, true) *
          stats.damageMultiplier,
      ),
    );
    this.brawlerPunchRange =
      this.getAdjustedSkillRange(definition.skill.range) *
      stats.rangeMultiplier *
      0.55;
    this.brawlerPunchStunMs = stats.stunMs;
    this.brawlerPunchDidHit = false;
    this.classSkillUntil = this.brawlerPunchUntil;
    this.showPickupToast(
      `축기 붕권 · ${Math.round(stats.progress * 100)}%`,
      definition.skill.color,
    );
  }

  private activateClassSkill(
    definition: RpgClassDefinition,
    state = useGameStore.getState(),
  ) {
    const activationDurationMs = getRpgSkillActivationDurationMs(
      definition.id,
    );
    this.classSkillCooldownUntil =
      this.time.now + this.getCurrentClassSkillCooldownMs(state);
    this.classSkillUntil = this.time.now + activationDurationMs;
    this.playPlayerAnimation("skill");
    this.dispatchCombatCooldowns(this.time.now, true);

    if (definition.id === "mage") {
      this.castMageLaser(definition);
    } else if (definition.id === "firemage") {
      this.castFireMageMeteors(definition);
    } else if (definition.id === "frostmage") {
      this.castFrostMageIcicles(definition);
    } else if (definition.id === "stormmage") {
      this.castStormMageLightning(definition);
    } else if (definition.id === "toxicmage") {
      this.castToxicMagePotion(definition);
    } else {
      switch (definition.skill.effect) {
        case "spin":
          this.startSpinSkill(definition);
          break;
        case "dash":
          this.startSkillDash(definition);
          break;
        case "nova":
          this.castNovaSkill(definition);
          break;
        case "line":
          this.castLineSkill(definition);
          break;
        case "volley":
          this.castVolleySkill(definition);
          break;
        case "barrage":
          this.castBarrageSkill(definition);
          break;
        case "chain":
          this.castChainSkill(definition);
          break;
        case "hook":
          this.castHookSkill(definition);
          break;
        case "tornado":
          this.castTornadoSkill(definition);
          break;
      }
    }

    this.playRpgSfx(getRpgSkillSfxKey(definition.id), "playerSkill", {
      maxDurationMs: Math.max(0, this.classSkillUntil - this.time.now),
      volume: 0.5,
    });
  }

  private startSpinSkill(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    this.spinDuration = definition.skill.durationMs ?? 2_000;
    this.spinDamage = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    const relicBonuses = getRpgRelicBonuses(
      useGameStore.getState().rpgRelicLevels,
    );
    this.spinRange =
      definition.skill.range *
      (1 + relicBonuses.attackRangePercent / 100);
    this.spinColor = definition.skill.color;
    this.spinUntil = this.time.now + this.spinDuration;
    this.classSkillUntil = this.spinUntil;
    this.nextSpinDamageAt = this.time.now;
    this.spinSword?.destroy();
    this.spinSword = this.add
      .image(this.player.x + 52, this.player.y, "rpg-sword")
      .setScale(2.25)
      .setTint(this.spinColor)
      .setDepth(this.player.depth + 2);
  }

  private startSkillDash(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    this.dashDirection.copy(this.getFacingVector().normalize());
    this.skillDashUntil =
      this.time.now + (definition.skill.durationMs ?? 620);
    this.dashUntil = this.skillDashUntil;
    this.nextSkillDashDamageAt = this.time.now;
    this.skillDashDamage = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    const relicBonuses = getRpgRelicBonuses(
      useGameStore.getState().rpgRelicLevels,
    );
    this.skillDashRange =
      definition.skill.range *
      (1 + relicBonuses.attackRangePercent / 100);
    this.skillDashColor = definition.skill.color;
    this.skillDashStunMs = definition.skill.stunMs ?? 0;
    this.classSkillUntil = this.skillDashUntil;
  }

  private castMageBasicAttack(classId: RpgClassId) {
    if (!this.player) {
      return;
    }

    const state = useGameStore.getState();
    const definition = getRpgClass(classId);
    const equipmentRange = Object.values(state.rpgEquippedItems)
      .map((equipmentId) => getRpgEquipment(equipmentId)?.stats.attackRange ?? 0)
      .reduce((total, value) => total + value, 0);
    const direction = this.getFacingVector().normalize();
    this.drawStaffCast(direction, definition.skill.color);
    this.launchSkillProjectile({
      color: definition.skill.color,
      damage: this.getAdjustedCombatDamage(1, false),
      direction,
      kind: "orb",
      maxHits: 1,
      range: this.getAdjustedSkillRange(
        MAGE_BASIC_ATTACK_RANGE + equipmentRange,
      ),
      speed: 720,
      width: 30,
    });
  }

  private castArcherBasicAttack(classId: RpgClassId) {
    if (!this.player) {
      return;
    }

    const state = useGameStore.getState();
    const definition = getRpgClass(classId);
    const equipmentRange = Object.values(state.rpgEquippedItems)
      .map((equipmentId) => getRpgEquipment(equipmentId)?.stats.attackRange ?? 0)
      .reduce((total, value) => total + value, 0);
    const classRange =
      classId === "longbow" ? 500 : classId === "crossbow" ? 450 : 420;
    const direction = this.getFacingVector().normalize();
    this.launchSkillProjectile({
      color: definition.skill.color,
      damage: this.getAdjustedCombatDamage(1, false),
      direction,
      kind: "arrow",
      maxHits: 1,
      range: this.getAdjustedSkillRange(classRange + equipmentRange),
      speed: classId === "longbow" ? 900 : 840,
      visualScale: 0.82,
      width: 20,
    });
    this.drawMuzzleFlash(direction, definition.skill.color);
  }

  private castMageLaser(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const direction = this.getFacingVector().normalize();
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const end = this.clipAttackLine(
      this.player.x,
      this.player.y,
      this.player.x + direction.x * range,
      this.player.y + direction.y * range,
    );
    const availableRange = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      end.x,
      end.y,
    );
    const damage = this.getAdjustedCombatDamage(definition.skill.power, true);

    this.drawStaffCast(direction, definition.skill.color);
    this.drawSkillLine(
      this.player.x + direction.x * 24,
      this.player.y + direction.y * 24,
      end.x,
      end.y,
      definition.skill.color,
      12,
      340,
    );
    for (const monster of this.getMonstersInLine(direction, availableRange, 32)) {
      this.damageMonster(monster, damage);
      this.drawSkillImpact(monster.x, monster.y, definition.skill.color, 30);
    }
  }

  private castFireMageMeteors(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const direction = this.getFacingVector().normalize();
    const perpendicular = new Phaser.Math.Vector2(-direction.y, direction.x);
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const damage = this.getAdjustedCombatDamage(definition.skill.power, true);
    const blastRadius = Math.max(76, range * 0.34);
    const forwardDistance = range * 0.72;

    for (const [index, lateralOffset] of [-0.3, 0, 0.3].entries()) {
      const target = this.clipAttackLine(
        this.player.x,
        this.player.y,
        this.player.x +
          direction.x * forwardDistance +
          perpendicular.x * range * lateralOffset,
        this.player.y +
          direction.y * forwardDistance +
          perpendicular.y * range * lateralOffset,
      );
      const delay = index * 130;
      this.time.delayedCall(delay, () => {
        this.drawMeteorFall(target.x, target.y, definition.skill.color, range);
      });
      this.time.delayedCall(delay + 280, () => {
        this.damageMonstersInRadius(
          target.x,
          target.y,
          blastRadius,
          damage,
        );
        this.drawSkillImpact(
          target.x,
          target.y,
          definition.skill.color,
          blastRadius * 0.72,
        );
        this.cameras.main.shake(90, 0.004);
      });
    }
  }

  private castFrostMageIcicles(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const direction = this.getFacingVector().normalize();
    const perpendicular = new Phaser.Math.Vector2(-direction.y, direction.x);
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const damage = this.getAdjustedCombatDamage(definition.skill.power, true);
    const impactRadius = Math.max(62, range * 0.27);
    const playerX = this.player.x;
    const playerY = this.player.y;
    const placements = [
      { forward: 0.48, side: -0.16 },
      { forward: 0.62, side: 0.16 },
      { forward: 0.76, side: -0.16 },
      { forward: 0.9, side: 0.16 },
    ];

    placements.forEach(({ forward, side }, index) => {
      const target = this.clipAttackLine(
        playerX,
        playerY,
        playerX +
          direction.x * range * forward +
          perpendicular.x * range * side,
        playerY +
          direction.y * range * forward +
          perpendicular.y * range * side,
      );
      const delay = index * 90;
      this.time.delayedCall(delay, () =>
        this.drawFallingIcicle(
          target.x,
          target.y,
          definition.skill.color,
          () => {
            this.damageMonstersInRadius(
              target.x,
              target.y,
              impactRadius,
              damage,
              definition.skill.stunMs ?? 1_600,
            );
            this.drawSkillImpact(
              target.x,
              target.y,
              definition.skill.color,
              impactRadius * 0.65,
            );
          },
        ),
      );
    });
  }

  private castStormMageLightning(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const direction = this.getFacingVector().normalize();
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const target = this.clipAttackLine(
      this.player.x,
      this.player.y,
      this.player.x + direction.x * range * 0.78,
      this.player.y + direction.y * range * 0.78,
    );
    const damage = this.getAdjustedCombatDamage(definition.skill.power, true);
    const shockRadius = Math.max(82, range * 0.25);
    let pulse = 0;
    this.drawLightningStrike(target.x, target.y, definition.skill.color);
    this.time.addEvent({
      delay: 360,
      repeat: 3,
      startAt: 360,
      callback: () => {
        pulse += 1;
        for (const monster of this.getActiveMonsters()) {
          if (
            Phaser.Math.Distance.Between(
              target.x,
              target.y,
              monster.x,
              monster.y,
            ) > shockRadius ||
            !this.hasClearAttackPath(target.x, target.y, monster.x, monster.y)
          ) {
            continue;
          }
          monster.setData("shockUntil", this.time.now + 520);
          monster.setData(
            "stunUntil",
            Math.max(
              Number(monster.getData("stunUntil") ?? 0),
              this.time.now + (definition.skill.stunMs ?? 180),
            ),
          );
          this.damageMonster(monster, damage);
        }
        this.drawElectricPulse(
          target.x,
          target.y,
          definition.skill.color,
          shockRadius,
          pulse,
        );
      },
    });
  }

  private castToxicMagePotion(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const direction = this.getFacingVector().normalize();
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const target = this.clipAttackLine(
      this.player.x,
      this.player.y,
      this.player.x + direction.x * range * 0.82,
      this.player.y + direction.y * range * 0.82,
    );
    const damage = this.getAdjustedCombatDamage(definition.skill.power, true);
    const duration = definition.skill.durationMs ?? 2_800;
    const poisonRadius = Math.max(82, range * 0.4);
    this.throwPoisonBottle(
      target.x,
      target.y,
      definition.skill.color,
      () => {
        const pool = this.add
          .ellipse(
            target.x,
            target.y,
            poisonRadius * 2,
            poisonRadius * 1.25,
            definition.skill.color,
            0.22,
          )
          .setStrokeStyle(4, 0xcaff96, 0.68)
          .setDepth(target.y + 1);
        this.drawPoisonField(
          target.x,
          target.y,
          definition.skill.color,
          poisonRadius,
          duration,
        );
        this.time.addEvent({
          delay: 450,
          repeat: Math.max(1, Math.floor(duration / 450) - 1),
          callback: () => {
            if (pool.active) {
              this.damageMonstersInRadius(
                target.x,
                target.y,
                poisonRadius,
                damage,
              );
            }
          },
        });
        this.time.delayedCall(duration, () => {
          if (!pool.active) {
            return;
          }
          this.tweens.add({
            targets: pool,
            alpha: 0,
            duration: 260,
            onComplete: () => pool.destroy(),
          });
        });
      },
    );
  }

  private castNovaSkill(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const { color, durationMs, stunMs } = definition.skill;
    const power = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const rangedCaster = [
      "firemage",
      "frostmage",
      "mage",
      "toxicmage",
    ].includes(definition.id);
    const direction = this.getFacingVector().normalize();
    const targetDistance = rangedCaster ? Math.min(190, range * 0.58) : 0;
    const target = this.clipAttackLine(
      this.player.x,
      this.player.y,
      this.player.x + direction.x * targetDistance,
      this.player.y + direction.y * targetDistance,
    );
    const field = this.add
      .circle(target.x, target.y, range, color, durationMs ? 0.14 : 0.1)
      .setStrokeStyle(5, color, 0.82)
      .setScale(0.18)
      .setDepth(target.y + 3);
    this.tweens.add({
      targets: field,
      scale: 1,
      duration: durationMs ? 260 : 330,
      onComplete: () => {
        if (!durationMs) {
          this.tweens.add({
            targets: field,
            alpha: 0,
            duration: 180,
            onComplete: () => field.destroy(),
          });
        }
      },
    });

    if (definition.id === "firemage") {
      this.drawMeteorFall(target.x, target.y, color, range);
    } else if (definition.id === "frostmage") {
      this.drawIceSpikes(target.x, target.y, color, range);
    } else if (definition.id === "toxicmage") {
      this.drawPoisonField(target.x, target.y, color, range, durationMs ?? 2_400);
    } else if (definition.id === "greatsword") {
      this.drawGroundFracture(target.x, target.y, color, range);
      this.cameras.main.shake(150, 0.007);
    } else {
      this.drawRuneBurst(target.x, target.y, color, range);
    }

    const damagePulse = () => {
      if (!field.active) {
        return;
      }
      this.damageMonstersInRadius(
        target.x,
        target.y,
        range,
        power,
        stunMs,
      );
      this.drawSkillImpact(target.x, target.y, color, Math.min(52, range * 0.28));
    };

    this.time.delayedCall(
      definition.id === "firemage" || definition.id === "frostmage" ? 280 : 0,
      damagePulse,
    );
    if (durationMs) {
      this.time.addEvent({
        delay: 480,
        repeat: Math.max(1, Math.floor(durationMs / 480) - 1),
        callback: damagePulse,
      });
      this.tweens.add({
        targets: field,
        alpha: { from: 0.18, to: 0.07 },
        scaleX: { from: 0.96, to: 1.04 },
        scaleY: { from: 1.04, to: 0.96 },
        duration: 420,
        yoyo: true,
        repeat: Math.max(1, Math.floor(durationMs / 840)),
      });
      this.time.delayedCall(durationMs, () => {
        if (field.active) {
          field.destroy();
        }
      });
    }
  }

  private castLineSkill(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const direction = this.getFacingVector().normalize();
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const damage = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    const projectile =
      definition.id === "ninja"
        ? "shuriken"
        : definition.id === "spearman"
          ? "spear"
          : "arrow";

    this.launchSkillProjectile({
      color: definition.skill.color,
      damage,
      direction,
      kind: projectile,
      maxHits: projectile === "shuriken" ? 4 : 6,
      range,
      speed:
        projectile === "arrow" ? 820 : projectile === "spear" ? 680 : 510,
      stunMs: definition.skill.stunMs ?? 0,
      width: projectile === "shuriken" ? 52 : 38,
    });

    if (projectile === "shuriken") {
      this.drawShadowTrail(
        this.player.x,
        this.player.y,
        this.player.x + direction.x * 74,
        this.player.y + direction.y * 74,
        definition.skill.color,
      );
    }
  }

  private castVolleySkill(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const baseAngle = this.getFacingVector().angle();
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const damage = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    for (const angleOffset of [-0.42, -0.21, 0, 0.21, 0.42]) {
      const direction = new Phaser.Math.Vector2(
        Math.cos(baseAngle + angleOffset),
        Math.sin(baseAngle + angleOffset),
      );
      this.time.delayedCall(
        Math.round(Math.abs(angleOffset) * 90),
        () =>
          this.launchSkillProjectile({
            color: definition.skill.color,
            damage,
            direction,
            kind: "arrow",
            maxHits: 1,
            range,
            speed: 760,
            width: 25,
          }),
      );
    }
  }

  private castBarrageSkill(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const baseDirection = this.getFacingVector().normalize();
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const damage = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    const projectileKind =
      definition.id === "crossbow" ? "arrow" : "bullet";
    let shotIndex = 0;
    this.time.addEvent({
      delay: 72,
      repeat: 9,
      callback: () => {
        if (!this.player) {
          return;
        }
        const currentShot = shotIndex;
        shotIndex += 1;
        const direction = baseDirection
          .clone()
          .rotate(Phaser.Math.FloatBetween(-0.09, 0.09));
        this.launchSkillProjectile({
          color: definition.skill.color,
          damage,
          direction,
          kind: projectileKind,
          maxHits: 1,
          onComplete:
            definition.id === "pirate" && currentShot === 9
              ? (x, y) => {
                  this.damageMonstersInRadius(
                    x,
                    y,
                    82,
                    Math.max(1, Math.round(damage * 1.4)),
                  );
                  this.drawSkillImpact(x, y, 0xff9d45, 58);
                  this.cameras.main.shake(110, 0.005);
                }
              : undefined,
          range,
          speed: projectileKind === "arrow" ? 820 : 940,
          width: projectileKind === "arrow" ? 22 : 18,
        });
        this.drawMuzzleFlash(direction, definition.skill.color);
      },
    });
  }

  private castChainSkill(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const range = this.getAdjustedSkillRange(definition.skill.range);
    const damage = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    const targets = this.getActiveMonsters()
      .filter(
        (monster) =>
          Phaser.Math.Distance.Between(
            this.player!.x,
            this.player!.y,
            monster.x,
            monster.y,
          ) <= range,
      )
      .sort(
        (first, second) =>
          Phaser.Math.Distance.Between(
            this.player!.x,
            this.player!.y,
            first.x,
            first.y,
          ) -
          Phaser.Math.Distance.Between(
            this.player!.x,
            this.player!.y,
            second.x,
            second.y,
          ),
      )
      .slice(0, 5);
    let startX = this.player.x;
    let startY = this.player.y;

    for (const target of targets) {
      if (!this.hasClearAttackPath(startX, startY, target.x, target.y)) {
        continue;
      }
      this.drawSkillLine(
        startX,
        startY,
        target.x,
        target.y,
        definition.skill.color,
        6,
      );
      target.setData(
        "stunUntil",
        this.time.now + (definition.skill.stunMs ?? 0),
      );
      this.damageMonster(target, damage);
      startX = target.x;
      startY = target.y;
    }
  }

  private castHookSkill(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const direction = this.getFacingVector().normalize();
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const damage = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    this.launchSkillProjectile({
      color: definition.skill.color,
      damage,
      direction,
      kind: "hook",
      maxHits: 1,
      onHit: (target) => {
        if (!this.player || !target.active) {
          return;
        }
        this.tweens.add({
          targets: target,
          x: this.player.x + direction.x * 82,
          y: this.player.y + direction.y * 82,
          duration: 260,
        });
      },
      range,
      speed: 620,
      stunMs: definition.skill.stunMs ?? 0,
      width: 44,
    });
  }

  private castTornadoSkill(definition: RpgClassDefinition) {
    if (!this.player) {
      return;
    }

    const startX = this.player.x;
    const startY = this.player.y;
    const direction = this.getFacingVector().normalize();
    const range = this.getAdjustedSkillRange(definition.skill.range);
    const damage = this.getAdjustedCombatDamage(
      definition.skill.power,
      true,
    );
    const end = this.clipAttackLine(
      startX,
      startY,
      startX + direction.x * range,
      startY + direction.y * range,
    );
    const endX = end.x;
    const endY = end.y;
    const tornado = this.add
      .circle(startX, startY, 46, definition.skill.color, 0.28)
      .setStrokeStyle(6, definition.skill.color, 0.9)
      .setDepth(this.player.y + 60);
    this.tweens.add({
      targets: tornado,
      x: endX,
      y: endY,
      angle: 1_080,
      scaleX: 1.7,
      scaleY: 2.2,
      alpha: 0,
      duration: definition.skill.durationMs ?? 2_600,
      onComplete: () => tornado.destroy(),
    });
    this.time.addEvent({
      delay: 390,
      repeat: 5,
      callback: () => {
        if (!tornado.active) {
          return;
        }
        this.damageMonstersInRadius(
          tornado.x,
          tornado.y,
          108,
          damage,
        );
        this.drawTornadoRing(
          tornado.x,
          tornado.y,
          definition.skill.color,
        );
      },
    });
  }

  private updateClassSkillEffects(time: number, paused: boolean) {
    if (!this.player || paused || time >= this.skillDashUntil) {
      if (paused) {
        this.skillDashUntil = 0;
      }
      return;
    }

    if (time < this.nextSkillDashDamageAt) {
      return;
    }
    this.nextSkillDashDamageAt = time + 110;
    this.damageMonstersInRadius(
      this.player.x,
      this.player.y,
      this.skillDashRange,
      this.skillDashDamage,
      this.skillDashStunMs,
    );
    const isAssassinDash =
      this.activePlayerClassId === "assassin" ||
      this.activePlayerClassId === "daggerist";
    if (isAssassinDash) {
      this.drawDashSlash(
        this.player.x,
        this.player.y,
        this.skillDashColor,
        this.skillDashRange,
      );
      return;
    }
    const pulse = this.add
      .circle(
        this.player.x,
        this.player.y,
        this.skillDashRange * 0.45,
        this.skillDashColor,
        0.2,
      )
      .setDepth(this.player.y + 2);
    this.tweens.add({
      targets: pulse,
      alpha: 0,
      scale: 1.65,
      duration: 180,
      onComplete: () => pulse.destroy(),
    });
  }

  private getAdjustedSkillRange(range: number) {
    const relicBonuses = getRpgRelicBonuses(
      useGameStore.getState().rpgRelicLevels,
    );
    return range * (1 + relicBonuses.attackRangePercent / 100);
  }

  private getAdjustedCombatDamage(baseDamage: number, isSkill: boolean) {
    const state = useGameStore.getState();
    const relicBonuses = getRpgRelicBonuses(state.rpgRelicLevels);
    const equipment = Object.values(state.rpgEquippedItems)
      .map((equipmentId) => getRpgEquipment(equipmentId))
      .filter((item) => Boolean(item));
    const equipmentDamage = equipment.reduce(
      (total, item) => total + (item?.stats.attackDamage ?? 0),
      0,
    );
    const equipmentCriticalChance = equipment.reduce(
      (total, item) => total + (item?.stats.criticalChance ?? 0),
      0,
    );
    let damage =
      (baseDamage + equipmentDamage) *
      (1 + relicBonuses.attackPercent / 100);
    if (isSkill) {
      damage *= 1 + relicBonuses.skillDamagePercent / 100;
    }
    if (
      Math.random() <
      (relicBonuses.criticalChancePercent + equipmentCriticalChance) / 100
    ) {
      damage *= 1.5 + relicBonuses.criticalDamagePercent / 100;
    }
    damage *= getRpgWeaponEnhancementMultiplier(
      state.rpgWeaponEnhancementLevel,
    );
    return Math.max(1, Math.round(damage));
  }

  private hasClearAttackPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) {
    const line = new Phaser.Geom.Line(startX, startY, endX, endY);
    return !this.combatBlockers.some((blocker) =>
      Phaser.Geom.Intersects.LineToRectangle(line, blocker),
    );
  }

  private clipAttackLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) {
    const steps = 72;
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const x = Phaser.Math.Linear(startX, endX, progress);
      const y = Phaser.Math.Linear(startY, endY, progress);
      if (
        this.combatBlockers.some((blocker) =>
          Phaser.Geom.Rectangle.Contains(blocker, x, y),
        )
      ) {
        const safeProgress = Math.max(0, (step - 1) / steps);
        return {
          x: Phaser.Math.Linear(startX, endX, safeProgress),
          y: Phaser.Math.Linear(startY, endY, safeProgress),
        };
      }
    }
    return { x: endX, y: endY };
  }

  private getActiveMonsters() {
    return ((this.monsters?.getChildren() ?? []) as Phaser.Physics.Arcade.Sprite[])
      .filter((monster) => monster.active && !monster.getData("defeated"));
  }

  private getMonstersInLine(
    direction: Phaser.Math.Vector2,
    range: number,
    width: number,
  ) {
    if (!this.player) {
      return [];
    }
    return this.getActiveMonsters()
      .map((monster) => {
        const offsetX = monster.x - this.player!.x;
        const offsetY = monster.y - this.player!.y;
        const projection =
          offsetX * direction.x + offsetY * direction.y;
        const perpendicular = Math.abs(
          offsetX * direction.y - offsetY * direction.x,
        );
        return { monster, perpendicular, projection };
      })
      .filter(
        ({ monster, perpendicular, projection }) =>
          projection >= 0 &&
          projection <= range &&
          perpendicular <= width &&
          this.hasClearAttackPath(
            this.player!.x,
            this.player!.y,
            monster.x,
            monster.y,
          ),
      )
      .sort((first, second) => first.projection - second.projection)
      .map(({ monster }) => monster);
  }

  private damageMonstersInRadius(
    x: number,
    y: number,
    range: number,
    damage: number,
    stunMs = 0,
  ) {
    for (const monster of this.getActiveMonsters()) {
      if (
        Phaser.Math.Distance.Between(x, y, monster.x, monster.y) > range ||
        !this.hasClearAttackPath(x, y, monster.x, monster.y)
      ) {
        continue;
      }
      if (stunMs > 0) {
        monster.setData("stunUntil", this.time.now + stunMs);
      }
      this.damageMonster(monster, damage);
    }
  }

  private drawSkillLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: number,
    width: number,
    duration = 260,
  ) {
    const clippedEnd = this.clipAttackLine(startX, startY, endX, endY);
    const beam = this.add.graphics().setDepth(2_100);
    beam.lineStyle(width + 5, color, 0.16);
    beam.lineBetween(startX, startY, clippedEnd.x, clippedEnd.y);
    beam.lineStyle(width, color, 0.92);
    beam.lineBetween(startX, startY, clippedEnd.x, clippedEnd.y);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration,
      onComplete: () => beam.destroy(),
    });
  }

  private launchSkillProjectile({
    color,
    damage,
    direction,
    kind,
    maxHits,
    onComplete,
    onHit,
    range,
    speed,
    stunMs = 0,
    visualScale = 1,
    width,
  }: {
    color: number;
    damage: number;
    direction: Phaser.Math.Vector2;
    kind: SkillProjectileKind;
    maxHits: number;
    onComplete?: (x: number, y: number) => void;
    onHit?: (monster: Phaser.Physics.Arcade.Sprite) => void;
    range: number;
    speed: number;
    stunMs?: number;
    visualScale?: number;
    width: number;
  }) {
    if (!this.player) {
      return;
    }

    const normalizedDirection = direction.clone().normalize();
    const startX = this.player.x + normalizedDirection.x * 24;
    const startY = this.player.y + normalizedDirection.y * 24;
    const unclippedEndX = this.player.x + normalizedDirection.x * range;
    const unclippedEndY = this.player.y + normalizedDirection.y * range;
    const clippedEnd = this.clipAttackLine(
      this.player.x,
      this.player.y,
      unclippedEndX,
      unclippedEndY,
    );
    const availableRange = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      clippedEnd.x,
      clippedEnd.y,
    );
    const targets = this.getMonstersInLine(
      normalizedDirection,
      availableRange,
      width,
    ).slice(0, maxHits);
    const firstTarget = maxHits === 1 ? targets[0] : undefined;
    const endX = firstTarget?.x ?? clippedEnd.x;
    const endY = firstTarget?.y ?? clippedEnd.y;
    const travelDistance = Phaser.Math.Distance.Between(
      startX,
      startY,
      endX,
      endY,
    );
    const duration = Math.max(120, (travelDistance / speed) * 1_000);
    const projectile = this.createSkillProjectileGraphic(kind, color)
      .setPosition(startX, startY)
      .setScale(visualScale)
      .setAngle(Phaser.Math.RadToDeg(normalizedDirection.angle()))
      .setDepth(Math.max(startY, endY) + 2_100);
    const rope =
      kind === "hook"
        ? this.add.graphics().setDepth(projectile.depth - 1)
        : undefined;

    for (const target of targets) {
      const projection =
        (target.x - this.player.x) * normalizedDirection.x +
        (target.y - this.player.y) * normalizedDirection.y;
      const hitDelay = Math.max(
        35,
        Math.min(duration, (projection / speed) * 1_000),
      );
      this.time.delayedCall(hitDelay, () => {
        if (!target.active || target.getData("defeated")) {
          return;
        }
        if (stunMs > 0) {
          target.setData("stunUntil", this.time.now + stunMs);
        }
        this.damageMonster(target, damage);
        onHit?.(target);
        this.drawSkillImpact(target.x, target.y, color, kind === "shuriken" ? 30 : 20);
      });
    }

    this.tweens.add({
      targets: projectile,
      x: endX,
      y: endY,
      angle:
        kind === "shuriken"
          ? projectile.angle + 1_080
          : projectile.angle,
      duration,
      ease: "Linear",
      onUpdate: () => {
        if (!rope || !this.player) {
          return;
        }
        rope.clear();
        rope.lineStyle(3, color, 0.72);
        rope.lineBetween(
          this.player.x,
          this.player.y,
          projectile.x,
          projectile.y,
        );
      },
      onComplete: () => {
        this.drawSkillImpact(endX, endY, color, kind === "shuriken" ? 34 : 22);
        onComplete?.(endX, endY);
        rope?.destroy();
        projectile.destroy();
      },
    });
  }

  private createSkillProjectileGraphic(
    kind: SkillProjectileKind,
    color: number,
  ) {
    const graphic = this.add.graphics();
    graphic.lineStyle(3, color, 1);
    graphic.fillStyle(color, 1);

    if (kind === "shuriken") {
      graphic.fillTriangle(0, -22, 6, -5, -6, -5);
      graphic.fillTriangle(22, 0, 5, 6, 5, -6);
      graphic.fillTriangle(0, 22, -6, 5, 6, 5);
      graphic.fillTriangle(-22, 0, -5, -6, -5, 6);
      graphic.fillStyle(0x1a1422, 1);
      graphic.fillCircle(0, 0, 7);
      graphic.lineStyle(2, 0xf2e8ff, 0.9);
      graphic.strokeCircle(0, 0, 4);
      return graphic;
    }

    if (kind === "spear") {
      graphic.lineStyle(5, 0x8a5b2f, 1);
      graphic.lineBetween(-30, 0, 16, 0);
      graphic.fillStyle(color, 1);
      graphic.fillTriangle(14, -8, 34, 0, 14, 8);
      graphic.lineStyle(2, 0xffffff, 0.8);
      graphic.lineBetween(17, -3, 29, 0);
      return graphic;
    }

    if (kind === "hook") {
      graphic.lineStyle(4, 0xd8caa2, 1);
      graphic.lineBetween(-18, 0, 8, 0);
      graphic.lineBetween(8, 0, 18, -10);
      graphic.lineBetween(8, 0, 18, 10);
      graphic.fillStyle(color, 1);
      graphic.fillCircle(7, 0, 4);
      return graphic;
    }

    if (kind === "bullet") {
      graphic.fillStyle(0xfff0a6, 1);
      graphic.fillRect(-8, -3, 16, 6);
      graphic.fillStyle(color, 0.9);
      graphic.fillCircle(8, 0, 5);
      graphic.lineStyle(3, color, 0.38);
      graphic.lineBetween(-22, 0, -8, 0);
      return graphic;
    }

    if (kind === "orb") {
      graphic.fillStyle(color, 0.2);
      graphic.fillCircle(0, 0, 18);
      graphic.fillStyle(color, 0.92);
      graphic.fillCircle(0, 0, 11);
      graphic.fillStyle(0xffffff, 0.9);
      graphic.fillCircle(-3, -3, 4);
      graphic.lineStyle(3, 0xffffff, 0.72);
      graphic.strokeCircle(0, 0, 14);
      return graphic;
    }

    if (kind === "potion") {
      graphic.fillStyle(0xd9c6a5, 1);
      graphic.fillRect(-4, -14, 8, 7);
      graphic.fillStyle(color, 0.92);
      graphic.fillRoundedRect(-10, -8, 20, 24, 6);
      graphic.lineStyle(3, 0xeaffcf, 0.9);
      graphic.strokeRoundedRect(-10, -8, 20, 24, 6);
      return graphic;
    }

    graphic.lineStyle(3, 0xd7c69d, 1);
    graphic.lineBetween(-22, 0, 13, 0);
    graphic.fillStyle(color, 1);
    graphic.fillTriangle(12, -6, 26, 0, 12, 6);
    graphic.fillTriangle(-21, 0, -12, -7, -12, 0);
    graphic.fillTriangle(-21, 0, -12, 7, -12, 0);
    return graphic;
  }

  private drawSkillImpact(
    x: number,
    y: number,
    color: number,
    radius: number,
  ) {
    const ring = this.add
      .circle(x, y, Math.max(8, radius * 0.45), color, 0.2)
      .setStrokeStyle(3, color, 0.92)
      .setDepth(y + 2_120);
    const spark = this.add.graphics().setPosition(x, y).setDepth(ring.depth + 1);
    spark.lineStyle(3, color, 0.9);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      spark.lineBetween(
        Math.cos(angle) * 6,
        Math.sin(angle) * 6,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
      );
    }
    this.tweens.add({
      targets: [ring, spark],
      alpha: 0,
      scale: 1.6,
      duration: 220,
      onComplete: () => {
        ring.destroy();
        spark.destroy();
      },
    });
  }

  private drawShadowTrail(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: number,
  ) {
    const trail = this.add.graphics().setDepth(2_050);
    trail.lineStyle(18, color, 0.12);
    trail.lineBetween(startX, startY, endX, endY);
    trail.lineStyle(3, color, 0.72);
    trail.lineBetween(startX, startY, endX, endY);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 260,
      onComplete: () => trail.destroy(),
    });
  }

  private drawDashSlash(
    x: number,
    y: number,
    color: number,
    range: number,
  ) {
    const slash = this.add.graphics().setPosition(x, y).setDepth(y + 2_115);
    const size = Math.max(34, range * 0.38);
    slash.lineStyle(9, color, 0.16);
    slash.lineBetween(-size, -size * 0.7, size, size * 0.7);
    slash.lineBetween(-size, size * 0.7, size, -size * 0.7);
    slash.lineStyle(3, 0xffffff, 0.9);
    slash.lineBetween(-size, -size * 0.7, size, size * 0.7);
    slash.lineBetween(-size, size * 0.7, size, -size * 0.7);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.35,
      duration: 190,
      onComplete: () => slash.destroy(),
    });
  }

  private updateBrawlerPunch(time: number, paused: boolean) {
    if (!this.player || this.brawlerPunchUntil <= 0) {
      return;
    }

    if (paused) {
      this.brawlerPunchUntil = 0;
      this.dashUntil = 0;
      return;
    }

    if (!this.brawlerPunchDidHit && time >= this.brawlerPunchImpactAt) {
      this.brawlerPunchDidHit = true;
      const targetX = this.player.x + this.dashDirection.x * 54;
      const targetY = this.player.y + this.dashDirection.y * 54;
      this.damageMonstersInRadius(
        targetX,
        targetY,
        this.brawlerPunchRange,
        this.brawlerPunchDamage,
        this.brawlerPunchStunMs,
      );
      this.drawSkillLine(
        this.player.x,
        this.player.y,
        targetX + this.dashDirection.x * this.brawlerPunchRange,
        targetY + this.dashDirection.y * this.brawlerPunchRange,
        0xff9d4d,
        18,
        210,
      );
      this.drawSkillImpact(
        targetX,
        targetY,
        0xff9d4d,
        Math.max(42, this.brawlerPunchRange * 0.72),
      );
      this.cameras.main.shake(135, 0.007);
    }

    if (time >= this.brawlerPunchUntil) {
      if (!this.brawlerPunchDidHit) {
        this.brawlerPunchImpactAt = time;
        this.updateBrawlerPunch(time, false);
      }
      this.brawlerPunchUntil = 0;
    }
  }

  private drawStaffCast(direction: Phaser.Math.Vector2, color: number) {
    if (!this.player) {
      return;
    }

    const angle = Phaser.Math.RadToDeg(direction.angle());
    const staff = this.add
      .graphics()
      .setPosition(
        this.player.x + direction.x * 26,
        this.player.y + direction.y * 26,
      )
      .setAngle(angle)
      .setDepth(this.player.depth + 2);
    staff.lineStyle(6, 0x8a5a32, 1);
    staff.lineBetween(-22, 0, 18, 0);
    staff.fillStyle(color, 0.95);
    staff.fillCircle(22, 0, 8);
    staff.lineStyle(3, 0xffffff, 0.75);
    staff.strokeCircle(22, 0, 11);
    this.tweens.add({
      targets: staff,
      alpha: 0,
      scaleX: 1.12,
      duration: 240,
      onComplete: () => staff.destroy(),
    });
  }

  private drawFallingIcicle(
    x: number,
    y: number,
    color: number,
    onImpact: () => void,
  ) {
    const icicle = this.add
      .graphics()
      .setPosition(x, y - 190)
      .setDepth(y + 2_130);
    icicle.fillStyle(color, 0.94);
    icicle.fillTriangle(-15, -40, 15, -40, 0, 34);
    icicle.lineStyle(3, 0xf0feff, 0.9);
    icicle.lineBetween(-7, -31, 0, 25);
    const shadow = this.add
      .ellipse(x, y, 62, 24, 0x6ddff7, 0.24)
      .setStrokeStyle(2, color, 0.72)
      .setDepth(y + 1);
    this.tweens.add({
      targets: shadow,
      alpha: 0.62,
      scaleX: 0.42,
      scaleY: 0.42,
      duration: 320,
    });
    this.tweens.add({
      targets: icicle,
      y,
      duration: 320,
      ease: "Quad.easeIn",
      onComplete: () => {
        onImpact();
        icicle.destroy();
        this.tweens.add({
          targets: shadow,
          alpha: 0,
          scale: 1.35,
          duration: 220,
          onComplete: () => shadow.destroy(),
        });
      },
    });
  }

  private drawLightningStrike(x: number, y: number, color: number) {
    const bolt = this.add.graphics().setDepth(y + 2_140);
    const topY = y - 250;
    const points = [
      new Phaser.Math.Vector2(x + 18, topY),
      new Phaser.Math.Vector2(x - 14, topY + 55),
      new Phaser.Math.Vector2(x + 16, topY + 105),
      new Phaser.Math.Vector2(x - 10, topY + 160),
      new Phaser.Math.Vector2(x, y),
    ];
    bolt.lineStyle(15, color, 0.18);
    bolt.strokePoints(points, false);
    bolt.lineStyle(6, color, 0.95);
    bolt.strokePoints(points, false);
    bolt.lineStyle(2, 0xffffff, 1);
    bolt.strokePoints(points, false);
    this.cameras.main.flash(90, 245, 242, 160, false);
    this.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 300,
      onComplete: () => bolt.destroy(),
    });
  }

  private drawElectricPulse(
    x: number,
    y: number,
    color: number,
    radius: number,
    pulse: number,
  ) {
    const arc = this.add.graphics().setPosition(x, y).setDepth(y + 2_120);
    arc.lineStyle(4, color, 0.82);
    for (let index = 0; index < 7; index += 1) {
      const angle = (Math.PI * 2 * index) / 7 + pulse * 0.28;
      const inner = radius * 0.2;
      const outer = radius * (0.64 + (index % 2) * 0.18);
      arc.lineBetween(
        Math.cos(angle) * inner,
        Math.sin(angle) * inner,
        Math.cos(angle + 0.13) * outer,
        Math.sin(angle + 0.13) * outer,
      );
    }
    this.tweens.add({
      targets: arc,
      alpha: 0,
      scale: 1.25,
      duration: 260,
      onComplete: () => arc.destroy(),
    });
  }

  private throwPoisonBottle(
    targetX: number,
    targetY: number,
    color: number,
    onBreak: () => void,
  ) {
    if (!this.player) {
      return;
    }

    const startX = this.player.x;
    const startY = this.player.y;
    const bottle = this.createSkillProjectileGraphic("potion", color)
      .setPosition(startX, startY - 12)
      .setDepth(Math.max(startY, targetY) + 2_130);
    const travel = { progress: 0 };
    this.tweens.add({
      targets: travel,
      progress: 1,
      duration: 520,
      ease: "Linear",
      onUpdate: () => {
        const progress = travel.progress;
        bottle
          .setPosition(
            Phaser.Math.Linear(startX, targetX, progress),
            Phaser.Math.Linear(startY, targetY, progress) -
              Math.sin(progress * Math.PI) * 105,
          )
          .setAngle(progress * 540);
      },
      onComplete: () => {
        bottle.destroy();
        this.drawSkillImpact(targetX, targetY, color, 54);
        onBreak();
      },
    });
  }

  private drawMuzzleFlash(direction: Phaser.Math.Vector2, color: number) {
    if (!this.player) {
      return;
    }
    const flash = this.add
      .graphics()
      .setPosition(
        this.player.x + direction.x * 34,
        this.player.y + direction.y * 34,
      )
      .setAngle(Phaser.Math.RadToDeg(direction.angle()))
      .setDepth(this.player.depth + 2);
    flash.fillStyle(0xfff3a6, 0.95);
    flash.fillTriangle(0, -7, 22, 0, 0, 7);
    flash.fillStyle(color, 0.82);
    flash.fillTriangle(3, -4, 31, 0, 3, 4);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.7,
      duration: 105,
      onComplete: () => flash.destroy(),
    });
  }

  private drawRuneBurst(
    x: number,
    y: number,
    color: number,
    range: number,
  ) {
    const rune = this.add.graphics().setPosition(x, y).setDepth(y + 2);
    rune.lineStyle(3, color, 0.75);
    rune.strokeCircle(0, 0, range * 0.34);
    rune.strokeCircle(0, 0, range * 0.58);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      rune.lineBetween(
        Math.cos(angle) * range * 0.22,
        Math.sin(angle) * range * 0.22,
        Math.cos(angle) * range * 0.62,
        Math.sin(angle) * range * 0.62,
      );
    }
    this.tweens.add({
      targets: rune,
      angle: 90,
      alpha: 0,
      scale: 1.18,
      duration: 520,
      onComplete: () => rune.destroy(),
    });
  }

  private drawMeteorFall(
    x: number,
    y: number,
    color: number,
    range: number,
  ) {
    const meteor = this.add
      .graphics()
      .setPosition(x + 48, y - Math.min(210, range))
      .setDepth(y + 2_130);
    meteor.fillStyle(0xffd75a, 0.9);
    meteor.fillTriangle(-8, -42, 8, -42, 2, -8);
    meteor.fillStyle(color, 1);
    meteor.fillCircle(0, 0, 18);
    meteor.fillStyle(0x4b241d, 1);
    meteor.fillCircle(4, 4, 10);
    this.tweens.add({
      targets: meteor,
      x,
      y,
      angle: 160,
      duration: 280,
      ease: "Quad.easeIn",
      onComplete: () => meteor.destroy(),
    });
  }

  private drawIceSpikes(
    x: number,
    y: number,
    color: number,
    range: number,
  ) {
    for (let index = 0; index < 7; index += 1) {
      const angle = (Math.PI * 2 * index) / 7;
      const distance = range * (0.25 + (index % 3) * 0.12);
      const spike = this.add
        .graphics()
        .setPosition(
          x + Math.cos(angle) * distance,
          y + Math.sin(angle) * distance - 38,
        )
        .setDepth(y + Math.sin(angle) * distance + 2_090);
      spike.fillStyle(color, 0.92);
      spike.fillTriangle(-10, 32, 0, -20, 10, 32);
      spike.lineStyle(2, 0xe8fdff, 0.9);
      spike.lineBetween(0, -17, 0, 24);
      this.tweens.add({
        targets: spike,
        y: spike.y + 38,
        alpha: 0,
        duration: 560,
        ease: "Back.easeOut",
        onComplete: () => spike.destroy(),
      });
    }
  }

  private drawPoisonField(
    x: number,
    y: number,
    color: number,
    range: number,
    duration: number,
  ) {
    for (let index = 0; index < 9; index += 1) {
      const angle = (Math.PI * 2 * index) / 9;
      const distance = range * (0.16 + (index % 4) * 0.11);
      const bubble = this.add
        .circle(
          x + Math.cos(angle) * distance,
          y + Math.sin(angle) * distance,
          7 + (index % 3) * 3,
          color,
          0.36,
        )
        .setStrokeStyle(2, 0xd7ffb3, 0.58)
        .setDepth(y + Math.sin(angle) * distance + 5);
      this.tweens.add({
        targets: bubble,
        y: bubble.y - 28 - (index % 3) * 8,
        alpha: 0,
        scale: 1.45,
        duration: Math.min(duration, 760 + index * 90),
        repeat: Math.max(0, Math.floor(duration / 1_200) - 1),
        onComplete: () => bubble.destroy(),
      });
    }
  }

  private drawGroundFracture(
    x: number,
    y: number,
    color: number,
    range: number,
  ) {
    const crack = this.add.graphics().setPosition(x, y).setDepth(y + 4);
    for (let index = 0; index < 9; index += 1) {
      const angle = (Math.PI * 2 * index) / 9;
      const inner = range * 0.12;
      const outer = range * (0.46 + (index % 3) * 0.12);
      crack.lineStyle(index % 2 === 0 ? 5 : 3, color, 0.78);
      crack.lineBetween(
        Math.cos(angle) * inner,
        Math.sin(angle) * inner,
        Math.cos(angle + 0.08) * outer,
        Math.sin(angle + 0.08) * outer,
      );
    }
    this.tweens.add({
      targets: crack,
      alpha: 0,
      duration: 680,
      onComplete: () => crack.destroy(),
    });
  }

  private drawTornadoRing(x: number, y: number, color: number) {
    const ring = this.add.graphics().setPosition(x, y).setDepth(y + 2_100);
    ring.lineStyle(5, color, 0.72);
    ring.strokeEllipse(0, 0, 94, 34);
    ring.lineStyle(2, 0xe9fdff, 0.76);
    ring.strokeEllipse(0, -16, 62, 24);
    this.tweens.add({
      targets: ring,
      angle: 150,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.72,
      duration: 360,
      onComplete: () => ring.destroy(),
    });
  }

  private updateSpinAttack(time: number, paused: boolean) {
    if (!this.player || time >= this.spinUntil || paused) {
      this.finishSpinAttack();
      return;
    }
    const angle =
      ((this.spinUntil - time) / this.spinDuration) * -1_440;
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
      for (const monster of (this.monsters?.getChildren() ??
        []) as Phaser.Physics.Arcade.Sprite[]) {
        if (
          monster.active &&
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            monster.x,
            monster.y,
          ) <= this.spinRange &&
          this.hasClearAttackPath(
            this.player.x,
            this.player.y,
            monster.x,
            monster.y,
          )
        ) {
          this.damageMonster(monster, this.spinDamage);
        }
      }
    }
  }

  private finishSpinAttack() {
    this.spinUntil = 0;
    this.player?.setAngle(0);
    this.spinSword?.destroy();
    this.spinSword = undefined;
  }

  private getFacingVector() {
    if (this.aimDirection.lengthSq() > 0) {
      return this.aimDirection.clone().normalize();
    }
    return {
      back: new Phaser.Math.Vector2(0, -1),
      front: new Phaser.Math.Vector2(0, 1),
      left: new Phaser.Math.Vector2(-1, 0),
      right: new Phaser.Math.Vector2(1, 0),
    }[this.playerFacing];
  }

  private handleEscapeCommand() {
    const state = useGameStore.getState();

    if (state.rpgJobSwitchOpen) {
      state.closeRpgJobSwitch();
    } else if (state.rpgBlacksmithOpen) {
      state.closeRpgBlacksmith();
    } else if (state.rpgShopOpen) {
      state.closeRpgShop();
    } else if (state.rpgDialogue) {
      state.closeRpgDialogue();
    } else if (state.npcDialogueOpen) {
      state.closeNpcDialogue();
    } else if (state.rpgCharacterSelectOpen && state.activeRpgCharacterId) {
      state.closeRpgCharacterSelect();
    }
  }

  private updateInteraction() {
    if (!this.player || !this.dialogue || !this.interactionPrompt) {
      return;
    }

    const state = useGameStore.getState();
    const camera = this.cameras.main;
    this.dialogue.setPosition(
      camera.width / 2,
      camera.height - DIALOGUE_BOTTOM_OFFSET,
    );
    this.interactionPrompt.setPosition(camera.width / 2, camera.height - 30);

    if (state.rpgStatus === "lost") {
      this.activeInteraction = undefined;
      this.dialogue.setVisible(false);
      this.interactionPrompt.setVisible(false);
      return;
    }

    if (this.isRpgModalOpen(state)) {
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

    if (interaction.id === "captain_aron") {
      state.setSelectedCell("JOB", '=JOB.SWITCH.CHECK("ARON")');
      if (state.openRpgJobSwitch()) {
        return;
      }

      const currentClass = getRpgClass(state.rpgClassId);
      const message =
        state.level < 30
          ? `아직 LV.${state.level}이군. 2차 직업 전환은 LV.30 이상부터 가능하네.`
          : currentClass.tier !== 2
            ? `현재 직업은 ${currentClass.name}이군. 먼저 2차 전직을 완료한 뒤 다시 찾아오게.`
            : "현재 플레이 중인 캐릭터를 확인할 수 없군. 용병 관리자 세라오스에게서 캐릭터를 선택해 주게.";
      this.showWorldMessage(
        interaction.name,
        message,
        interaction.portrait,
      );
      state.setSelectedCell("JOB", '=JOB.SWITCH.LOCKED("ARON")');
      return;
    }

    if (interaction.id === "blacksmith_bram") {
      state.setSelectedCell("FORGE", '=FORGE.OPEN("BLACKSMITH_BRAM")');
      state.openRpgBlacksmith();
      return;
    }

    if (interaction.id === "character_keeper") {
      state.setSelectedCell("ROSTER", '=CHARACTER.SELECT("SERAOS")');
      state.openRpgCharacterSelect();
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
    this.syncBackgroundMusic();
    this.applyCameraBoundsForCurrentMap();
    this.activeInteraction = undefined;
    this.player.setPosition(
      targetMap === "town" ? destination.centerX : destination.centerX - 350,
      destination.centerY + 120,
    );
    this.player.setVelocity(0, 0);
    this.playerShadow?.setPosition(this.player.x, this.player.y + 27);
    this.cameras.main.flash(
      360,
      isSnowRpgMap(targetMap) ? 180 : 92,
      isSnowRpgMap(targetMap) ? 235 : 72,
      isSnowRpgMap(targetMap) ? 255 : 130,
    );
    useGameStore
      .getState()
      .setSelectedCell("MAP", `=PORTAL.GOTO("${targetMap.toUpperCase()}")`);

    if (targetMap !== "town") {
      const map = this.getCurrentMapDefinition();
      if (map?.stage === 10) {
        resetRpgBossEncounter(
          map.id,
          map.monsters,
          this.defeatedBossMaps,
          this.defeatedBossKinds,
        );
        for (const zone of this.getCurrentMonsterZones()) {
          this.spawnMonsterFromZone(zone);
        }
      } else {
        const count = Math.min(10, 5 + (map?.stage ?? 1));
        for (let index = 0; index < count; index += 1) {
          this.spawnMonsterFromZone();
        }
      }
    }
    this.updateRegionLabel();
  }

  private getBackgroundMusicKey(): RpgBackgroundMusicKey {
    if (this.currentMap === "town") {
      return "town";
    }

    const map = this.getCurrentMapDefinition();
    if (map?.theme === "snow" || map?.theme === "wolf") {
      return map.stage === 10 ? "snowBoss" : "snow";
    }
    return map?.stage === 10 ? "caveBoss" : "cave";
  }

  private syncBackgroundMusic() {
    this.syncSnowAmbience();
    const key = this.getBackgroundMusicKey();
    if (this.backgroundMusicKey === key && this.backgroundMusic) {
      if (!this.backgroundMusic.isPlaying && !this.sound.locked) {
        this.backgroundMusic.play();
      }
      return;
    }

    this.stopBackgroundMusic();
    const music = this.sound.add(`rpg-bgm-${key}`, {
      loop: true,
      volume: 0.42,
    });
    this.backgroundMusic = music;
    this.backgroundMusicKey = key;

    const playCurrentMusic = () => {
      this.musicUnlockHandler = undefined;
      if (
        this.sys.isActive() &&
        this.backgroundMusic === music &&
        !music.isPlaying
      ) {
        music.play();
      }
    };
    if (this.sound.locked) {
      this.musicUnlockHandler = playCurrentMusic;
      this.sound.once(Phaser.Sound.Events.UNLOCKED, playCurrentMusic);
    } else {
      playCurrentMusic();
    }
  }

  private handleAudioActivation() {
    const soundManager = this.sound as Phaser.Sound.BaseSoundManager & {
      context?: AudioContext;
    };
    const startCurrentMusic = () => {
      if (!this.sys.isActive()) {
        return;
      }
      if (!this.backgroundMusic) {
        this.syncBackgroundMusic();
      } else if (!this.backgroundMusic.isPlaying) {
        this.backgroundMusic.play();
      }
      this.syncSnowAmbience();
    };

    if (soundManager.context?.state === "suspended") {
      void soundManager.context.resume().then(startCurrentMusic, () => undefined);
    } else {
      startCurrentMusic();
    }
  }

  private stopBackgroundMusic() {
    if (this.musicUnlockHandler) {
      this.sound.off(Phaser.Sound.Events.UNLOCKED, this.musicUnlockHandler);
      this.musicUnlockHandler = undefined;
    }
    this.backgroundMusic?.stop();
    this.backgroundMusic?.destroy();
    this.backgroundMusic = undefined;
    this.backgroundMusicKey = undefined;
  }

  private syncSnowAmbience() {
    if (!isSnowRpgMap(this.currentMap)) {
      this.stopRpgSfxChannel("snowAmbience");
      return;
    }

    const activeAmbience = this.activeRpgSfxChannels.get("snowAmbience");
    if (activeAmbience) {
      if (
        activeAmbience.sound &&
        !activeAmbience.sound.isPlaying &&
        !activeAmbience.sound.isPaused &&
        !this.sound.locked
      ) {
        activeAmbience.sound.play();
      }
      return;
    }

    this.playRpgSfx("snowAmbience", "snowAmbience", {
      loop: true,
      volume: 0.24,
    });
  }

  private syncRpgSfxLifetimes(time: number, controlsPaused: boolean) {
    if (controlsPaused) {
      this.stopRpgSfxChannel("playerAttack");
      this.stopRpgSfxChannel("playerSkill");
      this.stopRpgSfxChannel("bossSkill");
      return;
    }
    if (time >= this.attackAnimationUntil) {
      this.stopRpgSfxChannel("playerAttack");
    }
    if (time >= this.classSkillUntil) {
      this.stopRpgSfxChannel("playerSkill");
    }
  }

  private handleRpgSfxRequest = (event: Event) => {
    const detail = (event as CustomEvent<RpgSfxRequestDetail | undefined>)
      .detail;
    if (!detail || detail.key !== "blacksmithEnhance" || !isRpgSfxKey(detail.key)) {
      return;
    }
    this.playRpgSfx(detail.key, "blacksmith", {
      maxDurationMs: detail.maxDurationMs,
      volume: detail.volume ?? 0.55,
    });
  };

  private playRpgSfx(
    key: RpgSfxKey,
    channel: RpgSfxChannel,
    options: {
      loop?: boolean;
      maxDurationMs?: number;
      owner?: Phaser.Physics.Arcade.Sprite;
      seekSeconds?: number;
      volume?: number;
    } = {},
  ) {
    const maxDurationMs =
      typeof options.maxDurationMs === "number" &&
      Number.isFinite(options.maxDurationMs)
        ? Math.max(0, options.maxDurationMs)
        : undefined;
    this.stopRpgSfxChannel(channel);
    if (maxDurationMs === 0) {
      return;
    }
    const volume = Phaser.Math.Clamp(options.volume ?? 0.46, 0, 1);
    if (this.sound.locked) {
      const requestedAt = Date.now();
      let disposed = false;
      const handleUnlocked = () => {
        if (disposed) {
          return;
        }
        const remainingDurationMs =
          maxDurationMs === undefined
            ? undefined
            : maxDurationMs - (Date.now() - requestedAt);
        cleanup();
        if (
          this.sys.isActive() &&
          (remainingDurationMs === undefined || remainingDurationMs > 0)
        ) {
          this.playRpgSfx(key, channel, {
            ...options,
            maxDurationMs: remainingDurationMs,
            volume,
          });
        }
      };
      const cleanup = () => {
        if (disposed) {
          return;
        }
        disposed = true;
        this.sound.off(Phaser.Sound.Events.UNLOCKED, handleUnlocked);
        if (this.activeRpgSfxChannels.get(channel)?.cleanup === cleanup) {
          this.activeRpgSfxChannels.delete(channel);
        }
      };
      this.activeRpgSfxChannels.set(channel, {
        cleanup,
        owner: options.owner,
      });
      this.sound.once(Phaser.Sound.Events.UNLOCKED, handleUnlocked);
      return;
    }

    const effect = this.sound.add(getRpgSfxAssetKey(key), {
      loop: options.loop ?? false,
      volume,
    });
    let disposed = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    const cleanup = () => {
      if (disposed) {
        return;
      }
      disposed = true;
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }
      effect.off(Phaser.Sound.Events.COMPLETE, cleanup);
      if (effect.isPlaying || effect.isPaused) {
        effect.stop();
      }
      if (!effect.pendingRemove) {
        effect.destroy();
      }
      if (this.activeRpgSfxChannels.get(channel)?.cleanup === cleanup) {
        this.activeRpgSfxChannels.delete(channel);
      }
    };
    this.activeRpgSfxChannels.set(channel, {
      cleanup,
      owner: options.owner,
      sound: effect,
    });
    effect.once(Phaser.Sound.Events.COMPLETE, cleanup);
    if (maxDurationMs !== undefined) {
      timeoutId = globalThis.setTimeout(cleanup, maxDurationMs);
    }
    const didPlay =
      typeof options.seekSeconds === "number" &&
      Number.isFinite(options.seekSeconds) &&
      options.seekSeconds > 0
        ? effect.play({ seek: options.seekSeconds })
        : effect.play();
    if (!didPlay) {
      cleanup();
    }
  }

  private stopRpgSfxChannel(channel: RpgSfxChannel) {
    this.activeRpgSfxChannels.get(channel)?.cleanup();
  }

  private stopAllRpgSfx() {
    for (const channel of [...this.activeRpgSfxChannels.keys()]) {
      this.stopRpgSfxChannel(channel);
    }
  }

  private clearActiveMonstersAndDrops() {
    this.stopRpgSfxChannel("bossSkill");
    this.clearBossSkillEffects();
    this.playerSlowUntil = 0;
    this.lastBossSkillDamageAt = 0;
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
    const equipmentRange = Object.values(state.rpgEquippedItems)
      .map((equipmentId) => getRpgEquipment(equipmentId)?.stats.attackRange ?? 0)
      .reduce((total, value) => total + value, 0);
    const attackDamage = this.getAdjustedCombatDamage(1, false);
    const attackRange = this.getAdjustedSkillRange(80 + equipmentRange);
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

      if (
        distance > attackRange ||
        !this.hasClearAttackPath(
          this.player.x,
          this.player.y,
          monster.x,
          monster.y,
        )
      ) {
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
    this.updateMonsterHealthBar(monster);
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
        this.isSnowMonster(kind)
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
    this.destroyMonsterHealthBar(monster);
    monster.disableBody(true, true);
    const rewardState = useGameStore.getState();
    const relicBonuses = getRpgRelicBonuses(
      rewardState.rpgRelicLevels,
    );
    rewardState.gainRpgExperience(
      Number(monster.getData("experience") ?? 10),
    );
    this.createDrop(
      "gold",
      dropX - 18,
      dropY,
      Math.max(
        1,
        Math.round(
          Number(monster.getData("rewardGold") ?? 2) *
            (1 + relicBonuses.goldPercent / 100),
        ),
      ),
    );
    if (relicBonuses.killHeal > 0) {
      rewardState.healRpgPlayer(relicBonuses.killHeal);
    }
    if (Math.random() < (definition.boss ? 1 : 0.2)) {
      this.createDrop("potion", dropX + 18, dropY + 4, 20);
    }
    const relic = rollRpgRelicDrop({
      boss: Boolean(definition.boss),
      theme:
        this.getCurrentMapDefinition()?.theme === "cave" ? "cave" : "snow",
    });
    if (relic) {
      this.createDrop("relic", dropX, dropY - 22, 1, relic.id);
    }
    if (
      kind === "slime" &&
      rewardState.rpgQuestStage === "defeat_slimes"
    ) {
      rewardState.defeatRpgSlime();
    }
    if (definition.boss) {
      if (this.activeRpgSfxChannels.get("bossSkill")?.owner === monster) {
        this.stopRpgSfxChannel("bossSkill");
      }
      this.clearBossSkillEffects();
      this.defeatedBossKinds.add(
        getRpgBossDefeatKey(this.currentMap, kind),
      );
      const map = this.getCurrentMapDefinition();
      const defeatedCount =
        map?.monsters.filter((bossKind) =>
          this.defeatedBossKinds.has(
            getRpgBossDefeatKey(this.currentMap, bossKind),
          ),
        ).length ?? 0;
      const bossCount = map?.monsters.length ?? 1;
      if (defeatedCount >= bossCount) {
        this.defeatedBossMaps.add(this.currentMap);
      }
      this.showPickupToast(
        defeatedCount >= bossCount
          ? `${map?.label ?? "BOSS MAP"} 정복 완료!`
          : `보스 격파 ${defeatedCount}/${bossCount} · 남은 위협을 처치하세요.`,
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
      .setDisplaySize(
        kind === "relic" ? 42 : kind === "gold" ? 30 : 24,
        kind === "relic" ? 42 : kind === "gold" ? 30 : 24,
      )
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
      this.isRpgModalOpen(state) ||
      now - this.lastContactDamageAt < 1100
    ) {
      return;
    }

    this.lastContactDamageAt = now;
    const monster = monsterObject as Phaser.Physics.Arcade.Sprite;
    const relicBonuses = getRpgRelicBonuses(state.rpgRelicLevels);
    const damage = Math.max(
      1,
      Math.round(
        Number(monster.getData("contactDamage") ?? 5) *
          (1 - relicBonuses.damageReductionPercent / 100),
      ),
    );
    state.damageRpgPlayer(damage);
    if (relicBonuses.retaliationDamage > 0) {
      this.damageMonstersInRadius(
        this.player?.x ?? 0,
        this.player?.y ?? 0,
        116,
        relicBonuses.retaliationDamage,
      );
    }
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
