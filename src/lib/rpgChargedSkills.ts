export const CSS_PIXELS_PER_CENTIMETER = 96 / 2.54;
export const LONGBOW_MAX_CHARGE_MS = 2_000;
export const BRAWLER_MAX_CHARGE_MS = 1_400;

export interface LongbowChargeStats {
  arrowThicknessPx: number;
  damageMultiplier: number;
  progress: number;
  rangeMultiplier: number;
  speed: number;
}

export interface BrawlerChargeStats {
  damageMultiplier: number;
  dashDurationMs: number;
  progress: number;
  rangeMultiplier: number;
  stunMs: number;
}

export function getChargeProgress(elapsedMs: number, maximumMs: number) {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(maximumMs) || maximumMs <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, elapsedMs / maximumMs));
}

export function getLongbowChargeStats(elapsedMs: number): LongbowChargeStats {
  const progress = getChargeProgress(elapsedMs, LONGBOW_MAX_CHARGE_MS);

  return {
    arrowThicknessPx: 12 + (CSS_PIXELS_PER_CENTIMETER - 12) * progress,
    damageMultiplier: 1 + 1.75 * progress,
    progress,
    rangeMultiplier: 0.78 + 0.22 * progress,
    speed: 720 + 300 * progress,
  };
}

export function getBrawlerChargeStats(elapsedMs: number): BrawlerChargeStats {
  const progress = getChargeProgress(elapsedMs, BRAWLER_MAX_CHARGE_MS);

  return {
    damageMultiplier: 1 + 1.35 * progress,
    dashDurationMs: Math.round(240 + 260 * progress),
    progress,
    rangeMultiplier: 0.72 + 0.48 * progress,
    stunMs: Math.round(320 + 680 * progress),
  };
}
