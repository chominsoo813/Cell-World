import {
  NPC_QUEST_STATUSES,
  NPC_TOPICS,
  type NpcMemory,
  type NpcQuestStatus,
} from "@/lib/npcChat";
import {
  isKeeperLevelId,
  KEEPER_LEVEL_IDS,
  type KeeperLevelId,
} from "@/game/keeperLevels";
import {
  getRpgEquipment,
  RPG_SHOP_ITEMS,
  type RpgEquipmentId,
  type RpgEquipmentSlot,
} from "@/lib/rpgShop";
import {
  getRpgRelicBonuses,
  RPG_RELICS,
  type RpgRelicId,
  type RpgRelicLevels,
} from "@/lib/rpgRelics";
import {
  getRpgClass,
  isRpgClassId,
  type RpgClassId,
} from "@/lib/rpgClasses";
import type {
  GameStore,
  RpgQuestStage,
  RpgRunStatus,
} from "@/stores/gameStore";

function clampNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

export function sanitizePersistedGameState(
  value: unknown,
): Partial<GameStore> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const persisted = value as Record<string, unknown>;
  const equipmentIds = new Set(RPG_SHOP_ITEMS.map((item) => item.id));
  const relicIds = new Set<RpgRelicId>(RPG_RELICS.map((relic) => relic.id));
  const legacyFoundRelics = Array.isArray(persisted.rpgFoundRelics)
    ? [
        ...new Set(
          persisted.rpgFoundRelics.filter(
            (item): item is RpgRelicId =>
              typeof item === "string" &&
              relicIds.has(item as RpgRelicId),
          ),
        ),
      ]
    : [];
  const relicLevelSource =
    persisted.rpgRelicLevels &&
    typeof persisted.rpgRelicLevels === "object"
      ? (persisted.rpgRelicLevels as Record<string, unknown>)
      : {};
  const rpgRelicLevels: RpgRelicLevels = {};
  for (const relicId of relicIds) {
    const persistedLevel = relicLevelSource[relicId];
    const legacyLevel = legacyFoundRelics.includes(relicId) ? 1 : 0;
    const level = clampNumber(persistedLevel, 0, 99, legacyLevel);
    if (level > 0) {
      rpgRelicLevels[relicId] = level;
    }
  }
  const ownedEquipment = Array.isArray(persisted.rpgOwnedEquipment)
    ? [
        ...new Set(
          persisted.rpgOwnedEquipment.filter(
            (item): item is RpgEquipmentId =>
              typeof item === "string" &&
              equipmentIds.has(item as RpgEquipmentId),
          ),
        ),
      ]
    : [];
  const equippedSource =
    persisted.rpgEquippedItems &&
    typeof persisted.rpgEquippedItems === "object"
      ? (persisted.rpgEquippedItems as Record<string, unknown>)
      : {};
  const equippedItems: Partial<
    Record<RpgEquipmentSlot, RpgEquipmentId>
  > = {};

  for (const slot of ["accessory", "armor", "weapon"] as const) {
    const equipmentId = equippedSource[slot];
    const equipment =
      typeof equipmentId === "string"
        ? getRpgEquipment(equipmentId as RpgEquipmentId)
        : undefined;
    if (
      equipment &&
      equipment.slot === slot &&
      ownedEquipment.includes(equipment.id)
    ) {
      equippedItems[slot] = equipment.id;
    }
  }

  const armor = getRpgEquipment(equippedItems.armor);
  const maxHp =
    60 +
    (armor?.stats.maxHp ?? 0) +
    getRpgRelicBonuses(rpgRelicLevels).maxHp;
  const hp = clampNumber(persisted.hp, 0, maxHp, maxHp);
  const rawLevel = clampNumber(persisted.level, 1, 99, 1);
  const rawExperience = clampNumber(
    persisted.experience,
    0,
    9_999,
    0,
  );
  const level = Math.min(99, rawLevel + Math.floor(rawExperience / 100));
  const experience = Math.min(99, rawExperience % 100);
  const persistedClassId = isRpgClassId(persisted.rpgClassId)
    ? persisted.rpgClassId
    : "adventurer";
  const persistedClass = getRpgClass(persistedClassId);
  const classMinimumLevel = persistedClass.tier === 2 ? 10 : persistedClass.tier === 1 ? 5 : 1;
  const rpgClassId: RpgClassId =
    level >= classMinimumLevel ? persistedClassId : "adventurer";
  const questStatus = NPC_QUEST_STATUSES.includes(
    persisted.rpgQuestStage as RpgQuestStage,
  )
    ? (persisted.rpgQuestStage as RpgQuestStage)
    : "meet_elder";
  const npcMemorySource =
    persisted.npcMemory && typeof persisted.npcMemory === "object"
      ? (persisted.npcMemory as Record<string, unknown>)
      : null;
  const npcMemory =
    npcMemorySource &&
    NPC_QUEST_STATUSES.includes(
      npcMemorySource.questStatus as NpcQuestStatus,
    ) &&
    NPC_TOPICS.includes(
      npcMemorySource.recentTopic as NpcMemory["recentTopic"],
    )
      ? ({
          questStatus: npcMemorySource.questStatus,
          recentTopic: npcMemorySource.recentTopic,
        } as NpcMemory)
      : null;
  const keeperLevel = isKeeperLevelId(persisted.keeperLevel)
    ? persisted.keeperLevel
    : 1;
  const persistedUnlockedLevel = isKeeperLevelId(
    persisted.keeperUnlockedLevel,
  )
    ? persisted.keeperUnlockedLevel
    : 1;
  const keeperUnlockedLevel = Math.max(
    keeperLevel,
    persistedUnlockedLevel,
  ) as KeeperLevelId;
  const keeperBestTimesSource =
    persisted.keeperBestTimes &&
    typeof persisted.keeperBestTimes === "object"
      ? (persisted.keeperBestTimes as Record<string, unknown>)
      : {};
  const keeperBestTimes = Object.fromEntries(
    KEEPER_LEVEL_IDS.flatMap((levelId) => {
      const value = keeperBestTimesSource[levelId];
      return typeof value === "number" && Number.isFinite(value)
        ? [[levelId, clampNumber(value, 0, 999, 0)]]
        : [];
    }),
  ) as Partial<Record<KeeperLevelId, number>>;
  const keeperCompletedSessions = Array.isArray(persisted.keeperCompletedSessions)
    ? [
        ...new Set(
          persisted.keeperCompletedSessions.filter(isKeeperLevelId),
        ),
      ]
    : [];

  return {
    defenceAttackDelay: clampNumber(
      persisted.defenceAttackDelay,
      240,
      620,
      620,
    ),
    defenceDamage: clampNumber(persisted.defenceDamage, 2, 50, 2),
    defenceLevel: clampNumber(persisted.defenceLevel, 1, 99, 1),
    defenceMaxHp: clampNumber(persisted.defenceMaxHp, 100, 1_000, 100),
    defenceMoveSpeed: clampNumber(
      persisted.defenceMoveSpeed,
      100,
      500,
      210,
    ),
    experience,
    hp,
    keeperBestTimes,
    keeperCompletedSessions,
    keeperLevel,
    keeperUnlockedLevel,
    level,
    maxHp,
    npcMemory,
    rpgClassId,
    rpgEquippedItems: equippedItems,
    rpgFoundRelics: [
      ...legacyFoundRelics,
      ...RPG_RELICS.map(({ id }) => id).filter(
        (id) =>
          (rpgRelicLevels[id] ?? 0) > 0 &&
          !legacyFoundRelics.includes(id),
      ),
    ],
    rpgRelicLevels,
    rpgGold: clampNumber(persisted.rpgGold, 0, 999_999, 0),
    rpgOpenedObjects: Array.isArray(persisted.rpgOpenedObjects)
      ? [
          ...new Set(
            persisted.rpgOpenedObjects.filter(
              (item): item is string =>
                typeof item === "string" && item.length <= 64,
            ),
          ),
        ].slice(0, 50)
      : [],
    rpgOwnedEquipment: ownedEquipment,
    rpgPotionCount: clampNumber(persisted.rpgPotionCount, 0, 99, 0),
    rpgQuestStage: questStatus,
    rpgRelicCollected: Boolean(persisted.rpgRelicCollected),
    rpgSlimesDefeated: clampNumber(persisted.rpgSlimesDefeated, 0, 3, 0),
    rpgStatus: (hp === 0 ? "lost" : "playing") as RpgRunStatus,
  };
}
