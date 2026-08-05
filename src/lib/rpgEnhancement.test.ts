import { describe, expect, it } from "vitest";
import {
  getRpgWeaponEnhancementChance,
  getRpgWeaponEnhancementCooldownMultiplier,
  getRpgWeaponEnhancementCooldownReductionPercent,
  getRpgWeaponEnhancementCost,
  getRpgWeaponEnhancedCooldownMs,
  getRpgWeaponEnhancementMultiplier,
  RPG_WEAPON_ENHANCEMENT_MAX_LEVEL,
  RPG_WEAPON_ENHANCEMENT_SUCCESS_CHANCES,
} from "@/lib/rpgEnhancement";

describe("RPG weapon enhancement", () => {
  it("exposes the complete level, cost, and success-chance table", () => {
    const expected = [
      { chance: 0.9, cost: 100, level: 0 },
      { chance: 0.8, cost: 150, level: 1 },
      { chance: 0.7, cost: 200, level: 2 },
      { chance: 0.6, cost: 250, level: 3 },
      { chance: 0.5, cost: 300, level: 4 },
      { chance: 0.4, cost: 350, level: 5 },
      { chance: 0.3, cost: 400, level: 6 },
      { chance: 0.2, cost: 450, level: 7 },
      { chance: 0.1, cost: 500, level: 8 },
      { chance: 0.05, cost: 550, level: 9 },
    ];

    expect(RPG_WEAPON_ENHANCEMENT_MAX_LEVEL).toBe(10);
    expect(RPG_WEAPON_ENHANCEMENT_SUCCESS_CHANCES).toEqual(
      expected.map(({ chance }) => chance),
    );
    expect(
      expected.map(({ level }) => ({
        chance: getRpgWeaponEnhancementChance(level),
        cost: getRpgWeaponEnhancementCost(level),
        level,
      })),
    ).toEqual(expected);
  });

  it("does not offer another attempt at +10 or beyond", () => {
    expect(getRpgWeaponEnhancementCost(10)).toBeNull();
    expect(getRpgWeaponEnhancementChance(10)).toBeNull();
    expect(getRpgWeaponEnhancementCost(99)).toBeNull();
    expect(getRpgWeaponEnhancementChance(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("clamps and floors levels before calculating values", () => {
    expect(getRpgWeaponEnhancementCost(-4)).toBe(100);
    expect(getRpgWeaponEnhancementChance(8.9)).toBe(0.1);
    expect(getRpgWeaponEnhancementMultiplier(-1)).toBe(1);
    expect(getRpgWeaponEnhancementMultiplier(4.9)).toBeCloseTo(1.4);
    expect(getRpgWeaponEnhancementMultiplier(10)).toBe(2);
    expect(getRpgWeaponEnhancementMultiplier(999)).toBe(2);
    expect(getRpgWeaponEnhancementMultiplier(Number.NaN)).toBe(1);
  });

  it("increases attack by ten percent per enhancement level", () => {
    for (let level = 0; level <= RPG_WEAPON_ENHANCEMENT_MAX_LEVEL; level += 1) {
      expect(getRpgWeaponEnhancementMultiplier(level)).toBeCloseTo(
        1 + level * 0.1,
      );
    }
  });

  it("reduces each new skill and dash cooldown by ten percent", () => {
    expect(getRpgWeaponEnhancementCooldownMultiplier(0)).toBe(1);
    expect(getRpgWeaponEnhancementCooldownMultiplier(1)).toBeCloseTo(0.9);
    expect(getRpgWeaponEnhancementCooldownMultiplier(2)).toBeCloseTo(0.81);
    expect(getRpgWeaponEnhancementCooldownMultiplier(10)).toBeCloseTo(
      0.3486784401,
    );
    expect(getRpgWeaponEnhancementCooldownReductionPercent(10)).toBe(65);
    expect(getRpgWeaponEnhancedCooldownMs(720, 2)).toBe(583);
    expect(getRpgWeaponEnhancedCooldownMs(4_500 * 0.88, 2)).toBe(3_208);

    for (let level = 1; level <= RPG_WEAPON_ENHANCEMENT_MAX_LEVEL; level += 1) {
      expect(getRpgWeaponEnhancementCooldownMultiplier(level)).toBeCloseTo(
        getRpgWeaponEnhancementCooldownMultiplier(level - 1) * 0.9,
      );
    }
  });

  it("normalizes invalid enhancement cooldown inputs", () => {
    expect(getRpgWeaponEnhancementCooldownMultiplier(-1)).toBe(1);
    expect(getRpgWeaponEnhancementCooldownMultiplier(Number.NaN)).toBe(1);
    expect(getRpgWeaponEnhancementCooldownMultiplier(999)).toBeCloseTo(
      0.3486784401,
    );
    expect(getRpgWeaponEnhancedCooldownMs(-50, 4)).toBe(0);
    expect(getRpgWeaponEnhancedCooldownMs(Number.POSITIVE_INFINITY, 4)).toBe(0);
  });
});
