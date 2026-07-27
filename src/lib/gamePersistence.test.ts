import { describe, expect, it } from "vitest";
import { sanitizePersistedGameState } from "@/lib/gamePersistence";

describe("sanitizePersistedGameState", () => {
  it("clamps invalid progress and restores a dead run safely", () => {
    const state = sanitizePersistedGameState({
      hp: -500,
      level: 999,
      rpgGold: -20,
      rpgQuestStage: "unknown",
      rpgSlimesDefeated: 100,
    });

    expect(state.hp).toBe(0);
    expect(state.rpgStatus).toBe("lost");
    expect(state.level).toBe(99);
    expect(state.rpgGold).toBe(0);
    expect(state.rpgQuestStage).toBe("meet_elder");
    expect(state.rpgSlimesDefeated).toBe(3);
  });

  it("keeps only valid owned and equipped items", () => {
    const state = sanitizePersistedGameState({
      hp: 999,
      rpgOwnedEquipment: ["guardian_armor", "invalid", "guardian_armor"],
      rpgEquippedItems: {
        armor: "guardian_armor",
        weapon: "guardian_armor",
      },
    });

    expect(state.rpgOwnedEquipment).toEqual(["guardian_armor"]);
    expect(state.rpgEquippedItems).toEqual({ armor: "guardian_armor" });
    expect(state.maxHp).toBe(80);
    expect(state.hp).toBe(80);
  });
});
