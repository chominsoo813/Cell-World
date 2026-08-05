import { describe, expect, it } from "vitest";
import {
  BRAWLER_MAX_CHARGE_MS,
  CSS_PIXELS_PER_CENTIMETER,
  getBrawlerChargeStats,
  getChargeProgress,
  getLongbowChargeStats,
  LONGBOW_MAX_CHARGE_MS,
} from "@/lib/rpgChargedSkills";

describe("RPG charged skills", () => {
  it("clamps charge progress between zero and one", () => {
    expect(getChargeProgress(-100, 1_000)).toBe(0);
    expect(getChargeProgress(500, 1_000)).toBe(0.5);
    expect(getChargeProgress(2_000, 1_000)).toBe(1);
  });

  it("grows the longbow arrow without exceeding one CSS centimeter", () => {
    const tap = getLongbowChargeStats(0);
    const half = getLongbowChargeStats(LONGBOW_MAX_CHARGE_MS / 2);
    const maximum = getLongbowChargeStats(LONGBOW_MAX_CHARGE_MS * 2);

    expect(tap.arrowThicknessPx).toBe(12);
    expect(half.arrowThicknessPx).toBeGreaterThan(tap.arrowThicknessPx);
    expect(maximum.arrowThicknessPx).toBeCloseTo(
      CSS_PIXELS_PER_CENTIMETER,
    );
    expect(maximum.damageMultiplier).toBeGreaterThan(
      half.damageMultiplier,
    );
  });

  it("increases brawler dash duration, range, damage, and stun while charging", () => {
    const tap = getBrawlerChargeStats(0);
    const maximum = getBrawlerChargeStats(BRAWLER_MAX_CHARGE_MS);

    expect(maximum.progress).toBe(1);
    expect(maximum.dashDurationMs).toBeGreaterThan(tap.dashDurationMs);
    expect(maximum.rangeMultiplier).toBeGreaterThan(tap.rangeMultiplier);
    expect(maximum.damageMultiplier).toBeGreaterThan(tap.damageMultiplier);
    expect(maximum.stunMs).toBeGreaterThan(tap.stunMs);
  });
});
