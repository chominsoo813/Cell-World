import { describe, expect, it } from "vitest";
import {
  getRpgClass,
  getRpgJobChangeOptions,
  getRpgSecondJobSwitchOptions,
  RPG_CLASS_IDS,
} from "@/lib/rpgClasses";

describe("RPG class progression", () => {
  it("keeps the adventurer until level 5 and then exposes five first jobs", () => {
    expect(getRpgJobChangeOptions(4, "adventurer")).toEqual([]);
    expect(
      getRpgJobChangeOptions(5, "adventurer").map(({ id }) => id),
    ).toEqual(["warrior", "assassin", "mage", "archer", "pirate"]);
  });

  it("exposes only the matching second-job branches at level 10", () => {
    expect(
      getRpgJobChangeOptions(10, "warrior").map(({ id }) => id),
    ).toEqual(["swordmaster", "greatsword", "spearman"]);
    expect(
      getRpgJobChangeOptions(10, "mage").map(({ id }) => id),
    ).toEqual(["firemage", "frostmage", "stormmage", "toxicmage"]);
    expect(
      getRpgJobChangeOptions(10, "pirate").map(({ id }) => id),
    ).toEqual(["gunslinger", "plunder_captain", "storm_captain"]);
  });

  it("offers only other second jobs in the same branch from level 30", () => {
    expect(getRpgSecondJobSwitchOptions(29, "firemage")).toEqual([]);
    expect(getRpgSecondJobSwitchOptions(30, "mage")).toEqual([]);
    expect(
      getRpgSecondJobSwitchOptions(30, "firemage").map(({ id }) => id),
    ).toEqual(["frostmage", "stormmage", "toxicmage"]);
    expect(
      getRpgSecondJobSwitchOptions(30, "longbow").map(({ id }) => id),
    ).toEqual(["crossbow"]);
    expect(
      getRpgSecondJobSwitchOptions(30, "swordmaster").map(({ id }) => id),
    ).toEqual(["greatsword", "spearman"]);
  });

  it("defines a named visual skill for every playable class", () => {
    expect(RPG_CLASS_IDS).toHaveLength(21);
    for (const classId of RPG_CLASS_IDS) {
      const definition = getRpgClass(classId);
      expect(definition.skill.name.length).toBeGreaterThan(1);
      expect(definition.skill.power).toBeGreaterThan(0);
      expect(definition.spriteFile).toContain(`${classId}.png`);
    }
  });

  it("defines the ninja skill as a concrete piercing shuriken throw", () => {
    const skill = getRpgClass("ninja").skill;

    expect(skill.name).toContain("표창");
    expect(skill.effect).toBe("line");
    expect(skill.description).toContain("4회 관통");
  });
});
