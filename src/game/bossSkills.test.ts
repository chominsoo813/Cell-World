import { describe, expect, it } from "vitest";
import {
  getBossPhase,
  getBossSkillCooldownMs,
  getBossSkillForCast,
  isPointInCone,
} from "@/game/bossSkills";

describe("RPG boss skills", () => {
  it("rotates each boss through its own skill pattern", () => {
    expect(getBossSkillForCast("dragonBoss", 0)).toBe("dragonBreath");
    expect(getBossSkillForCast("dragonBoss", 3)).toBe("dragonDarkOrb");
    expect(getBossSkillForCast("hellCerberus", 0)).toBe(
      "cerberusHellfire",
    );
    expect(getBossSkillForCast("hellCerberus", 2)).toBe(
      "cerberusFrostBreath",
    );
    expect(getBossSkillForCast("snowGiantBoss", 0)).toBe("giantCharge");
    expect(getBossSkillForCast("snowGiantBoss", 1)).toBe("giantClubSweep");
    expect(getBossSkillForCast("snowGiantBoss", 3)).toBe("giantSlam");
    expect(getBossSkillForCast("snowGiantBoss", 4)).toBe(
      "giantAvalancheRoar",
    );
    expect(getBossSkillForCast("snowWitchBoss", 1)).toBe("witchBlizzard");
    expect(getBossSkillForCast("snowWitchBoss", 3)).toBe(
      "witchMirrorBurst",
    );
    expect(getBossSkillForCast("xerosRaidBoss", 0)).toBe("xerosCharge");
    expect(getBossSkillForCast("xerosRaidBoss", 1)).toBe(
      "xerosMeteorSlam",
    );
    expect(getBossSkillForCast("xerosRaidBoss", 2)).toBe(
      "xerosLaserSweep",
    );
  });

  it("enrages bosses below half health and shortens cooldowns", () => {
    expect(getBossPhase(51, 100)).toBe(1);
    expect(getBossPhase(50, 100)).toBe(2);
    expect(getBossSkillCooldownMs("dragonBoss", 50, 100)).toBeLessThan(
      getBossSkillCooldownMs("dragonBoss", 100, 100),
    );
  });

  it("checks breath attacks using range and angle", () => {
    const origin = { x: 0, y: 0 };
    const direction = { x: 1, y: 0 };

    expect(
      isPointInCone(origin, { x: 180, y: 30 }, direction, 240, Math.PI / 5),
    ).toBe(true);
    expect(
      isPointInCone(origin, { x: -80, y: 0 }, direction, 240, Math.PI / 5),
    ).toBe(false);
    expect(
      isPointInCone(origin, { x: 280, y: 0 }, direction, 240, Math.PI / 5),
    ).toBe(false);
  });
});
