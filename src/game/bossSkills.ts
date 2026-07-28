export type RpgBossKind =
  | "dragonBoss"
  | "snowGiantBoss"
  | "snowWitchBoss";

export type RpgBossSkillId =
  | "dragonBreath"
  | "dragonClaw"
  | "dragonDarkOrb"
  | "dragonTail"
  | "giantAvalancheRoar"
  | "giantBoulder"
  | "giantCharge"
  | "giantClubSweep"
  | "giantSlam"
  | "witchBlizzard"
  | "witchFrostNova"
  | "witchFrostVolley"
  | "witchMirrorBurst";

interface Point {
  x: number;
  y: number;
}

const BOSS_SKILL_ROTATIONS: Record<RpgBossKind, RpgBossSkillId[]> = {
  dragonBoss: [
    "dragonBreath",
    "dragonClaw",
    "dragonTail",
    "dragonDarkOrb",
  ],
  snowGiantBoss: [
    "giantCharge",
    "giantClubSweep",
    "giantBoulder",
    "giantSlam",
    "giantAvalancheRoar",
  ],
  snowWitchBoss: [
    "witchFrostVolley",
    "witchBlizzard",
    "witchFrostNova",
    "witchMirrorBurst",
  ],
};

const BOSS_BASE_COOLDOWNS: Record<RpgBossKind, number> = {
  dragonBoss: 2_800,
  snowGiantBoss: 3_200,
  snowWitchBoss: 2_500,
};

export function isRpgBossKind(kind: string): kind is RpgBossKind {
  return kind in BOSS_SKILL_ROTATIONS;
}

export function getBossSkillForCast(
  kind: RpgBossKind,
  castIndex: number,
) {
  const rotation = BOSS_SKILL_ROTATIONS[kind];
  return rotation[Math.abs(castIndex) % rotation.length];
}

export function getBossPhase(hp: number, maxHp: number) {
  if (maxHp <= 0) {
    return 1;
  }
  return hp / maxHp <= 0.5 ? 2 : 1;
}

export function getBossSkillCooldownMs(
  kind: RpgBossKind,
  hp: number,
  maxHp: number,
) {
  const phaseMultiplier = getBossPhase(hp, maxHp) === 2 ? 0.7 : 1;
  return Math.round(BOSS_BASE_COOLDOWNS[kind] * phaseMultiplier);
}

export function isPointInCone(
  origin: Point,
  point: Point,
  direction: Point,
  range: number,
  halfAngleRadians: number,
) {
  const offsetX = point.x - origin.x;
  const offsetY = point.y - origin.y;
  const distance = Math.hypot(offsetX, offsetY);
  const directionLength = Math.hypot(direction.x, direction.y);

  if (distance > range || distance === 0 || directionLength === 0) {
    return distance === 0 && range >= 0;
  }

  const dot =
    (offsetX * direction.x + offsetY * direction.y) /
    (distance * directionLength);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  return angle <= halfAngleRadians;
}
