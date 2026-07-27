import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { useGameStore as GameStoreHook } from "@/stores/gameStore";

let useGameStore: typeof GameStoreHook;

beforeAll(async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  });
  ({ useGameStore } = await import("@/stores/gameStore"));
});

beforeEach(() => {
  useGameStore.setState({
    hp: 60,
    maxHp: 60,
    npcDialogueOpen: true,
    npcIsLoading: true,
    rpgDialogue: { name: "NPC", text: "hello" },
    rpgGold: 125,
    rpgQuestStage: "collect_relic",
    rpgShopOpen: true,
    rpgStatus: "playing",
    sessionRevision: 7,
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
