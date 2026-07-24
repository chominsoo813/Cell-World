"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GameId } from "@/lib/gameCatalog";

export type ActiveView = "home" | GameId;
export type RpgQuestStage =
  | "meet_elder"
  | "collect_relic"
  | "defeat_slimes"
  | "return_elder"
  | "complete";
export type RunStatus = "idle" | "playing" | "won" | "lost";
export type DefenceUpgrade = "damage" | "speed" | "health";
export type KeeperDocumentId = "report" | "budget" | "idList";

interface KeeperSnapshot {
  alerts?: number;
  collectedDocuments?: KeeperDocumentId[];
  documents?: number;
  status?: RunStatus;
  timeRemaining?: number;
}

interface DefenceSnapshot {
  bossHp?: number;
  experience?: number;
  hp?: number;
  kills?: number;
  level?: number;
  status?: RunStatus;
  timeSurvived?: number;
  upgradePending?: boolean;
}

interface GameStore {
  activeView: ActiveView;
  selectedCell: string;
  formulaText: string;
  sessionRevision: number;

  hp: number;
  maxHp: number;
  level: number;
  experience: number;
  rpgGold: number;
  rpgQuestStage: RpgQuestStage;
  rpgRelicCollected: boolean;
  rpgSlimesDefeated: number;
  npcDialogueOpen: boolean;
  npcLastDialogue: string;
  npcMemorySummary: string;
  npcIsLoading: boolean;

  keeperStatus: RunStatus;
  keeperTimeRemaining: number;
  keeperDocuments: number;
  keeperCollectedDocuments: KeeperDocumentId[];
  keeperAlerts: number;

  defenceStatus: RunStatus;
  defenceHp: number;
  defenceMaxHp: number;
  defenceLevel: number;
  defenceExperience: number;
  defenceKills: number;
  defenceBossHp: number;
  defenceTimeSurvived: number;
  defenceUpgradePending: boolean;
  defenceDamage: number;
  defenceAttackDelay: number;
  defenceMoveSpeed: number;

  setActiveView: (view: ActiveView) => void;
  setSelectedCell: (cell: string, formulaText?: string) => void;
  setPlayerPosition: (cell: string) => void;
  damageRpgPlayer: (amount: number) => void;
  acceptRpgQuest: () => void;
  collectRpgRelic: () => void;
  defeatRpgSlime: () => void;
  completeRpgQuest: () => void;
  openNpcDialogue: () => void;
  closeNpcDialogue: () => void;
  setNpcResponse: (dialogue: string, memory?: string) => void;
  setNpcLoading: (isLoading: boolean) => void;
  updateKeeper: (snapshot: KeeperSnapshot) => void;
  updateDefence: (snapshot: DefenceSnapshot) => void;
  chooseDefenceUpgrade: (upgrade: DefenceUpgrade) => void;
  resetGame: (gameId: GameId) => void;
}

const sessionState = {
  selectedCell: "N10",
  formulaText: "CELL_WORLD.START()",
  sessionRevision: 0,
};

const rpgState = {
  hp: 60,
  maxHp: 60,
  level: 1,
  experience: 0,
  rpgGold: 0,
  rpgQuestStage: "meet_elder" as RpgQuestStage,
  rpgRelicCollected: false,
  rpgSlimesDefeated: 0,
  npcDialogueOpen: false,
  npcLastDialogue:
    "북쪽 숲의 셀 값이 흔들리고 있네. 자네의 도움이 필요하네.",
  npcMemorySummary: "",
  npcIsLoading: false,
};

const keeperState = {
  keeperStatus: "idle" as RunStatus,
  keeperTimeRemaining: 90,
  keeperDocuments: 0,
  keeperCollectedDocuments: [] as KeeperDocumentId[],
  keeperAlerts: 0,
};

const defenceState = {
  defenceStatus: "idle" as RunStatus,
  defenceHp: 100,
  defenceMaxHp: 100,
  defenceLevel: 1,
  defenceExperience: 0,
  defenceKills: 0,
  defenceBossHp: 0,
  defenceTimeSurvived: 0,
  defenceUpgradePending: false,
  defenceDamage: 2,
  defenceAttackDelay: 620,
  defenceMoveSpeed: 210,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      activeView: "home",
      ...sessionState,
      ...rpgState,
      ...keeperState,
      ...defenceState,

      setActiveView: (activeView) =>
        set({
          activeView,
          formulaText:
            activeView === "home"
              ? "CELL_WORLD.START()"
              : `=PLAY("${activeView.toUpperCase()}")`,
          npcDialogueOpen: false,
        }),
      setSelectedCell: (selectedCell, formulaText = "") =>
        set({ selectedCell, formulaText }),
      setPlayerPosition: (selectedCell) =>
        set({
          selectedCell,
          formulaText: `=PLAYER.POSITION("${selectedCell}")`,
        }),
      damageRpgPlayer: (amount) =>
        set((state) => ({
          hp: Math.max(0, state.hp - Math.max(0, amount)),
        })),
      acceptRpgQuest: () =>
        set((state) =>
          state.rpgQuestStage === "meet_elder"
            ? {
                rpgQuestStage: "collect_relic",
                npcLastDialogue:
                  "고대 수식 코어를 찾게. 동쪽 폐허의 빛나는 셀에 숨겨져 있네.",
                formulaText: '=QUEST.ACCEPT("BROKEN_FORMULA")',
              }
            : state,
        ),
      collectRpgRelic: () =>
        set((state) =>
          state.rpgQuestStage === "collect_relic"
            ? {
                rpgRelicCollected: true,
                rpgQuestStage: "defeat_slimes",
                formulaText: '=ITEM.GET("FORMULA_CORE")',
              }
            : state,
        ),
      defeatRpgSlime: () =>
        set((state) => {
          const defeated = Math.min(3, state.rpgSlimesDefeated + 1);
          return {
            rpgSlimesDefeated: defeated,
            rpgQuestStage:
              defeated >= 3 ? ("return_elder" as RpgQuestStage) : state.rpgQuestStage,
            experience: Math.min(100, state.experience + 18),
            formulaText: `=BATTLE.SLIME(${defeated}/3)`,
          };
        }),
      completeRpgQuest: () =>
        set((state) =>
          state.rpgQuestStage === "return_elder"
            ? {
                rpgQuestStage: "complete",
                rpgGold: state.rpgGold + 100,
                level: 2,
                experience: 10,
                npcLastDialogue:
                  "셀의 균열이 닫혔군. CELL WORLD의 첫 번째 수식을 복구했네!",
                formulaText: '=QUEST.COMPLETE("BROKEN_FORMULA")',
              }
            : state,
        ),
      openNpcDialogue: () => set({ npcDialogueOpen: true }),
      closeNpcDialogue: () => set({ npcDialogueOpen: false, npcIsLoading: false }),
      setNpcResponse: (npcLastDialogue, npcMemorySummary) =>
        set((state) => ({
          npcLastDialogue,
          npcMemorySummary: npcMemorySummary ?? state.npcMemorySummary,
          npcIsLoading: false,
        })),
      setNpcLoading: (npcIsLoading) => set({ npcIsLoading }),
      updateKeeper: (snapshot) =>
        set({
          ...(snapshot.alerts === undefined
            ? {}
            : { keeperAlerts: snapshot.alerts }),
          ...(snapshot.documents === undefined
            ? {}
            : { keeperDocuments: snapshot.documents }),
          ...(snapshot.collectedDocuments === undefined
            ? {}
            : { keeperCollectedDocuments: snapshot.collectedDocuments }),
          ...(snapshot.status === undefined
            ? {}
            : { keeperStatus: snapshot.status }),
          ...(snapshot.timeRemaining === undefined
            ? {}
            : { keeperTimeRemaining: snapshot.timeRemaining }),
        }),
      updateDefence: (snapshot) =>
        set({
          ...(snapshot.bossHp === undefined
            ? {}
            : { defenceBossHp: snapshot.bossHp }),
          ...(snapshot.experience === undefined
            ? {}
            : { defenceExperience: snapshot.experience }),
          ...(snapshot.hp === undefined ? {} : { defenceHp: snapshot.hp }),
          ...(snapshot.kills === undefined
            ? {}
            : { defenceKills: snapshot.kills }),
          ...(snapshot.level === undefined
            ? {}
            : { defenceLevel: snapshot.level }),
          ...(snapshot.status === undefined
            ? {}
            : { defenceStatus: snapshot.status }),
          ...(snapshot.timeSurvived === undefined
            ? {}
            : { defenceTimeSurvived: snapshot.timeSurvived }),
          ...(snapshot.upgradePending === undefined
            ? {}
            : { defenceUpgradePending: snapshot.upgradePending }),
        }),
      chooseDefenceUpgrade: (upgrade) =>
        set((state) => ({
          defenceUpgradePending: false,
          ...(upgrade === "damage"
            ? { defenceDamage: state.defenceDamage + 1 }
            : {}),
          ...(upgrade === "speed"
            ? { defenceAttackDelay: Math.max(240, state.defenceAttackDelay - 90) }
            : {}),
          ...(upgrade === "health"
            ? {
                defenceMaxHp: state.defenceMaxHp + 20,
                defenceHp: Math.min(
                  state.defenceMaxHp + 20,
                  state.defenceHp + 35,
                ),
              }
            : {}),
        })),
      resetGame: (gameId) =>
        set((state) => ({
          sessionRevision: state.sessionRevision + 1,
          npcDialogueOpen: false,
          ...(gameId === "rpg" ? rpgState : {}),
          ...(gameId === "keeper" ? keeperState : {}),
          ...(gameId === "defence" ? defenceState : {}),
        })),
    }),
    {
      name: "cell-world-session",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: ({
        defenceAttackDelay,
        defenceDamage,
        defenceLevel,
        defenceMaxHp,
        defenceMoveSpeed,
        experience,
        hp,
        level,
        maxHp,
        npcMemorySummary,
        rpgGold,
        rpgQuestStage,
        rpgRelicCollected,
        rpgSlimesDefeated,
      }) => ({
        defenceAttackDelay,
        defenceDamage,
        defenceLevel,
        defenceMaxHp,
        defenceMoveSpeed,
        experience,
        hp,
        level,
        maxHp,
        npcMemorySummary,
        rpgGold,
        rpgQuestStage,
        rpgRelicCollected,
        rpgSlimesDefeated,
      }),
    },
  ),
);
