import { describe, expect, it } from "vitest";
import { sanitizePersistedGameState } from "@/lib/gamePersistence";
import {
  createEmptyRpgCharacter,
  LEGACY_RPG_CHARACTER_ID,
} from "@/lib/rpgCharacters";

describe("sanitizePersistedGameState", () => {
  it("does not create a legacy character on repeated empty sanitation", () => {
    const once = sanitizePersistedGameState({});
    const twice = sanitizePersistedGameState(once);

    expect(once.rpgCharacters).toEqual([]);
    expect(twice.rpgCharacters).toEqual([]);
    expect(twice.activeRpgCharacterId).toBeNull();
  });

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

  it("keeps unique known relics only", () => {
    const state = sanitizePersistedGameState({
      rpgFoundRelics: ["hunter-fang", "invalid", "hunter-fang", "wolf-eye"],
    });

    expect(state.rpgFoundRelics).toEqual(["hunter-fang", "wolf-eye"]);
    expect(state.rpgRelicLevels).toEqual({
      "hunter-fang": 1,
      "wolf-eye": 1,
    });
  });

  it("restores relic levels and includes their max HP bonus", () => {
    const state = sanitizePersistedGameState({
      hp: 999,
      rpgFoundRelics: ["iron-heart"],
      rpgRelicLevels: { "iron-heart": 2 },
    });

    expect(state.rpgRelicLevels).toEqual({ "iron-heart": 2 });
    expect(state.maxHp).toBe(79);
    expect(state.hp).toBe(79);
  });

  it("normalizes legacy experience and validates class progression", () => {
    const promoted = sanitizePersistedGameState({
      experience: 245,
      level: 8,
      rpgClassId: "firemage",
      rpgPotionCount: 500,
    });
    const invalidEarlyClass = sanitizePersistedGameState({
      level: 4,
      rpgClassId: "warrior",
    });

    expect(promoted).toMatchObject({
      experience: 45,
      level: 10,
      rpgClassId: "firemage",
      rpgPotionCount: 99,
    });
    expect(invalidEarlyClass.rpgClassId).toBe("adventurer");
  });

  it("migrates the legacy flat RPG save exactly once", () => {
    const migrated = sanitizePersistedGameState({
      hp: 42,
      level: 7,
      rpgGold: 321,
      rpgFoundRelics: ["hunter-fang"],
    });
    const migratedAgain = sanitizePersistedGameState(migrated);

    expect(migrated.activeRpgCharacterId).toBe(
      LEGACY_RPG_CHARACTER_ID,
    );
    expect(migrated.rpgCharacters).toHaveLength(1);
    expect(migrated.rpgCharacters?.[0]).toMatchObject({
      hp: 42,
      id: LEGACY_RPG_CHARACTER_ID,
      level: 7,
      name: "기존 모험가",
      rpgGold: 321,
      rpgFoundRelics: ["hunter-fang"],
    });
    expect(migratedAgain.rpgCharacters).toHaveLength(1);
    expect(migratedAgain.activeRpgCharacterId).toBe(
      LEGACY_RPG_CHARACTER_ID,
    );
  });

  it("projects only the active character's relics and gold", () => {
    const first = createEmptyRpgCharacter("first", "루나", 1);
    first.rpgFoundRelics = ["iron-heart"];
    first.rpgRelicLevels = { "iron-heart": 1 };
    first.rpgGold = 777;
    const second = createEmptyRpgCharacter("second", "솔", 2);

    const secondActive = sanitizePersistedGameState({
      activeRpgCharacterId: second.id,
      rpgCharacters: [first, second],
    });
    const firstActive = sanitizePersistedGameState({
      activeRpgCharacterId: first.id,
      rpgCharacters: [first, second],
    });

    expect(secondActive).toMatchObject({
      rpgFoundRelics: [],
      rpgGold: 0,
      rpgRelicLevels: {},
    });
    expect(firstActive).toMatchObject({
      maxHp: 78,
      rpgFoundRelics: ["iron-heart"],
      rpgGold: 777,
      rpgRelicLevels: { "iron-heart": 1 },
    });
  });

  it("sanitizes Keeper level progress and best times", () => {
    const state = sanitizePersistedGameState({
      keeperBestTimes: { 1: 45, 2: -10, 7: 9999 },
      keeperCompletedSessions: [1, 1, 2, 8, "3"],
      keeperLevel: 3,
      keeperUnlockedLevel: 2,
    });

    expect(state.keeperLevel).toBe(3);
    expect(state.keeperUnlockedLevel).toBe(3);
    expect(state.keeperBestTimes).toEqual({ 1: 45, 2: 0 });
    expect(state.keeperCompletedSessions).toEqual([1, 2]);
  });
});
