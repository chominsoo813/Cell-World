import {
  getRpgClass,
  type RpgClassId,
} from "@/lib/rpgClasses";

export const RPG_SFX_ROOT = "/assets/audio/rpg/sfx";
export const RPG_BASIC_ATTACK_ACTIVE_MS = 280;
export const RPG_SFX_REQUEST_EVENT = "cell-world:rpg-sfx-request";

export const RPG_SFX_FILES = {
  adventurerBasicAttack: "basic-adventurer.mp3",
  commonBasicAttack: "basic-common.mp3",
  mageBasicAttack: "basic-mage.mp3",
  blacksmithEnhance: "blacksmith-enhance.mp3",
  snowAmbience: "ambience-snow.mp3",
  snowBossSkill: "boss-snow-skill.mp3",
  adventurerSkill: "skill-adventurer.mp3",
  archerSkill: "skill-archer.mp3",
  assassinSkill: "skill-assassin.mp3",
  bowSpecialistSkill: "skill-bow-specialists.mp3",
  brawlerSkill: "skill-brawler.mp3",
  daggeristSkill: "skill-daggerist.mp3",
  fireMageSkill: "skill-firemage.mp3",
  frostMageSkill: "skill-frostmage.mp3",
  gunslingerSkill: "skill-gunslinger.mp3",
  mageSkill: "skill-mage.mp3",
  ninjaSkill: "skill-ninja.mp3",
  plunderCaptainSkill: "skill-plunder-captain.mp3",
  stormCaptainSkill: "skill-storm-captain.mp3",
  stormMageSkill: "skill-stormmage.mp3",
  toxicMageSkill: "skill-toxicmage.mp3",
  warriorSkill: "skill-warrior.mp3",
  warriorSpecialistSkill: "skill-warrior-specialists.mp3",
} as const;

export type RpgSfxKey = keyof typeof RPG_SFX_FILES;

export interface RpgSfxRequestDetail {
  key: RpgSfxKey;
  maxDurationMs?: number;
  volume?: number;
}

const MAGE_BASIC_ATTACK_CLASSES = new Set<RpgClassId>([
  "mage",
  "firemage",
  "frostmage",
  "stormmage",
  "toxicmage",
]);

const RPG_BASIC_ATTACK_SEEK_SECONDS = {
  adventurerBasicAttack: 0.54,
  commonBasicAttack: 0.22,
  mageBasicAttack: 0,
} as const;

export interface RpgBasicAttackSfxPlayback {
  key: keyof typeof RPG_BASIC_ATTACK_SEEK_SECONDS;
  seekSeconds: number;
}

export const RPG_SKILL_SFX_BY_CLASS = {
  adventurer: "adventurerSkill",
  warrior: "warriorSkill",
  assassin: "assassinSkill",
  mage: "mageSkill",
  archer: "archerSkill",
  // A first-job pirate recording was not supplied. Its firearm barrage uses
  // the mechanically closest provided recording until a dedicated file exists.
  pirate: "gunslingerSkill",
  swordmaster: "warriorSpecialistSkill",
  greatsword: "warriorSpecialistSkill",
  spearman: "warriorSpecialistSkill",
  ninja: "ninjaSkill",
  daggerist: "daggeristSkill",
  brawler: "brawlerSkill",
  firemage: "fireMageSkill",
  frostmage: "frostMageSkill",
  stormmage: "stormMageSkill",
  toxicmage: "toxicMageSkill",
  longbow: "bowSpecialistSkill",
  crossbow: "bowSpecialistSkill",
  gunslinger: "gunslingerSkill",
  plunder_captain: "plunderCaptainSkill",
  storm_captain: "stormCaptainSkill",
} as const satisfies Readonly<Record<RpgClassId, RpgSfxKey>>;

export function getRpgSfxAssetKey(key: RpgSfxKey) {
  return `rpg-sfx-${key}`;
}

export function getRpgSfxAssetPath(key: RpgSfxKey) {
  return `${RPG_SFX_ROOT}/${RPG_SFX_FILES[key]}`;
}

export function isRpgSfxKey(value: unknown): value is RpgSfxKey {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(RPG_SFX_FILES, value)
  );
}

export function getRpgBasicAttackSfxKey(
  classId: RpgClassId,
): RpgBasicAttackSfxPlayback["key"] {
  if (classId === "adventurer") {
    return "adventurerBasicAttack";
  }
  return MAGE_BASIC_ATTACK_CLASSES.has(classId)
    ? "mageBasicAttack"
    : "commonBasicAttack";
}

export function getRpgBasicAttackSfxPlayback(
  classId: RpgClassId,
): RpgBasicAttackSfxPlayback {
  const key = getRpgBasicAttackSfxKey(classId);
  return {
    key,
    // The supplied adventurer and common recordings contain long leading
    // silence. Seek close to the first transient so the audible part fits in
    // the 280 ms basic-attack animation instead of being stopped beforehand.
    seekSeconds: RPG_BASIC_ATTACK_SEEK_SECONDS[key],
  };
}

export function getRpgSkillSfxKey(classId: RpgClassId): RpgSfxKey {
  return RPG_SKILL_SFX_BY_CLASS[classId];
}

export function getRpgSkillActivationDurationMs(classId: RpgClassId) {
  const definition = getRpgClass(classId);
  return definition.skill.effect === "barrage"
    ? 820
    : Math.max(460, definition.skill.durationMs ?? 620);
}

export function shouldPlayRpgEnhancementSfx(status: string) {
  return status === "success" || status === "failed";
}

export function isSnowRpgMap(mapId: string) {
  return /^(snow|wolf)-\d+$/.test(mapId);
}

export function isSnowRpgBoss(kind: string) {
  return (
    kind === "snowGiantBoss" ||
    kind === "snowWitchBoss" ||
    kind === "hellCerberus"
  );
}

export function dispatchRpgSfxRequest(detail: RpgSfxRequestDetail) {
  if (typeof window === "undefined") {
    return false;
  }
  window.dispatchEvent(
    new CustomEvent<RpgSfxRequestDetail>(RPG_SFX_REQUEST_EVENT, { detail }),
  );
  return true;
}
