import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { useGameStore as GameStoreHook } from "@/stores/gameStore";

let useGameStore: typeof GameStoreHook;
const localStorageValues = new Map<string, string>();

beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => localStorageValues.get(key) ?? null,
    removeItem: (key: string) => localStorageValues.delete(key),
    setItem: (key: string, value: string) =>
      localStorageValues.set(key, value),
  });
  ({ useGameStore } = await import("@/stores/gameStore"));
});

beforeEach(() => {
  localStorageValues.clear();
  useGameStore.setState({
    activeRpgCharacterId: null,
    experience: 0,
    hp: 60,
    level: 1,
    maxHp: 60,
    npcDialogueOpen: true,
    npcIsLoading: true,
    rpgDialogue: { name: "NPC", text: "hello" },
    rpgClassId: "adventurer",
    rpgBlacksmithOpen: false,
    rpgCharacterSelectOpen: false,
    rpgControlScheme: "keyboard",
    rpgControlSchemeOpen: false,
    rpgGuideOpen: false,
    rpgRelicArchiveOpen: false,
    rpgJobSwitchOpen: false,
    rpgCharacters: [],
    rpgGold: 125,
    rpgFoundRelics: [],
    rpgPotionCount: 0,
    rpgRelicLevels: {},
    rpgQuestStage: "collect_relic",
    rpgShopOpen: true,
    rpgStatus: "playing",
    rpgWeaponEnhancementLevel: 0,
    sessionRevision: 7,
  });
});

describe("playable game views", () => {
  it("redirects retired Office and Defence views to the game selector", () => {
    useGameStore.getState().setActiveView("keeper");
    expect(useGameStore.getState()).toMatchObject({
      activeView: "home",
      formulaText: "CELL_WORLD.START()",
    });

    useGameStore.getState().setActiveView("defence");
    expect(useGameStore.getState()).toMatchObject({
      activeView: "home",
      formulaText: "CELL_WORLD.START()",
    });
  });
});

describe("RPG death and restart", () => {
  it("enters the lost state and closes overlays at zero HP", () => {
    useGameStore.getState().damageRpgPlayer(999);
    const state = useGameStore.getState();

    expect(state.hp).toBe(0);
    expect(state.rpgStatus).toBe("lost");
    expect(state.npcDialogueOpen).toBe(false);
    expect(state.rpgDialogue).toBeNull();
    expect(state.rpgShopOpen).toBe(false);
  });

  it("restarts at full HP without clearing progress", () => {
    useGameStore.getState().damageRpgPlayer(999);
    useGameStore.getState().restartRpgRun();
    const state = useGameStore.getState();

    expect(state.hp).toBe(60);
    expect(state.rpgStatus).toBe("playing");
    expect(state.rpgGold).toBe(125);
    expect(state.rpgQuestStage).toBe("collect_relic");
    expect(state.sessionRevision).toBe(8);
  });
});

describe("RPG growth and job changes", () => {
  it("levels repeatedly and offers the two requested job changes", () => {
    useGameStore.getState().gainRpgExperience(500);
    expect(useGameStore.getState()).toMatchObject({
      experience: 0,
      level: 6,
      rpgClassId: "adventurer",
    });

    expect(useGameStore.getState().chooseRpgClass("warrior")).toBe(true);
    expect(useGameStore.getState().rpgClassId).toBe("warrior");

    useGameStore.getState().gainRpgExperience(400);
    expect(useGameStore.getState().level).toBe(10);
    expect(useGameStore.getState().chooseRpgClass("spearman")).toBe(true);
    expect(useGameStore.getState().rpgClassId).toBe("spearman");
  });

  it("switches freely only between sibling second jobs at level 30", () => {
    expect(useGameStore.getState().openRpgJobSwitch()).toBe(false);

    const created = useGameStore.getState().createRpgCharacter("전환 테스트");
    expect(created.status).toBe("created");

    useGameStore.setState({ level: 29, rpgClassId: "firemage" });
    expect(useGameStore.getState().openRpgJobSwitch()).toBe(false);

    useGameStore.setState({ level: 30, rpgClassId: "mage" });
    expect(useGameStore.getState().openRpgJobSwitch()).toBe(false);

    useGameStore.setState({
      experience: 42,
      hp: 47,
      level: 30,
      rpgClassId: "firemage",
      rpgGold: 777,
      rpgWeaponEnhancementLevel: 4,
    });
    expect(useGameStore.getState().openRpgJobSwitch()).toBe(true);
    expect(useGameStore.getState().rpgJobSwitchOpen).toBe(true);
    expect(useGameStore.getState().switchRpgSecondJob("firemage")).toBe(false);
    expect(useGameStore.getState().switchRpgSecondJob("spearman")).toBe(false);
    expect(useGameStore.getState().switchRpgSecondJob("frostmage")).toBe(true);
    expect(useGameStore.getState().switchRpgSecondJob("toxicmage")).toBe(true);

    const state = useGameStore.getState();
    const activeProfile = state.rpgCharacters.find(
      ({ id }) => id === state.activeRpgCharacterId,
    );
    expect(state).toMatchObject({
      experience: 42,
      hp: 47,
      level: 30,
      rpgClassId: "toxicmage",
      rpgGold: 777,
      rpgJobSwitchOpen: true,
      rpgWeaponEnhancementLevel: 4,
    });
    expect(activeProfile?.rpgClassId).toBe("toxicmage");

    state.closeRpgJobSwitch();
    expect(useGameStore.getState().rpgJobSwitchOpen).toBe(false);
  });

  it("stores picked potions and consumes one only when healing is possible", () => {
    useGameStore.setState({ hp: 30 });
    useGameStore.getState().collectRpgPotion(2);

    expect(useGameStore.getState().useRpgPotion()).toBe(true);
    expect(useGameStore.getState()).toMatchObject({
      hp: 54,
      rpgPotionCount: 1,
    });

    useGameStore.setState({ hp: 60 });
    expect(useGameStore.getState().useRpgPotion()).toBe(false);
    expect(useGameStore.getState().rpgPotionCount).toBe(1);
  });

  it("stacks duplicate relics and applies their +1 effect", () => {
    useGameStore.getState().collectRpgDroppedRelic("iron-heart");
    expect(useGameStore.getState()).toMatchObject({
      hp: 78,
      maxHp: 78,
      rpgFoundRelics: ["iron-heart"],
      rpgRelicLevels: { "iron-heart": 1 },
    });

    useGameStore.getState().collectRpgDroppedRelic("iron-heart");
    expect(useGameStore.getState()).toMatchObject({
      hp: 79,
      maxHp: 79,
      rpgFoundRelics: ["iron-heart"],
      rpgRelicLevels: { "iron-heart": 2 },
    });
  });
});

describe("RPG character roster", () => {
  it("rehydrates a version 8 save and writes back the version 11 roster", async () => {
    localStorageValues.set(
      "cell-world-session",
      JSON.stringify({
        state: {
          hp: 44,
          level: 6,
          rpgGold: 345,
          rpgFoundRelics: ["hunter-fang"],
        },
        version: 8,
      }),
    );

    await useGameStore.persist.rehydrate();

    expect(useGameStore.getState()).toMatchObject({
      activeRpgCharacterId: "legacy-adventurer",
      hp: 44,
      level: 6,
      rpgGold: 345,
      rpgFoundRelics: ["hunter-fang"],
    });
    expect(useGameStore.getState().rpgCharacters).toHaveLength(1);
    const persistedEnvelope = JSON.parse(
      localStorageValues.get("cell-world-session") ?? "{}",
    ) as { version?: number };
    expect(persistedEnvelope.version).toBe(11);
  });

  it("opens the guide once for a new character and keeps it available manually", () => {
    const created = useGameStore
      .getState()
      .createRpgCharacter("새싹 모험가");

    expect(created.status).toBe("created");
    expect(useGameStore.getState().rpgControlSchemeOpen).toBe(true);
    expect(useGameStore.getState().rpgGuideOpen).toBe(false);
    expect(useGameStore.getState().rpgCharacters[0]?.rpgGuideSeen).toBe(false);

    useGameStore.getState().closeRpgControlScheme();
    expect(useGameStore.getState().rpgGuideOpen).toBe(true);
    useGameStore.getState().closeRpgGuide();
    expect(useGameStore.getState().rpgGuideOpen).toBe(false);
    expect(useGameStore.getState().rpgCharacters[0]?.rpgGuideSeen).toBe(true);

    if (created.status !== "created") {
      throw new Error("character was not created");
    }
    expect(
      useGameStore.getState().selectRpgCharacter(created.characterId),
    ).toBe(true);
    expect(useGameStore.getState().rpgControlSchemeOpen).toBe(true);
    useGameStore.getState().closeRpgControlScheme();
    expect(useGameStore.getState().rpgGuideOpen).toBe(false);

    useGameStore.getState().openRpgGuide();
    expect(useGameStore.getState().rpgGuideOpen).toBe(true);
  });

  it("opens Digger's relic archive as an exclusive RPG modal", () => {
    useGameStore.getState().createRpgCharacter("유물 수집가");
    useGameStore.getState().openRpgDialogue({
      name: "임시 대화",
      text: "닫혀야 합니다.",
    });

    useGameStore.getState().openRpgRelicArchive();
    expect(useGameStore.getState()).toMatchObject({
      rpgDialogue: null,
      rpgRelicArchiveOpen: true,
      rpgShopOpen: false,
      rpgBlacksmithOpen: false,
      rpgCharacterSelectOpen: false,
      rpgGuideOpen: false,
      rpgJobSwitchOpen: false,
    });

    useGameStore.getState().closeRpgRelicArchive();
    expect(useGameStore.getState().rpgRelicArchiveOpen).toBe(false);
  });

  it("keeps progression and relics isolated per character", () => {
    const first = useGameStore
      .getState()
      .createRpgCharacter("루나");
    expect(first.status).toBe("created");

    useGameStore.getState().earnRpgGold(50);
    useGameStore
      .getState()
      .collectRpgDroppedRelic("iron-heart");

    const second = useGameStore
      .getState()
      .createRpgCharacter("솔");
    expect(second.status).toBe("created");
    expect(useGameStore.getState()).toMatchObject({
      rpgFoundRelics: [],
      rpgGold: 0,
    });

    if (first.status !== "created") {
      throw new Error("first character was not created");
    }
    expect(
      useGameStore
        .getState()
        .selectRpgCharacter(first.characterId),
    ).toBe(true);
    expect(useGameStore.getState()).toMatchObject({
      rpgFoundRelics: ["iron-heart"],
      rpgGold: 50,
      rpgRelicLevels: { "iron-heart": 1 },
    });
  });

  it("stores the selected control scheme per character", () => {
    const first = useGameStore.getState().createRpgCharacter("Mouse Hero");
    useGameStore.getState().setRpgControlScheme("keyboard_mouse");
    useGameStore.getState().closeRpgControlScheme();
    const second = useGameStore.getState().createRpgCharacter("Keyboard Hero");

    expect(useGameStore.getState().rpgControlScheme).toBe("keyboard");
    if (first.status !== "created" || second.status !== "created") {
      throw new Error("characters were not created");
    }

    expect(
      useGameStore.getState().selectRpgCharacter(first.characterId),
    ).toBe(true);
    expect(useGameStore.getState().rpgControlScheme).toBe("keyboard_mouse");
    expect(
      useGameStore
        .getState()
        .rpgCharacters.find(({ id }) => id === first.characterId)
        ?.rpgControlScheme,
    ).toBe("keyboard_mouse");
  });

  it("renames characters while rejecting empty and duplicate names", () => {
    const first = useGameStore.getState().createRpgCharacter("Alpha");
    useGameStore.getState().createRpgCharacter("Beta");

    if (first.status !== "created") {
      throw new Error("first character was not created");
    }

    expect(
      useGameStore.getState().renameRpgCharacter(first.characterId, "   "),
    ).toMatchObject({ status: "invalid_name" });
    expect(
      useGameStore.getState().renameRpgCharacter(first.characterId, "Beta"),
    ).toMatchObject({ status: "duplicate_name" });
    expect(
      useGameStore
        .getState()
        .renameRpgCharacter(first.characterId, "  Renamed Hero  "),
    ).toEqual({ name: "Renamed Hero", status: "renamed" });
    expect(
      useGameStore
        .getState()
        .rpgCharacters.find(({ id }) => id === first.characterId)?.name,
    ).toBe("Renamed Hero");
  });

  it("deletes active characters safely and returns to creation when none remain", () => {
    const first = useGameStore.getState().createRpgCharacter("First");
    useGameStore.getState().earnRpgGold(50);
    const second = useGameStore.getState().createRpgCharacter("Second");
    useGameStore.getState().earnRpgGold(25);

    if (first.status !== "created" || second.status !== "created") {
      throw new Error("characters were not created");
    }

    expect(useGameStore.getState().deleteRpgCharacter(second.characterId)).toBe(
      true,
    );
    expect(useGameStore.getState()).toMatchObject({
      activeRpgCharacterId: first.characterId,
      rpgCharacterSelectOpen: true,
      rpgGold: 50,
    });
    expect(useGameStore.getState().rpgCharacters).toHaveLength(1);

    expect(useGameStore.getState().deleteRpgCharacter(first.characterId)).toBe(
      true,
    );
    expect(useGameStore.getState()).toMatchObject({
      activeRpgCharacterId: null,
      rpgCharacterSelectOpen: true,
      rpgCharacters: [],
      rpgGold: 0,
    });
  });

  it("charges every valid enhancement attempt and preserves a failed level", () => {
    useGameStore.getState().createRpgCharacter("브람의 제자");
    useGameStore.getState().earnRpgGold(1_000);

    expect(useGameStore.getState().enhanceRpgWeapon(0.89)).toMatchObject({
      cost: 100,
      level: 1,
      status: "success",
    });
    expect(useGameStore.getState().enhanceRpgWeapon(0.95)).toMatchObject({
      cost: 150,
      level: 1,
      status: "failed",
    });
    expect(useGameStore.getState()).toMatchObject({
      rpgGold: 750,
      rpgWeaponEnhancementLevel: 1,
    });
  });

  it("discards a late NPC response after switching characters", () => {
    const first = useGameStore.getState().createRpgCharacter("노라");
    useGameStore.getState().createRpgCharacter("리아");

    if (first.status !== "created") {
      throw new Error("first character was not created");
    }
    useGameStore.getState().setNpcResponse(
      "늦게 도착한 응답",
      { questStatus: "collect_relic", recentTopic: "quest" },
      first.characterId,
    );

    expect(useGameStore.getState().npcMemory).toBeNull();
    expect(useGameStore.getState().npcLastDialogue).not.toBe(
      "늦게 도착한 응답",
    );
  });

  it("resets only the active character and preserves the other save", () => {
    const first = useGameStore.getState().createRpgCharacter("첫째");
    useGameStore.getState().earnRpgGold(90);
    useGameStore.getState().createRpgCharacter("둘째");
    useGameStore.getState().earnRpgGold(30);
    useGameStore.getState().resetGame("rpg");

    expect(useGameStore.getState().rpgGold).toBe(0);
    if (first.status !== "created") {
      throw new Error("first character was not created");
    }
    useGameStore
      .getState()
      .selectRpgCharacter(first.characterId);
    expect(useGameStore.getState().rpgGold).toBe(90);
  });

  it("rejects enhancement without a character, enough gold, or below +10", () => {
    expect(useGameStore.getState().enhanceRpgWeapon(0)).toMatchObject({
      status: "no_character",
    });
    useGameStore.getState().createRpgCharacter("강화 경계");
    expect(useGameStore.getState().enhanceRpgWeapon(0)).toMatchObject({
      cost: 100,
      status: "insufficient_gold",
    });
    useGameStore.setState({ rpgGold: 999, rpgWeaponEnhancementLevel: 10 });
    expect(useGameStore.getState().enhanceRpgWeapon(0)).toMatchObject({
      cost: 0,
      level: 10,
      status: "max_level",
    });
    expect(useGameStore.getState().rpgGold).toBe(999);
  });
});

describe("Keeper session completion", () => {
  it("stores the completed session and unlocks the next one only once", () => {
    useGameStore.setState({
      keeperBestTimes: {},
      keeperCompletedSessions: [],
      keeperLevel: 1,
      keeperStatus: "playing",
      keeperUnlockedLevel: 1,
    });

    useGameStore.getState().completeKeeperLevel(0);
    useGameStore.getState().completeKeeperLevel(0);

    expect(useGameStore.getState()).toMatchObject({
      keeperCompletedSessions: [1],
      keeperStatus: "won",
      keeperUnlockedLevel: 2,
    });
  });
});
