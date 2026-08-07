"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  isPlayableGameId,
  type GameId,
} from "@/lib/gameCatalog";
import {
  getNextKeeperLevel,
  type KeeperLevelId,
} from "@/game/keeperLevels";
import type { OfficeSheetId } from "@/game/officeRefSheets";
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
import {
  createEmptyRpgCharacter,
  MAX_RPG_CHARACTERS,
  normalizeRpgCharacterName,
  type RpgControlScheme,
  type RpgCharacterCreateResult,
  type RpgCharacterProfile,
  type RpgCharacterRenameResult,
} from "@/lib/rpgCharacters";
import {
  getRpgWeaponEnhancementChance,
  getRpgWeaponEnhancementCost,
} from "@/lib/rpgEnhancement";
import {
  getRpgRelicBonuses,
  type RpgRelicId,
  type RpgRelicLevels,
} from "@/lib/rpgRelics";
import {
  getRpgJobChangeOptions,
  getRpgSecondJobSwitchOptions,
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

export interface RpgWeaponEnhancementResult {
  chance: number;
  cost: number;
  level: number;
  status:
    | "failed"
    | "insufficient_gold"
    | "max_level"
    | "no_character"
    | "success";
}

interface KeeperSnapshot {
  alerts?: number;
  calc?: number;
  collectedDocuments?: KeeperDocumentId[];
  documents?: number;
  exitUnlocked?: boolean;
  hideActive?: boolean;
  hideRemaining?: number;
  status?: RunStatus;
  terminalChecked?: boolean;
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
  rpgControlScheme: RpgControlScheme;
  rpgGold: number;
  rpgPotionCount: number;
  rpgFoundRelics: RpgRelicId[];
  rpgRelicLevels: RpgRelicLevels;
  rpgQuestStage: RpgQuestStage;
  rpgRelicCollected: boolean;
  rpgSlimesDefeated: number;
  rpgOpenedObjects: string[];
  rpgDialogue: RpgDialogueMessage | null;
  rpgShopOpen: boolean;
  rpgBlacksmithOpen: boolean;
  rpgCharacterSelectOpen: boolean;
  rpgControlSchemeOpen: boolean;
  rpgGuideOpen: boolean;
  rpgJobSwitchOpen: boolean;
  rpgRelicArchiveOpen: boolean;
  rpgCharacterStatsOpen: boolean;
  rpgCharacters: RpgCharacterProfile[];
  activeRpgCharacterId: string | null;
  rpgOwnedEquipment: RpgEquipmentId[];
  rpgEquippedItems: Partial<Record<RpgEquipmentSlot, RpgEquipmentId>>;
  rpgWeaponEnhancementLevel: number;
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
  keeperCalc: number;
  keeperExitUnlocked: boolean;
  keeperHideActive: boolean;
  keeperHideRemaining: number;
  keeperTerminalChecked: boolean;
  keeperLevel: KeeperLevelId;
  keeperSheet: OfficeSheetId;
  keeperUnlockedLevel: KeeperLevelId;
  keeperCompletedSessions: KeeperLevelId[];
  keeperBestTimes: Partial<Record<KeeperLevelId, number>>;

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
  openRpgJobSwitch: () => boolean;
  closeRpgJobSwitch: () => void;
  switchRpgSecondJob: (classId: RpgClassId) => boolean;
  earnRpgGold: (amount: number) => void;
  collectRpgPotion: (amount?: number) => void;
  recordRpgRaidClear: (durationMs: number) => void;
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
  openRpgBlacksmith: () => void;
  closeRpgBlacksmith: () => void;
  openRpgCharacterSelect: () => void;
  closeRpgCharacterSelect: () => void;
  openRpgControlScheme: () => void;
  closeRpgControlScheme: () => void;
  setRpgControlScheme: (scheme: RpgControlScheme) => void;
  renameRpgCharacter: (
    characterId: string,
    name: string,
  ) => RpgCharacterRenameResult;
  deleteRpgCharacter: (characterId: string) => boolean;
  openRpgGuide: () => void;
  closeRpgGuide: () => void;
  openRpgRelicArchive: () => void;
  closeRpgRelicArchive: () => void;
  toggleRpgCharacterStats: () => void;
  closeRpgCharacterStats: () => void;
  createRpgCharacter: (name: string) => RpgCharacterCreateResult;
  selectRpgCharacter: (characterId: string) => boolean;
  enhanceRpgWeapon: (roll?: number) => RpgWeaponEnhancementResult;
  buyRpgEquipment: (equipmentId: RpgEquipmentId) => boolean;
  equipRpgEquipment: (equipmentId: RpgEquipmentId) => void;
  acceptRpgQuest: () => void;
  collectRpgRelic: () => void;
  defeatRpgSlime: () => void;
  completeRpgQuest: () => void;
  acceptLumiQuest: () => void;
  speakToRangerRowan: () => void;
  speakToRelicKeeperDigger: () => void;
  openNpcDialogue: () => void;
  closeNpcDialogue: () => void;
  setNpcResponse: (
    dialogue: string,
    memory?: NpcMemory,
    expectedCharacterId?: string | null,
  ) => void;
  setNpcLoading: (isLoading: boolean) => void;
  updateKeeper: (snapshot: KeeperSnapshot) => void;
  selectKeeperLevel: (level: KeeperLevelId) => void;
  selectKeeperSheet: (sheet: OfficeSheetId) => void;
  completeKeeperLevel: (timeRemaining: number) => void;
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
  rpgControlScheme: "keyboard" as RpgControlScheme,
  rpgGold: 0,
  rpgPotionCount: 0,
  rpgFoundRelics: [] as RpgRelicId[],
  rpgRelicLevels: {} as RpgRelicLevels,
  rpgQuestStage: "meet_elder" as RpgQuestStage,
  rpgRelicCollected: false,
  rpgSlimesDefeated: 0,
  rpgOpenedObjects: [] as string[],
  rpgDialogue: null as RpgDialogueMessage | null,
  rpgShopOpen: false,
  rpgBlacksmithOpen: false,
  rpgCharacterSelectOpen: false,
  rpgControlSchemeOpen: false,
  rpgGuideOpen: false,
  rpgJobSwitchOpen: false,
  rpgRelicArchiveOpen: false,
  rpgCharacterStatsOpen: false,
  rpgOwnedEquipment: [] as RpgEquipmentId[],
  rpgEquippedItems: {} as Partial<
    Record<RpgEquipmentSlot, RpgEquipmentId>
  >,
  rpgWeaponEnhancementLevel: 0,
  rpgStatus: "playing" as RpgRunStatus,
  npcDialogueOpen: false,
  npcLastDialogue:
    "북쪽 숲의 셀 값이 흔들리고 있네. 자네의 도움이 필요하네.",
  npcMemory: null as NpcMemory | null,
  npcIsLoading: false,
};

const rpgCharacterState = {
  activeRpgCharacterId: null as string | null,
  rpgCharacters: [] as RpgCharacterProfile[],
};

const keeperRuntimeState = {
  keeperStatus: "idle" as RunStatus,
  keeperTimeRemaining: 90,
  keeperDocuments: 0,
  keeperCollectedDocuments: [] as KeeperDocumentId[],
  keeperAlerts: 0,
  keeperCalc: 5,
  keeperExitUnlocked: false,
  keeperHideActive: false,
  keeperHideRemaining: 0,
  keeperTerminalChecked: false,
};

const keeperProgressState = {
  keeperLevel: 1 as KeeperLevelId,
  keeperSheet: 1 as OfficeSheetId,
  keeperUnlockedLevel: 1 as KeeperLevelId,
  keeperCompletedSessions: [] as KeeperLevelId[],
  keeperBestTimes: {} as Partial<Record<KeeperLevelId, number>>,
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

function snapshotActiveRpgCharacter(
  state: GameStore,
  timestamp = Date.now(),
) {
  if (!state.activeRpgCharacterId) {
    return state.rpgCharacters;
  }

  return state.rpgCharacters.map((profile) =>
    profile.id === state.activeRpgCharacterId
      ? {
          ...profile,
          experience: state.experience,
          hp: state.hp,
          level: state.level,
          npcMemory: state.npcMemory
            ? { ...state.npcMemory }
            : null,
          rpgClassId: state.rpgClassId,
          rpgControlScheme: state.rpgControlScheme,
          rpgEquippedItems: { ...state.rpgEquippedItems },
          rpgFoundRelics: [...state.rpgFoundRelics],
          rpgGold: state.rpgGold,
          rpgOpenedObjects: [...state.rpgOpenedObjects],
          rpgOwnedEquipment: [...state.rpgOwnedEquipment],
          rpgPotionCount: state.rpgPotionCount,
          rpgQuestStage: state.rpgQuestStage,
          rpgRaidBestTimeMs: profile.rpgRaidBestTimeMs,
          rpgRelicCollected: state.rpgRelicCollected,
          rpgRelicLevels: { ...state.rpgRelicLevels },
          rpgSlimesDefeated: state.rpgSlimesDefeated,
          rpgWeaponEnhancementLevel:
            state.rpgWeaponEnhancementLevel,
          updatedAt: Math.max(profile.updatedAt, timestamp),
        }
      : profile,
  );
}

function getRpgCharacterProjection(profile: RpgCharacterProfile) {
  const armor = getRpgEquipment(profile.rpgEquippedItems.armor);
  const maxHp =
    60 +
    (armor?.stats.maxHp ?? 0) +
    getRpgRelicBonuses(profile.rpgRelicLevels).maxHp;
  const hp = Math.min(maxHp, Math.max(0, Math.floor(profile.hp)));

  return {
    experience: profile.experience,
    hp,
    level: profile.level,
    maxHp,
    npcMemory: profile.npcMemory
      ? { ...profile.npcMemory }
      : null,
    npcLastDialogue: rpgState.npcLastDialogue,
    rpgBlacksmithOpen: false,
    rpgCharacterSelectOpen: false,
    rpgControlSchemeOpen: false,
    rpgGuideOpen: !profile.rpgGuideSeen,
    rpgJobSwitchOpen: false,
    rpgRelicArchiveOpen: false,
    rpgCharacterStatsOpen: false,
    rpgClassId: profile.rpgClassId,
    rpgControlScheme: profile.rpgControlScheme,
    rpgDialogue: null,
    rpgEquippedItems: { ...profile.rpgEquippedItems },
    rpgFoundRelics: [...profile.rpgFoundRelics],
    rpgGold: profile.rpgGold,
    rpgOpenedObjects: [...profile.rpgOpenedObjects],
    rpgOwnedEquipment: [...profile.rpgOwnedEquipment],
    rpgPotionCount: profile.rpgPotionCount,
    rpgQuestStage: profile.rpgQuestStage,
    rpgRelicCollected: profile.rpgRelicCollected,
    rpgRelicLevels: { ...profile.rpgRelicLevels },
    rpgShopOpen: false,
    rpgSlimesDefeated: profile.rpgSlimesDefeated,
    rpgStatus: (hp === 0 ? "lost" : "playing") as RpgRunStatus,
    rpgWeaponEnhancementLevel:
      profile.rpgWeaponEnhancementLevel,
  };
}

function createRpgCharacterId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid ??
    `character-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      const setRpg = (
        update:
          | Partial<GameStore>
          | ((state: GameStore) => Partial<GameStore> | GameStore),
      ) =>
        set((state) => {
          const patch =
            typeof update === "function" ? update(state) : update;
          if (patch === state) {
            return state;
          }
          const nextState = { ...state, ...patch } as GameStore;
          return {
            ...patch,
            rpgCharacters: snapshotActiveRpgCharacter(nextState),
          };
        });

      return {
      activeView: "home",
      ...sessionState,
      ...rpgState,
      ...rpgCharacterState,
      ...keeperRuntimeState,
      ...keeperProgressState,
      ...defenceState,

      setActiveView: (activeView) =>
        set((state) => {
          const nextActiveView =
            activeView === "home" || isPlayableGameId(activeView)
              ? activeView
              : "home";

          return {
            activeView: nextActiveView,
            formulaText:
              nextActiveView === "home"
                ? "CELL_WORLD.START()"
                : `=PLAY("${nextActiveView.toUpperCase()}")`,
            npcDialogueOpen: false,
            rpgDialogue: null,
            rpgShopOpen: false,
            rpgBlacksmithOpen: false,
            rpgCharacterSelectOpen: nextActiveView === "rpg",
            rpgControlSchemeOpen: false,
            rpgGuideOpen: false,
            rpgJobSwitchOpen: false,
            rpgCharacters: snapshotActiveRpgCharacter(state),
          };
        }),
      setSelectedCell: (selectedCell, formulaText = "") =>
        set({ selectedCell, formulaText }),
      setPlayerPosition: (selectedCell) =>
        set({
          selectedCell,
          formulaText: `=PLAYER.POSITION("${selectedCell}")`,
        }),
      damageRpgPlayer: (amount) =>
        setRpg((state) => {
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
                  rpgBlacksmithOpen: false,
                  rpgCharacterSelectOpen: false,
                  rpgControlSchemeOpen: false,
                  rpgGuideOpen: false,
                  rpgJobSwitchOpen: false,
                }
              : {}),
          };
        }),
      healRpgPlayer: (amount) =>
        setRpg((state) =>
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
        setRpg((state) => addRpgExperience(state, amount)),
      chooseRpgClass: (classId) => {
        const state = get();
        const isAvailable = getRpgJobChangeOptions(
          state.level,
          state.rpgClassId,
        ).some((definition) => definition.id === classId);

        if (!isAvailable) {
          return false;
        }

        setRpg({
          rpgClassId: classId,
          formulaText: `=JOB.CHANGE("${classId.toUpperCase()}")`,
        });
        return true;
      },
      openRpgJobSwitch: () => {
        const state = get();
        const hasAvailableJob =
          Boolean(state.activeRpgCharacterId) &&
          getRpgSecondJobSwitchOptions(
            state.level,
            state.rpgClassId,
          ).length > 0;

        if (!hasAvailableJob) {
          return false;
        }

        setRpg({
          npcDialogueOpen: false,
          npcIsLoading: false,
          rpgDialogue: null,
          rpgShopOpen: false,
          rpgBlacksmithOpen: false,
          rpgCharacterSelectOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: true,
          rpgRelicArchiveOpen: false,
          formulaText: '=JOB.SWITCH.OPEN("ARON")',
        });
        return true;
      },
      closeRpgJobSwitch: () => set({ rpgJobSwitchOpen: false }),
      switchRpgSecondJob: (classId) => {
        const state = get();
        const isAvailable =
          Boolean(state.activeRpgCharacterId) &&
          state.rpgJobSwitchOpen &&
          getRpgSecondJobSwitchOptions(
            state.level,
            state.rpgClassId,
          ).some((definition) => definition.id === classId);

        if (!isAvailable) {
          return false;
        }

        setRpg({
          rpgClassId: classId,
          formulaText: `=JOB.SWITCH("${classId.toUpperCase()}")`,
        });
        return true;
      },
      earnRpgGold: (amount) =>
        setRpg((state) => ({
          rpgGold: state.rpgGold + Math.max(0, amount),
        })),
      collectRpgPotion: (amount = 1) =>
        setRpg((state) => ({
          rpgPotionCount: Math.min(
            99,
            state.rpgPotionCount + Math.max(0, Math.floor(amount)),
          ),
          formulaText: `=PICKUP.POTION(${Math.max(0, Math.floor(amount))})`,
        })),
      recordRpgRaidClear: (durationMs) => {
        const state = get();
        const characterId = state.activeRpgCharacterId;
        const bestTime = Math.max(1, Math.floor(durationMs));
        if (!characterId) return;

        const savedCharacters = snapshotActiveRpgCharacter(state);
        const profile = savedCharacters.find((entry) => entry.id === characterId);
        if (
          profile &&
          profile.rpgRaidBestTimeMs !== null &&
          profile.rpgRaidBestTimeMs <= bestTime
        ) {
          return;
        }

        const timestamp = Date.now();
        set({
          formulaText: `=RAID.RECORD(${bestTime})`,
          rpgCharacters: savedCharacters.map((entry) =>
            entry.id === characterId
              ? {
                  ...entry,
                  rpgRaidBestTimeMs: bestTime,
                  updatedAt: timestamp,
                }
              : entry,
          ),
        });
      },
      useRpgPotion: () => {
        const state = get();

        if (
          state.rpgStatus !== "playing" ||
          state.rpgPotionCount <= 0 ||
          state.hp >= state.maxHp
        ) {
          return false;
        }

        setRpg({
          hp: Math.min(state.maxHp, state.hp + 24),
          rpgPotionCount: state.rpgPotionCount - 1,
          formulaText: '=ITEM.USE("HEALTH_POTION")',
        });
        return true;
      },
      collectRpgDroppedRelic: (relicId) => {
        const state = get();
        const previousLevel = state.rpgRelicLevels[relicId] ?? 0;
        const nextLevel = Math.min(99, previousLevel + 1);
        const previousBonuses = getRpgRelicBonuses(state.rpgRelicLevels);
        const nextRelicLevels = {
          ...state.rpgRelicLevels,
          [relicId]: nextLevel,
        };
        const nextBonuses = getRpgRelicBonuses(nextRelicLevels);
        const maxHpIncrease = nextBonuses.maxHp - previousBonuses.maxHp;
        const nextFoundRelics = state.rpgFoundRelics.includes(relicId)
          ? state.rpgFoundRelics
          : [...state.rpgFoundRelics, relicId];
        setRpg({
          hp: state.hp + Math.max(0, maxHpIncrease),
          maxHp: state.maxHp + maxHpIncrease,
          rpgFoundRelics: nextFoundRelics,
          rpgRelicLevels: nextRelicLevels,
          rpgQuestStage:
            state.rpgQuestStage === "explore_dungeons" &&
            nextFoundRelics.length >= 15
              ? "find_digger"
              : state.rpgQuestStage,
          formulaText: `=RELIC.COLLECT("${relicId.toUpperCase()}",${nextLevel})`,
        });
        return true;
      },
      claimRpgReward: (objectId, reward = {}) =>
        setRpg((state) => {
          if (
            state.rpgStatus === "lost" ||
            state.rpgOpenedObjects.includes(objectId)
          ) {
            return state;
          }
          return {
            rpgOpenedObjects: [...state.rpgOpenedObjects, objectId],
            rpgQuestStage:
              objectId === "village_chest" &&
              state.rpgQuestStage === "open_village_chest"
                ? "talk_rowan"
                : state.rpgQuestStage,
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
          rpgBlacksmithOpen: false,
          rpgCharacterSelectOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: false,
          rpgRelicArchiveOpen: false,
        }),
      closeRpgDialogue: () => set({ rpgDialogue: null }),
      openRpgShop: () =>
        set({
          npcDialogueOpen: false,
          rpgDialogue: null,
          rpgShopOpen: true,
          rpgBlacksmithOpen: false,
          rpgCharacterSelectOpen: false,
          rpgControlSchemeOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: false,
          rpgRelicArchiveOpen: false,
          formulaText: '=SHOP.OPEN("MERCHANT_PICO")',
        }),
      closeRpgShop: () => set({ rpgShopOpen: false }),
      openRpgBlacksmith: () =>
        set({
          npcDialogueOpen: false,
          rpgDialogue: null,
          rpgShopOpen: false,
          rpgBlacksmithOpen: true,
          rpgCharacterSelectOpen: false,
          rpgControlSchemeOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: false,
          rpgRelicArchiveOpen: false,
          formulaText: '=BLACKSMITH.OPEN("BRAM")',
        }),
      closeRpgBlacksmith: () => set({ rpgBlacksmithOpen: false }),
      openRpgCharacterSelect: () =>
        set((state) => ({
          npcDialogueOpen: false,
          npcIsLoading: false,
          rpgDialogue: null,
          rpgShopOpen: false,
          rpgBlacksmithOpen: false,
          rpgCharacterSelectOpen: true,
          rpgControlSchemeOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: false,
          rpgRelicArchiveOpen: false,
          rpgCharacters: snapshotActiveRpgCharacter(state),
          formulaText: '=CHARACTER.ROSTER("MERCENARY_OFFICE")',
        })),
      closeRpgCharacterSelect: () =>
        set((state) =>
          state.activeRpgCharacterId
            ? { rpgCharacterSelectOpen: false }
            : state,
        ),
      openRpgControlScheme: () =>
        set((state) =>
          state.activeRpgCharacterId
            ? {
                npcDialogueOpen: false,
                npcIsLoading: false,
                rpgBlacksmithOpen: false,
                rpgCharacterSelectOpen: false,
                rpgControlSchemeOpen: true,
                rpgDialogue: null,
                rpgGuideOpen: false,
                rpgJobSwitchOpen: false,
                rpgRelicArchiveOpen: false,
                formulaText: '=CONTROLS.OPEN("RPG")',
              }
            : state,
        ),
      closeRpgControlScheme: () =>
        setRpg((state) => {
          const profile = state.rpgCharacters.find(
            ({ id }) => id === state.activeRpgCharacterId,
          );
          return {
            rpgControlSchemeOpen: false,
            rpgGuideOpen: Boolean(profile && !profile.rpgGuideSeen),
            formulaText: '=CONTROLS.CONFIRM("RPG")',
          };
        }),
      setRpgControlScheme: (rpgControlScheme) =>
        setRpg({
          rpgControlScheme,
          formulaText: `=CONTROLS.SET("${rpgControlScheme.toUpperCase()}")`,
        }),
      renameRpgCharacter: (characterId, rawName) => {
        const state = get();
        const name = normalizeRpgCharacterName(rawName);
        const profileExists = state.rpgCharacters.some(
          (profile) => profile.id === characterId,
        );

        if (!profileExists) {
          return { status: "not_found" };
        }
        if (!name) {
          return { status: "invalid_name" };
        }
        if (
          state.rpgCharacters.some(
            (profile) =>
              profile.id !== characterId &&
              profile.name.toLocaleLowerCase("ko-KR") ===
                name.toLocaleLowerCase("ko-KR"),
          )
        ) {
          return { status: "duplicate_name" };
        }

        const timestamp = Date.now();
        const savedCharacters = snapshotActiveRpgCharacter(
          state,
          timestamp,
        );
        set({
          formulaText: `=CHARACTER.RENAME("${characterId}")`,
          rpgCharacters: savedCharacters.map((profile) =>
            profile.id === characterId
              ? { ...profile, name, updatedAt: timestamp }
              : profile,
          ),
        });
        return { name, status: "renamed" };
      },
      deleteRpgCharacter: (characterId) => {
        const state = get();
        const savedCharacters = snapshotActiveRpgCharacter(state);

        if (!savedCharacters.some((profile) => profile.id === characterId)) {
          return false;
        }

        const remainingCharacters = savedCharacters.filter(
          (profile) => profile.id !== characterId,
        );

        if (state.activeRpgCharacterId !== characterId) {
          set({
            formulaText: `=CHARACTER.DELETE("${characterId}")`,
            rpgCharacters: remainingCharacters,
          });
          return true;
        }

        const nextProfile = remainingCharacters[0];
        if (nextProfile) {
          set({
            ...getRpgCharacterProjection(nextProfile),
            activeRpgCharacterId: nextProfile.id,
            formulaText: `=CHARACTER.DELETE("${characterId}")`,
            npcDialogueOpen: false,
            npcIsLoading: false,
            rpgCharacterSelectOpen: true,
            rpgCharacters: remainingCharacters,
            rpgGuideOpen: false,
            sessionRevision: state.sessionRevision + 1,
          });
          return true;
        }

        set({
          ...rpgState,
          activeRpgCharacterId: null,
          formulaText: `=CHARACTER.DELETE("${characterId}")`,
          rpgCharacterSelectOpen: true,
          rpgCharacters: [],
          sessionRevision: state.sessionRevision + 1,
        });
        return true;
      },
      openRpgGuide: () =>
        set((state) =>
          state.activeRpgCharacterId
            ? {
                npcDialogueOpen: false,
                npcIsLoading: false,
                rpgDialogue: null,
                rpgShopOpen: false,
                rpgBlacksmithOpen: false,
                rpgCharacterSelectOpen: false,
                rpgControlSchemeOpen: false,
                rpgGuideOpen: true,
                rpgJobSwitchOpen: false,
                rpgRelicArchiveOpen: false,
                formulaText: '=GUIDE.OPEN("VILLAGE")',
              }
            : state,
        ),
      closeRpgGuide: () =>
        set((state) => ({
          rpgGuideOpen: false,
          rpgDialogue:
            state.rpgQuestStage === "meet_elder"
              ? {
                  name: "새로운 퀘스트",
                  portrait: "rpg-character-mage",
                  text: "장로 노라를 찾아가세요.",
                }
              : state.rpgDialogue,
          rpgCharacters: state.rpgCharacters.map((profile) =>
            profile.id === state.activeRpgCharacterId
              ? {
                  ...profile,
                  rpgGuideSeen: true,
                  updatedAt: Date.now(),
                }
              : profile,
          ),
          formulaText: '=GUIDE.COMPLETE("VILLAGE")',
        })),
      openRpgRelicArchive: () =>
        set({
          npcDialogueOpen: false,
          npcIsLoading: false,
          rpgDialogue: null,
          rpgShopOpen: false,
          rpgBlacksmithOpen: false,
          rpgCharacterSelectOpen: false,
          rpgControlSchemeOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: false,
          rpgRelicArchiveOpen: true,
          formulaText: '=RELIC.ARCHIVE.OPEN("DIGGER")',
        }),
      closeRpgRelicArchive: () =>
        set({
          rpgRelicArchiveOpen: false,
          formulaText: '=RELIC.ARCHIVE.CLOSE("DIGGER")',
        }),
      toggleRpgCharacterStats: () =>
        set((state) =>
          state.activeRpgCharacterId && state.rpgStatus === "playing"
            ? {
                rpgCharacterStatsOpen: !state.rpgCharacterStatsOpen,
                formulaText: state.rpgCharacterStatsOpen
                  ? '=CHARACTER.TOTALS.CLOSE()'
                  : '=CHARACTER.TOTALS.OPEN()',
              }
            : state,
        ),
      closeRpgCharacterStats: () =>
        set((state) =>
          state.rpgCharacterStatsOpen
            ? {
                rpgCharacterStatsOpen: false,
                formulaText: '=CHARACTER.TOTALS.CLOSE()',
              }
            : state,
        ),
      createRpgCharacter: (rawName) => {
        const state = get();
        const name = normalizeRpgCharacterName(rawName);

        if (!name) {
          return { status: "invalid_name" };
        }
        if (
          state.rpgCharacters.some(
            (profile) =>
              profile.name.toLocaleLowerCase("ko-KR") ===
              name.toLocaleLowerCase("ko-KR"),
          )
        ) {
          return { status: "duplicate_name" };
        }
        if (state.rpgCharacters.length >= MAX_RPG_CHARACTERS) {
          return { status: "limit_reached" };
        }

        const timestamp = Date.now();
        const characterId = createRpgCharacterId();
        const profile = createEmptyRpgCharacter(
          characterId,
          name,
          timestamp,
        );
        const savedCharacters = snapshotActiveRpgCharacter(
          state,
          timestamp,
        );

        setRpg({
          ...getRpgCharacterProjection(profile),
          activeRpgCharacterId: characterId,
          formulaText: `=CHARACTER.CREATE("${characterId}")`,
          npcDialogueOpen: false,
          npcIsLoading: false,
          rpgControlSchemeOpen: true,
          rpgGuideOpen: false,
          rpgCharacters: [...savedCharacters, profile],
          sessionRevision: state.sessionRevision + 1,
        });
        return { characterId, status: "created" };
      },
      selectRpgCharacter: (characterId) => {
        const state = get();
        const savedCharacters = snapshotActiveRpgCharacter(state);
        const profile = savedCharacters.find(
          (character) => character.id === characterId,
        );

        if (!profile) {
          return false;
        }

        setRpg({
          ...getRpgCharacterProjection(profile),
          activeRpgCharacterId: profile.id,
          formulaText: `=CHARACTER.SELECT("${profile.id}")`,
          npcDialogueOpen: false,
          npcIsLoading: false,
          rpgControlSchemeOpen: true,
          rpgGuideOpen: false,
          rpgCharacters: savedCharacters,
          sessionRevision: state.sessionRevision + 1,
        });
        return true;
      },
      enhanceRpgWeapon: (roll) => {
        const state = get();
        const level = state.rpgWeaponEnhancementLevel;
        const cost = getRpgWeaponEnhancementCost(level);
        const chance = getRpgWeaponEnhancementChance(level);

        if (!state.activeRpgCharacterId) {
          return {
            chance: chance ?? 0,
            cost: cost ?? 0,
            level,
            status: "no_character",
          };
        }
        if (cost === null || chance === null) {
          return {
            chance: 0,
            cost: 0,
            level,
            status: "max_level",
          };
        }
        if (state.rpgGold < cost) {
          return {
            chance,
            cost,
            level,
            status: "insufficient_gold",
          };
        }

        const randomValue =
          typeof roll === "number" && Number.isFinite(roll)
            ? Math.min(1, Math.max(0, roll))
            : Math.random();
        const succeeded = randomValue < chance;
        const nextLevel = succeeded ? level + 1 : level;
        setRpg({
          formulaText: `=WEAPON.ENHANCE(${level},${succeeded ? '"SUCCESS"' : '"FAILED"'})`,
          rpgGold: state.rpgGold - cost,
          rpgWeaponEnhancementLevel: nextLevel,
        });
        return {
          chance,
          cost,
          level: nextLevel,
          status: succeeded ? "success" : "failed",
        };
      },
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

        setRpg({
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
        setRpg((state) => {
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
        setRpg((state) =>
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
        setRpg((state) =>
          state.rpgQuestStage === "collect_relic"
            ? {
                rpgRelicCollected: true,
                rpgQuestStage: "defeat_slimes",
                formulaText: '=ITEM.GET("FORMULA_CORE")',
              }
            : state,
        ),
      defeatRpgSlime: () =>
        setRpg((state) => {
          const defeated = Math.min(3, state.rpgSlimesDefeated + 1);
          return {
            rpgSlimesDefeated: defeated,
            rpgQuestStage:
              defeated >= 3 ? ("return_elder" as RpgQuestStage) : state.rpgQuestStage,
            formulaText: `=BATTLE.SLIME(${defeated}/3)`,
          };
        }),
      completeRpgQuest: () =>
        setRpg((state) =>
          state.rpgQuestStage === "return_elder"
            ? {
                rpgQuestStage: "talk_lumi",
                rpgGold: state.rpgGold + 100,
                ...addRpgExperience(state, 100),
                npcLastDialogue:
                  "셀의 균열이 닫혔군. CELL WORLD의 첫 번째 수식을 복구했네!",
                formulaText: '=QUEST.COMPLETE("BROKEN_FORMULA")',
              }
            : state,
        ),
      acceptLumiQuest: () =>
        setRpg((state) =>
          state.rpgQuestStage === "talk_lumi" || state.rpgQuestStage === "complete"
            ? {
                rpgQuestStage: "open_village_chest",
                formulaText: '=QUEST.ACCEPT("VILLAGE_CHEST")',
              }
            : state,
        ),
      speakToRangerRowan: () =>
        setRpg((state) =>
          state.rpgQuestStage === "talk_rowan"
            ? {
                rpgQuestStage:
                  state.rpgFoundRelics.length >= 15
                    ? "find_digger"
                    : "explore_dungeons",
                formulaText: '=QUEST.ACCEPT("ENDLESS_GROWTH")',
              }
            : state,
        ),
      speakToRelicKeeperDigger: () =>
        setRpg((state) =>
          state.rpgQuestStage === "find_digger"
            ? {
                rpgQuestStage: "altar_challenge",
                formulaText: '=QUEST.COMPLETE("RELIC_COLLECTION")',
              }
            : state,
        ),
      openNpcDialogue: () =>
        set({
          npcDialogueOpen: true,
          rpgDialogue: null,
          rpgShopOpen: false,
          rpgBlacksmithOpen: false,
          rpgCharacterSelectOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: false,
          rpgRelicArchiveOpen: false,
        }),
      closeNpcDialogue: () => set({ npcDialogueOpen: false, npcIsLoading: false }),
      setNpcResponse: (
        npcLastDialogue,
        npcMemory,
        expectedCharacterId,
      ) =>
        setRpg((state) =>
          expectedCharacterId !== undefined &&
          state.activeRpgCharacterId !== expectedCharacterId
            ? state
            : {
                npcLastDialogue,
                npcMemory: npcMemory ?? state.npcMemory,
                npcIsLoading: false,
              },
        ),
      setNpcLoading: (npcIsLoading) => set({ npcIsLoading }),
      updateKeeper: (snapshot) =>
        set({
          ...(snapshot.alerts === undefined
            ? {}
            : { keeperAlerts: snapshot.alerts }),
          ...(snapshot.calc === undefined
            ? {}
            : { keeperCalc: snapshot.calc }),
          ...(snapshot.documents === undefined
            ? {}
            : { keeperDocuments: snapshot.documents }),
          ...(snapshot.collectedDocuments === undefined
            ? {}
            : { keeperCollectedDocuments: snapshot.collectedDocuments }),
          ...(snapshot.exitUnlocked === undefined
            ? {}
            : { keeperExitUnlocked: snapshot.exitUnlocked }),
          ...(snapshot.hideActive === undefined
            ? {}
            : { keeperHideActive: snapshot.hideActive }),
          ...(snapshot.hideRemaining === undefined
            ? {}
            : { keeperHideRemaining: snapshot.hideRemaining }),
          ...(snapshot.status === undefined
            ? {}
            : { keeperStatus: snapshot.status }),
          ...(snapshot.terminalChecked === undefined
            ? {}
            : { keeperTerminalChecked: snapshot.terminalChecked }),
          ...(snapshot.timeRemaining === undefined
            ? {}
            : { keeperTimeRemaining: snapshot.timeRemaining }),
        }),
      selectKeeperLevel: (level) =>
        set((state) => ({
          ...keeperRuntimeState,
          formulaText: `=OFFICE.SESSION(${level},${state.keeperSheet})`,
          keeperLevel: level,
          sessionRevision: state.sessionRevision + 1,
        })),
      selectKeeperSheet: (keeperSheet) =>
        set((state) => ({
          ...keeperRuntimeState,
          formulaText: `=OFFICE.SHEET(${state.keeperLevel},${keeperSheet})`,
          keeperSheet,
          sessionRevision: state.sessionRevision + 1,
        })),
      completeKeeperLevel: (timeRemaining) =>
        set((state) => {
          const nextLevel = getNextKeeperLevel(state.keeperLevel);
          const bestTime = state.keeperBestTimes[state.keeperLevel] ?? 0;
          const unlockedLevel =
            nextLevel && nextLevel > state.keeperUnlockedLevel
              ? nextLevel
              : state.keeperUnlockedLevel;

          return {
            keeperBestTimes: {
              ...state.keeperBestTimes,
              [state.keeperLevel]: Math.max(bestTime, timeRemaining),
            },
            keeperCompletedSessions: state.keeperCompletedSessions.includes(state.keeperLevel)
              ? state.keeperCompletedSessions
              : [...state.keeperCompletedSessions, state.keeperLevel],
            keeperStatus: "won",
            keeperUnlockedLevel: unlockedLevel,
            formulaText: `=KEEPER.COMPLETE(${state.keeperLevel})`,
          };
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
        setRpg((state) => ({
          hp: state.maxHp,
          npcDialogueOpen: false,
          npcIsLoading: false,
          rpgDialogue: null,
          rpgShopOpen: false,
          rpgBlacksmithOpen: false,
          rpgCharacterSelectOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: false,
          rpgCharacterStatsOpen: false,
          rpgStatus: "playing",
          sessionRevision: state.sessionRevision + 1,
        })),
      resetGame: (gameId) => {
        if (gameId === "rpg") {
          setRpg((state) => ({
            ...rpgState,
            sessionRevision: state.sessionRevision + 1,
          }));
          return;
        }

        set((state) => ({
          sessionRevision: state.sessionRevision + 1,
          npcDialogueOpen: false,
          rpgDialogue: null,
          rpgShopOpen: false,
          rpgBlacksmithOpen: false,
          rpgCharacterSelectOpen: false,
          rpgGuideOpen: false,
          rpgJobSwitchOpen: false,
          rpgCharacterStatsOpen: false,
          ...(gameId === "keeper" ? keeperRuntimeState : {}),
          ...(gameId === "defence" ? defenceState : {}),
        }));
      },
      };
    },
    {
      name: "cell-world-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeRpgCharacterId: state.activeRpgCharacterId,
        defenceAttackDelay: state.defenceAttackDelay,
        defenceDamage: state.defenceDamage,
        defenceLevel: state.defenceLevel,
        defenceMaxHp: state.defenceMaxHp,
        defenceMoveSpeed: state.defenceMoveSpeed,
        keeperBestTimes: state.keeperBestTimes,
        keeperCompletedSessions: state.keeperCompletedSessions,
        keeperLevel: state.keeperLevel,
        keeperUnlockedLevel: state.keeperUnlockedLevel,
        rpgCharacters: snapshotActiveRpgCharacter(
          state,
          state.rpgCharacters.find(
            (profile) => profile.id === state.activeRpgCharacterId,
          )?.updatedAt ?? 0,
        ),
      }),
      version: 11,
      migrate: (persistedState) => sanitizePersistedGameState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedGameState(persistedState),
      }),
    },
  ),
);
