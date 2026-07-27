import { describe, expect, it } from "vitest";
import {
  getRpgRelicBonuses,
  RPG_RELICS,
  rollRpgRelicDrop,
} from "@/lib/rpgRelics";

function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}

describe("RPG relic system", () => {
  it("defines exactly 18 relics across all six rarities", () => {
    expect(RPG_RELICS).toHaveLength(18);
    expect(new Set(RPG_RELICS.map(({ id }) => id))).toHaveLength(18);
    expect(new Set(RPG_RELICS.map(({ rarity }) => rarity))).toEqual(
      new Set([
        "common",
        "uncommon",
        "rare",
        "unique",
        "legendary",
        "mystic",
      ]),
    );
  });

  it("adds the documented +1 or +1% effect for duplicates", () => {
    const first = getRpgRelicBonuses({
      "ember-ring": 1,
      "iron-heart": 1,
    });
    const duplicate = getRpgRelicBonuses({
      "ember-ring": 2,
      "iron-heart": 2,
    });

    expect(duplicate.attackPercent - first.attackPercent).toBe(1);
    expect(duplicate.maxHp - first.maxHp).toBe(1);
  });

  it("allows normal monsters to drop nothing or only normal-tier relics", () => {
    expect(
      rollRpgRelicDrop({ boss: false, rng: sequence(0.5) }),
    ).toBeUndefined();
    expect(
      rollRpgRelicDrop({
        boss: false,
        rng: sequence(0.01, 0.99, 0),
      })?.rarity,
    ).toBe("unique");
  });

  it("always gives bosses one legendary or mystic relic", () => {
    expect(
      rollRpgRelicDrop({
        boss: true,
        rng: sequence(0.9, 0),
        theme: "cave",
      })?.rarity,
    ).toBe("legendary");
    expect(
      rollRpgRelicDrop({
        boss: true,
        rng: sequence(0.1, 0),
        theme: "snow",
      })?.rarity,
    ).toBe("mystic");
  });
});
