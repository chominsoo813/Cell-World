"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GameId } from "@/lib/gameCatalog";
import { sanitizePersistedGameState } from "@/lib/gamePersistence";
import {
  type NpcMemory,
  type NpcQuestStatus,
} from "@/lib/npcChat";
import {
  getRpgEquipment,
  type RpgEquipmentId,
  type RpgEquipmentSlot,
} from "@/lib/rpgShop";
import type { RpgRelicId } from "@/lib/rpgRelics";
import {
  getRpgJobChangeOptions,
  type RpgClassId,
} from "@/lib/rpgClasses";

export type ActiveView = "home" | GameId;
export type RpgQuestStage = NpcQuestStatus;
export type RunStatus = "idle" | "playing" | "won" | "lost";
export type RpgRunStatus = "playing" | "lost";
export type DefenceUpgrade = "damage" | "speed" | "health";
export type KeeperDocumentId = "report" | "budget" | "idList";

export interface RpgDialogueMessage {
  name: string;
  portrait?: string;
  text: string;
}

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

export interface GameStore {
  activeView: ActiveView;
  selectedCell: string;
  formulaText: string;
  sessionRevision: number;

  hp: number;
  maxHp: number;
  level: number;
  experience: number;
  rpgClassId: RpgClassId;
  rpgGold: number;
  rpgPotionCount: number;
  rpgFoundRelics: RpgRelicId[];
  rpgQuestStage: RpgQuestStage;
  rpgRelicCollected: boolean;
  rpgSlimesDefeated: number;
  rpgOpenedObjects: string[];
  rpgDialogue: RpgDialogueMessage | null;
  rpgShopOpen: boolean;
  rpgOwnedEquipment: RpgEquipmentId[];
  rpgEquippedItems: Partial<Record<RpgEquipmentSlot, RpgEquipmentId>>;
  rpgStatus: RpgRunStatus;
  npcDialogueOpen: boolean;
  npcLastDialogue: string;
  npcMemory: NpcMemory | null;
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
  healRpgPlayer: (amount: number) => void;
  gainRpgExperience: (amount: number) => void;
  chooseRpgClass: (classId: RpgClassId) => boolean;
  earnRpgGold: (amount: number) => void;
  collectRpgPotion: (amount?: number) => void;
  useRpgPotion: () => boolean;
  collectRpgDroppedRelic: (relicId: RpgRelicId) => boolean;
  claimRpgReward: (
    objectId: string,
    reward?: { gold?: number; heal?: number },
  ) => void;
  openRpgDialogue: (dialogue: RpgDialogueMessage) => void;
  closeRpgDialogue: () => void;
  openRpgShop: () => void;
  closeRpgShop: () => void;
  buyRpgEquipment: (equipmentId: RpgEquipmentId) => boolean;
  equipRpgEquipment: (equipmentId: RpgEquipmentId) => void;
  acceptRpgQuest: () => void;
  collectRpgRelic: () => void;
  defeatRpgSlime: () => void;
  completeRpgQuest: () => void;
  openNpcDialogue: () => void;
  closeNpcDialogue: () => void;
  setNpcResponse: (dialogue: string, memory?: NpcMemory) => void;
  setNpcLoading: (isLoading: boolean) => void;
  updateKeeper: (snapshot: KeeperSnapshot) => void;
  updateDefence: (snapshot: DefenceSnapshot) => void;
  chooseDefenceUpgrade: (upgrade: DefenceUpgrade) => void;
  restartRpgRun: () => void;
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
  rpgClassId: "adventurer" as RpgClassId,
  rpgGold: 0,
  rpgPotionCount: 0,
  rpgFoundRelics: [] as RpgRelicId[],
  rpgQuestStage: "meet_elder" as RpgQuestStage,
  rpgRelicCollected: false,
  rpgSlimesDefeated: 0,
  rpgOpenedObjects: [] as string[],
  rpgDialogue: null as RpgDialogueMessage | null,
  rpgShopOpen: false,
  rpgOwnedEquipment: [] as RpgEquipmentId[],
  rpgEquippedItems: {} as Partial<
    Record<RpgEquipmentSlot, RpgEquipmentId>
  >,
  rpgStatus: "playing" as RpgRunStatus,
  npcDialogueOpen: false,
  npcLastDialogue:
    "북쪽 숲의 셀 값이 흔들리고 있네. 자네의 도움이 필요하네.",
  npcMemory: null as NpcMemory | null,
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

function addRpgExperience(
  state: Pick<GameStore, "experience" | "level">,
  amount: number,
) {
  let experience = state.experience + Math.max(0, Math.floor(amount));
  let level = state.level;

  while (experience >= 100 && level < 99) {
    experience -= 100;
    level += 1;
  }

  return {
    experience: level >= 99 ? Math.min(99, experience) : experience,
    level,
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
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
          rpgDialogue: null,
          rpgShopOpen: false,
        }),
      setSelectedCell: (selectedCell, formulaText = "") =>
        set({ selectedCell, formulaText }),
      setPlayerPosition: (selectedCell) =>
        set({
          selectedCell,
          formulaText: `=PLAYER.POSITION("${selectedCell}")`,
        }),
      damageRpgPlayer: (amount) =>
        set((state) => {
          if (state.rpgStatus === "lost") {
            return state;
          }

          const hp = Math.max(0, state.hp - Math.max(0, amount));
          return {
            hp,
            rpgStatus: hp === 0 ? ("lost" as RpgRunStatus) : state.rpgStatus,
            ...(hp === 0
              ? {
                  npcDialogueOpen: false,
                  npcIsLoading: false,
                  rpgDialogue: null,
                  rpgShopOpen: false,
                }
              : {}),
          };
        }),
      healRpgPlayer: (amount) =>
        set((state) =>
          state.rpgStatus === "lost"
            ? state
            : {
                hp: Math.min(
                  state.maxHp,
                  state.hp + Math.max(0, amount),
                ),
              },
        ),
      gainRpgExperience: (amount) =>
        set((state) => addRpgExperience(state, amount)),
      chooseRpgClass: (classId) => {
        const state = get();
        const isAvailable = getRpgJobChangeOptions(
          state.level,
          state.rpgClassId,
        ).some((definition) => definition.id === classId);

        if (!isAvailable) {
          return false;
        }

        set({
          rpgClassId: classId,
          formulaText: `=JOB.CHANGE("${classId.toUpperCase()}")`,
        });
        return true;
      },
      earnRpgGold: (amount) =>
        set((state) => ({
          rpgGold: state.rpgGold + Math.max(0, amount),
        })),
      collectRpgPotion: (amount = 1) =>
        set((state) => ({
          rpgPotionCount: Math.min(
            99,
            state.rpgPotionCount + Math.max(0, Math.floor(amount)),
          ),
          formulaText: `=PICKUP.POTION(${Math.max(0, Math.floor(amount))})`,
        })),
      useRpgPotion: () => {
        const state = get();

        if (
          state.rpgStatus !== "playing" ||
          state.rpgPotionCount <= 0 ||
          state.hp >= state.maxHp
        ) {
          return false;
        }

        set({
          hp: Math.min(state.maxHp, state.hp + 24),
          rpgPotionCount: state.rpgPotionCount - 1,
          formulaText: '=ITEM.USE("HEALTH_POTION")',
        });
        return true;
      },
      collectRpgDroppedRelic: (relicId) => {
        const state = get();
        if (state.rpgFoundRelics.includes(relicId)) {
          return false;
        }
        set({
          rpgFoundRelics: [...state.rpgFoundRelics, relicId],
          formulaText: `=RELIC.COLLECT("${relicId.toUpperCase()}")`,
        });
        return true;
      },
      claimRpgReward: (objectId, reward = {}) =>
        set((state) => {
          if (
            state.rpgStatus === "lost" ||
            state.rpgOpenedObjects.includes(objectId)
          ) {
            return state;
          }
          return {
            rpgOpenedObjects: [...state.rpgOpenedObjects, objectId],
            rpgGold: state.rpgGold + Math.max(0, reward.gold ?? 0),
            hp: Math.min(
              state.maxHp,
              state.hp + Math.max(0, reward.heal ?? 0),
            ),
          };
        }),
      openRpgDialogue: (rpgDialogue) =>
        set({
          npcDialogueOpen: false,
          rpgDialogue,
          rpgShopOpen: false,
        }),
      closeRpgDialogue: () => set({ rpgDialogue: null }),
      openRpgShop: () =>
        set({
          npcDialogueOpen: false,
          rpgDialogue: null,
          rpgShopOpen: true,
          formulaText: '=SHOP.OPEN("MERCHANT_PICO")',
        }),
      closeRpgShop: () => set({ rpgShopOpen: false }),
      buyRpgEquipment: (equipmentId) => {
        const state = get();
        const equipment = getRpgEquipment(equipmentId);

        if (!equipment) {
          return false;
        }

        if (state.rpgOwnedEquipment.includes(equipmentId)) {
          state.equipRpgEquipment(equipmentId);
          return true;
        }

        if (state.rpgGold < equipment.price) {
          return false;
        }

        const previousEquipment = getRpgEquipment(
          state.rpgEquippedItems[equipment.slot],
        );
        const previousMaxHpBonus = previousEquipment?.stats.maxHp ?? 0;
        const nextMaxHpBonus = equipment.stats.maxHp ?? 0;
        const nextMaxHp =
          state.maxHp - previousMaxHpBonus + nextMaxHpBonus;

        set({
          rpgGold: state.rpgGold - equipment.price,
          rpgOwnedEquipment: [...state.rpgOwnedEquipment, equipmentId],
          rpgEquippedItems: {
            ...state.rpgEquippedItems,
            [equipment.slot]: equipmentId,
          },
          maxHp: nextMaxHp,
          hp: Math.min(
            nextMaxHp,
            state.hp + Math.max(0, nextMaxHpBonus - previousMaxHpBonus),
          ),
          formulaText: `=SHOP.BUY("${equipmentId.toUpperCase()}")`,
        });
        return true;
      },
      equipRpgEquipment: (equipmentId) =>
        set((state) => {
          const equipment = getRpgEquipment(equipmentId);

          if (
            !equipment ||
            !state.rpgOwnedEquipment.includes(equipmentId)
          ) {
            return state;
          }

          const previousEquipment = getRpgEquipment(
            state.rpgEquippedItems[equipment.slot],
          );
          const previousMaxHpBonus = previousEquipment?.stats.maxHp ?? 0;
          const nextMaxHpBonus = equipment.stats.maxHp ?? 0;
          const nextMaxHp =
            state.maxHp - previousMaxHpBonus + nextMaxHpBonus;

          return {
            rpgEquippedItems: {
              ...state.rpgEquippedItems,
              [equipment.slot]: equipmentId,
            },
            maxHp: nextMaxHp,
            hp: Math.min(nextMaxHp, state.hp),
            formulaText: `=EQUIP("${equipmentId.toUpperCase()}")`,
          };
        }),
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
            formulaText: `=BATTLE.SLIME(${defeated}/3)`,
          };
        }),
      completeRpgQuest: () =>
        set((state) =>
          state.rpgQuestStage === "return_elder"
            ? {
                rpgQuestStage: "complete",
                rpgGold: state.rpgGold + 100,
                ...addRpgExperience(state, 100),
                npcLastDialogue:
                  "셀의 균열이 닫혔군. CELL WORLD의 첫 번째 수식을 복구했네!",
                formulaText: '=QUEST.COMPLETE("BROKEN_FORMULA")',
              }
            : state,
        ),
      openNpcDialogue: () =>
        set({
          npcDialogueOpen: true,
          rpgDialogue: null,
          rpgShopOpen: false,
        }),
      closeNpcDialogue: () => set({ npcDialogueOpen: false, npcIsLoading: false }),
      setNpcResponse: (npcLastDialogue, npcMemory) =>
        set((state) => ({
          npcLastDialogue,
          npcMemory: npcMemory ?? state.npcMemory,
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
      restartRpgRun: () =>
        set((state) => ({
          hp: state.maxHp,
          npcDialogueOpen: false,
          npcIsLoading: false,
          rpgDialogue: null,
          rpgShopOpen: false,
          rpgStatus: "playing",
          sessionRevision: state.sessionRevision + 1,
        })),
      resetGame: (gameId) =>
        set((state) => ({
          sessionRevision: state.sessionRevision + 1,
          npcDialogueOpen: false,
          rpgDialogue: null,
          rpgShopOpen: false,
          ...(gameId === "rpg" ? rpgState : {}),
          ...(gameId === "keeper" ? keeperState : {}),
          ...(gameId === "defence" ? defenceState : {}),
        })),
    }),
    {
      name: "cell-world-session",
      storage: createJSONStorage(() => localStorage),
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
        npcMemory,
        rpgClassId,
        rpgEquippedItems,
        rpgFoundRelics,
        rpgGold,
        rpgOpenedObjects,
        rpgOwnedEquipment,
        rpgPotionCount,
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
        npcMemory,
        rpgClassId,
        rpgEquippedItems,
        rpgFoundRelics,
        rpgGold,
        rpgOpenedObjects,
        rpgOwnedEquipment,
        rpgPotionCount,
        rpgQuestStage,
        rpgRelicCollected,
        rpgSlimesDefeated,
      }),
      version: 6,
      migrate: (persistedState) => sanitizePersistedGameState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedGameState(persistedState),
      }),
    },
  ),
);
