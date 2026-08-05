import {
  isKeeperLevelId,
  KEEPER_LEVEL_IDS,
  type KeeperLevelId,
} from "@/game/keeperLevels";
import {
  LEGACY_RPG_CHARACTER_ID,
  MAX_RPG_CHARACTERS,
  normalizeRpgCharacterName,
  type RpgCharacterProfile,
} from "@/lib/rpgCharacters";
import {
  NPC_QUEST_STATUSES,
  NPC_TOPICS,
  type NpcMemory,
  type NpcQuestStatus,
} from "@/lib/npcChat";
import {
  getRpgClass,
  isRpgClassId,
  type RpgClassId,
} from "@/lib/rpgClasses";
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
import type {
  GameStore,
  RpgQuestStage,
  RpgRunStatus,
} from "@/stores/gameStore";

const EQUIPMENT_IDS = new Set(
  RPG_SHOP_ITEMS.map((item) => item.id),
);
const RELIC_IDS = new Set<RpgRelicId>(
  RPG_RELICS.map((relic) => relic.id),
);
const LEGACY_RPG_FIELDS = [
  "experience",
  "hp",
  "level",
  "npcMemory",
  "rpgClassId",
  "rpgEquippedItems",
  "rpgFoundRelics",
  "rpgGold",
  "rpgOpenedObjects",
  "rpgOwnedEquipment",
  "rpgPotionCount",
  "rpgQuestStage",
  "rpgRelicCollected",
  "rpgRelicLevels",
  "rpgSlimesDefeated",
] as const;

interface SanitizedRpgProgress {
  experience: number;
  hp: number;
  level: number;
  maxHp: number;
  npcMemory: NpcMemory | null;
  rpgClassId: RpgClassId;
  rpgEquippedItems: Partial<
    Record<RpgEquipmentSlot, RpgEquipmentId>
  >;
  rpgFoundRelics: RpgRelicId[];
  rpgGold: number;
  rpgOpenedObjects: string[];
  rpgOwnedEquipment: RpgEquipmentId[];
  rpgPotionCount: number;
  rpgQuestStage: RpgQuestStage;
  rpgRelicCollected: boolean;
  rpgRelicLevels: RpgRelicLevels;
  rpgSlimesDefeated: number;
  rpgStatus: RpgRunStatus;
  rpgWeaponEnhancementLevel: number;
}

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

function clampInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
) {
  return Math.floor(clampNumber(value, minimum, maximum, fallback));
}

function sanitizeNpcMemory(value: unknown): NpcMemory | null {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;

  return source &&
    NPC_QUEST_STATUSES.includes(source.questStatus as NpcQuestStatus) &&
    NPC_TOPICS.includes(source.recentTopic as NpcMemory["recentTopic"])
    ? ({
        questStatus: source.questStatus,
        recentTopic: source.recentTopic,
      } as NpcMemory)
    : null;
}

function sanitizeRpgProgress(
  persisted: Record<string, unknown>,
): SanitizedRpgProgress {
  const legacyFoundRelics = Array.isArray(persisted.rpgFoundRelics)
    ? [
        ...new Set(
          persisted.rpgFoundRelics.filter(
            (item): item is RpgRelicId =>
              typeof item === "string" &&
              RELIC_IDS.has(item as RpgRelicId),
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

  for (const relicId of RELIC_IDS) {
    const legacyLevel = legacyFoundRelics.includes(relicId) ? 1 : 0;
    const relicLevel = clampInteger(
      relicLevelSource[relicId],
      0,
      99,
      legacyLevel,
    );
    if (relicLevel > 0) {
      rpgRelicLevels[relicId] = relicLevel;
    }
  }

  const rpgOwnedEquipment = Array.isArray(persisted.rpgOwnedEquipment)
    ? [
        ...new Set(
          persisted.rpgOwnedEquipment.filter(
            (item): item is RpgEquipmentId =>
              typeof item === "string" &&
              EQUIPMENT_IDS.has(item as RpgEquipmentId),
          ),
        ),
      ]
    : [];
  const equippedSource =
    persisted.rpgEquippedItems &&
    typeof persisted.rpgEquippedItems === "object"
      ? (persisted.rpgEquippedItems as Record<string, unknown>)
      : {};
  const rpgEquippedItems: Partial<
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
      rpgOwnedEquipment.includes(equipment.id)
    ) {
      rpgEquippedItems[slot] = equipment.id;
    }
  }

  const armor = getRpgEquipment(rpgEquippedItems.armor);
  const maxHp =
    60 +
    (armor?.stats.maxHp ?? 0) +
    getRpgRelicBonuses(rpgRelicLevels).maxHp;
  const hp = clampInteger(persisted.hp, 0, maxHp, maxHp);
  const rawLevel = clampInteger(persisted.level, 1, 99, 1);
  const rawExperience = clampInteger(
    persisted.experience,
    0,
    9_999,
    0,
  );
  const level = Math.min(
    99,
    rawLevel + Math.floor(rawExperience / 100),
  );
  const experience = Math.min(99, rawExperience % 100);
  const persistedClassId = isRpgClassId(persisted.rpgClassId)
    ? persisted.rpgClassId
    : "adventurer";
  const persistedClass = getRpgClass(persistedClassId);
  const classMinimumLevel =
    persistedClass.tier === 2
      ? 10
      : persistedClass.tier === 1
        ? 5
        : 1;
  const rpgClassId: RpgClassId =
    level >= classMinimumLevel ? persistedClassId : "adventurer";
  const rpgQuestStage = NPC_QUEST_STATUSES.includes(
    persisted.rpgQuestStage as RpgQuestStage,
  )
    ? (persisted.rpgQuestStage as RpgQuestStage)
    : "meet_elder";
  const rpgFoundRelics = [
    ...legacyFoundRelics,
    ...RPG_RELICS.map(({ id }) => id).filter(
      (id) =>
        (rpgRelicLevels[id] ?? 0) > 0 &&
        !legacyFoundRelics.includes(id),
    ),
  ];

  return {
    experience,
    hp,
    level,
    maxHp,
    npcMemory: sanitizeNpcMemory(persisted.npcMemory),
    rpgClassId,
    rpgEquippedItems,
    rpgFoundRelics,
    rpgGold: clampInteger(persisted.rpgGold, 0, 999_999, 0),
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
    rpgOwnedEquipment,
    rpgPotionCount: clampInteger(
      persisted.rpgPotionCount,
      0,
      99,
      0,
    ),
    rpgQuestStage,
    rpgRelicCollected: Boolean(persisted.rpgRelicCollected),
    rpgRelicLevels,
    rpgSlimesDefeated: clampInteger(
      persisted.rpgSlimesDefeated,
      0,
      3,
      0,
    ),
    rpgStatus: hp === 0 ? "lost" : "playing",
    rpgWeaponEnhancementLevel: clampInteger(
      persisted.rpgWeaponEnhancementLevel,
      0,
      10,
      0,
    ),
  };
}

export function sanitizeRpgCharacterProfile(
  value: unknown,
  index = 0,
): RpgCharacterProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const fallbackId = `character-${index + 1}`;
  const id =
    typeof source.id === "string" &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(source.id)
      ? source.id
      : fallbackId;
  const name =
    normalizeRpgCharacterName(
      typeof source.name === "string" ? source.name : "",
    ) || `모험가 ${index + 1}`;
  const createdAt = clampInteger(
    source.createdAt,
    0,
    Number.MAX_SAFE_INTEGER,
    0,
  );
  const updatedAt = Math.max(
    createdAt,
    clampInteger(
      source.updatedAt,
      0,
      Number.MAX_SAFE_INTEGER,
      createdAt,
    ),
  );
  const {
    maxHp: _maxHp,
    rpgStatus: _rpgStatus,
    ...progress
  } = sanitizeRpgProgress(source);
  void _maxHp;
  void _rpgStatus;

  return {
    ...progress,
    createdAt,
    id,
    name,
    updatedAt,
  };
}

function hasLegacyRpgState(persisted: Record<string, unknown>) {
  return LEGACY_RPG_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(persisted, field),
  );
}

function legacyProfileFromProgress(
  progress: SanitizedRpgProgress,
): RpgCharacterProfile {
  const {
    maxHp: _maxHp,
    rpgStatus: _rpgStatus,
    ...savedProgress
  } = progress;
  void _maxHp;
  void _rpgStatus;

  return {
    ...savedProgress,
    createdAt: 0,
    id: LEGACY_RPG_CHARACTER_ID,
    name: "기존 모험가",
    updatedAt: 0,
  };
}

export function sanitizePersistedGameState(
  value: unknown,
): Partial<GameStore> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const persisted = value as Record<string, unknown>;
  const rootProgress = sanitizeRpgProgress(persisted);
  const hasCharacterEnvelope = Object.prototype.hasOwnProperty.call(
    persisted,
    "rpgCharacters",
  );
  const seenCharacterIds = new Set<string>();
  const rpgCharacters = (
    Array.isArray(persisted.rpgCharacters)
      ? persisted.rpgCharacters
          .slice(0, MAX_RPG_CHARACTERS)
          .map((profile, index) =>
            sanitizeRpgCharacterProfile(profile, index),
          )
      : []
  ).flatMap((profile) => {
    if (!profile || seenCharacterIds.has(profile.id)) {
      return [];
    }
    seenCharacterIds.add(profile.id);
    return [profile];
  });

  if (
    rpgCharacters.length === 0 &&
    !hasCharacterEnvelope &&
    hasLegacyRpgState(persisted)
  ) {
    rpgCharacters.push(legacyProfileFromProgress(rootProgress));
  }

  const requestedActiveId =
    typeof persisted.activeRpgCharacterId === "string"
      ? persisted.activeRpgCharacterId
      : null;
  const activeRpgCharacterId = rpgCharacters.some(
    (profile) => profile.id === requestedActiveId,
  )
    ? requestedActiveId
    : (rpgCharacters[0]?.id ?? null);
  const activeProfile = rpgCharacters.find(
    (profile) => profile.id === activeRpgCharacterId,
  );
  const activeProgress = activeProfile
    ? sanitizeRpgProgress(activeProfile as unknown as Record<string, unknown>)
    : rootProgress;
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
      const bestTime = keeperBestTimesSource[levelId];
      return typeof bestTime === "number" && Number.isFinite(bestTime)
        ? [[levelId, clampInteger(bestTime, 0, 999, 0)]]
        : [];
    }),
  ) as Partial<Record<KeeperLevelId, number>>;
  const keeperCompletedSessions = Array.isArray(
    persisted.keeperCompletedSessions,
  )
    ? [
        ...new Set(
          persisted.keeperCompletedSessions.filter(isKeeperLevelId),
        ),
      ]
    : [];

  return {
    activeRpgCharacterId,
    defenceAttackDelay: clampInteger(
      persisted.defenceAttackDelay,
      240,
      620,
      620,
    ),
    defenceDamage: clampInteger(persisted.defenceDamage, 2, 50, 2),
    defenceLevel: clampInteger(persisted.defenceLevel, 1, 99, 1),
    defenceMaxHp: clampInteger(
      persisted.defenceMaxHp,
      100,
      1_000,
      100,
    ),
    defenceMoveSpeed: clampInteger(
      persisted.defenceMoveSpeed,
      100,
      500,
      210,
    ),
    ...activeProgress,
    keeperBestTimes,
    keeperCompletedSessions,
    keeperLevel,
    keeperUnlockedLevel,
    rpgCharacters,
  };
}
