import {
  NPC_QUEST_STATUSES,
  NPC_TOPICS,
  type NpcMemory,
  type NpcQuestStatus,
} from "@/lib/npcChat";
import {
  getRpgEquipment,
  RPG_SHOP_ITEMS,
  type RpgEquipmentId,
  type RpgEquipmentSlot,
} from "@/lib/rpgShop";
import { RPG_RELICS, type RpgRelicId } from "@/lib/rpgRelics";
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
  const maxHp = 60 + (armor?.stats.maxHp ?? 0);
  const hp = clampNumber(persisted.hp, 0, maxHp, maxHp);
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
    experience: clampNumber(persisted.experience, 0, 100, 0),
    hp,
    level: clampNumber(persisted.level, 1, 99, 1),
    maxHp,
    npcMemory,
    rpgEquippedItems: equippedItems,
    rpgFoundRelics: Array.isArray(persisted.rpgFoundRelics)
      ? [
          ...new Set(
            persisted.rpgFoundRelics.filter(
              (item): item is RpgRelicId =>
                typeof item === "string" &&
                relicIds.has(item as RpgRelicId),
            ),
          ),
        ]
      : [],
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
    rpgQuestStage: questStatus,
    rpgRelicCollected: Boolean(persisted.rpgRelicCollected),
    rpgSlimesDefeated: clampNumber(persisted.rpgSlimesDefeated, 0, 3, 0),
    rpgStatus: (hp === 0 ? "lost" : "playing") as RpgRunStatus,
  };
}
