export const RPG_WEAPON_ENHANCEMENT_MAX_LEVEL = 10;
export const RPG_WEAPON_ENHANCEMENT_COOLDOWN_FACTOR = 0.9;

export const RPG_WEAPON_ENHANCEMENT_SUCCESS_CHANCES = [
  0.9,
  0.8,
  0.7,
  0.6,
  0.5,
  0.4,
  0.3,
  0.2,
  0.1,
  0.05,
] as const;

function normalizeEnhancementLevel(level: number) {
  if (Number.isNaN(level)) {
    return 0;
  }

  return Math.min(
    RPG_WEAPON_ENHANCEMENT_MAX_LEVEL,
    Math.max(0, Math.floor(level)),
  );
}

export function getRpgWeaponEnhancementCost(currentLevel: number) {
  const level = normalizeEnhancementLevel(currentLevel);

  return level >= RPG_WEAPON_ENHANCEMENT_MAX_LEVEL
    ? null
    : 100 + 50 * level;
}

export function getRpgWeaponEnhancementChance(currentLevel: number) {
  const level = normalizeEnhancementLevel(currentLevel);

  return level >= RPG_WEAPON_ENHANCEMENT_MAX_LEVEL
    ? null
    : RPG_WEAPON_ENHANCEMENT_SUCCESS_CHANCES[level];
}

export function getRpgWeaponEnhancementMultiplier(level: number) {
  return 1 + normalizeEnhancementLevel(level) * 0.1;
}

export function getRpgWeaponEnhancementCooldownMultiplier(level: number) {
  return (
    RPG_WEAPON_ENHANCEMENT_COOLDOWN_FACTOR ** normalizeEnhancementLevel(level)
  );
}

export function getRpgWeaponEnhancementCooldownReductionPercent(
  level: number,
) {
  return Math.round(
    (1 - getRpgWeaponEnhancementCooldownMultiplier(level)) * 100,
  );
}

export function getRpgWeaponEnhancedCooldownMs(
  baseCooldownMs: number,
  enhancementLevel: number,
) {
  if (!Number.isFinite(baseCooldownMs)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      baseCooldownMs *
        getRpgWeaponEnhancementCooldownMultiplier(enhancementLevel),
    ),
  );
}
