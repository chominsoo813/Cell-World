import type { NpcMemory, NpcQuestStatus } from "@/lib/npcChat";
import type { RpgClassId } from "@/lib/rpgClasses";
import type { RpgEquipmentId, RpgEquipmentSlot } from "@/lib/rpgShop";
import type {
  RpgRelicId,
  RpgRelicLevels,
} from "@/lib/rpgRelics";

export const MAX_RPG_CHARACTERS = 8;
export const LEGACY_RPG_CHARACTER_ID = "legacy-adventurer";

export interface RpgCharacterProfile {
  createdAt: number;
  experience: number;
  hp: number;
  id: string;
  level: number;
  name: string;
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
  rpgQuestStage: NpcQuestStatus;
  rpgRelicCollected: boolean;
  rpgRelicLevels: RpgRelicLevels;
  rpgSlimesDefeated: number;
  rpgWeaponEnhancementLevel: number;
  updatedAt: number;
}

export type RpgCharacterCreateResult =
  | { characterId: string; status: "created" }
  | {
      status: "duplicate_name" | "invalid_name" | "limit_reached";
    };

export function normalizeRpgCharacterName(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12);
}

export function createEmptyRpgCharacter(
  id: string,
  name: string,
  timestamp: number,
): RpgCharacterProfile {
  return {
    createdAt: timestamp,
    experience: 0,
    hp: 60,
    id,
    level: 1,
    name,
    npcMemory: null,
    rpgClassId: "adventurer",
    rpgEquippedItems: {},
    rpgFoundRelics: [],
    rpgGold: 0,
    rpgOpenedObjects: [],
    rpgOwnedEquipment: [],
    rpgPotionCount: 0,
    rpgQuestStage: "meet_elder",
    rpgRelicCollected: false,
    rpgRelicLevels: {},
    rpgSlimesDefeated: 0,
    rpgWeaponEnhancementLevel: 0,
    updatedAt: timestamp,
  };
}
