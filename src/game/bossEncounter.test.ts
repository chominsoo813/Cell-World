import { describe, expect, it } from "vitest";
import {
  getRpgBossDefeatKey,
  resetRpgBossEncounter,
} from "@/game/bossEncounter";

describe("RPG boss encounter lifecycle", () => {
  it("clears only the target boss map when a new encounter begins", () => {
    const defeatedBossMaps = new Set(["cave-10", "snow-10"]);
    const defeatedBossKinds = new Set([
      getRpgBossDefeatKey("cave-10", "dragonBoss"),
      getRpgBossDefeatKey("snow-10", "snowGiantBoss"),
      getRpgBossDefeatKey("snow-10", "snowWitchBoss"),
    ]);

    resetRpgBossEncounter(
      "cave-10",
      ["dragonBoss"],
      defeatedBossMaps,
      defeatedBossKinds,
    );

    expect(defeatedBossMaps).toEqual(new Set(["snow-10"]));
    expect(defeatedBossKinds).toEqual(
      new Set([
        getRpgBossDefeatKey("snow-10", "snowGiantBoss"),
        getRpgBossDefeatKey("snow-10", "snowWitchBoss"),
      ]),
    );
  });

  it("resets every boss kind in a multi-boss encounter", () => {
    const defeatedBossMaps = new Set(["snow-10"]);
    const defeatedBossKinds = new Set([
      getRpgBossDefeatKey("snow-10", "snowGiantBoss"),
      getRpgBossDefeatKey("snow-10", "snowWitchBoss"),
    ]);

    resetRpgBossEncounter(
      "snow-10",
      ["snowGiantBoss", "snowWitchBoss"],
      defeatedBossMaps,
      defeatedBossKinds,
    );

    expect(defeatedBossMaps.size).toBe(0);
    expect(defeatedBossKinds.size).toBe(0);
  });
});
