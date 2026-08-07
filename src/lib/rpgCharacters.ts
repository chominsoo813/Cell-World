import type { NpcMemory, NpcQuestStatus } from "@/lib/npcChat";
import type { RpgClassId } from "@/lib/rpgClasses";
import type { RpgEquipmentId, RpgEquipmentSlot } from "@/lib/rpgShop";
import type {
  RpgRelicId,
  RpgRelicLevels,
} from "@/lib/rpgRelics";

export const MAX_RPG_CHARACTERS = 8;
export const LEGACY_RPG_CHARACTER_ID = "legacy-adventurer";
export const RPG_CONTROL_SCHEMES = [
  "keyboard",
  "keyboard_mouse",
] as const;

export type RpgControlScheme = (typeof RPG_CONTROL_SCHEMES)[number];

export function isRpgControlScheme(value: unknown): value is RpgControlScheme {
  return (
    typeof value === "string" &&
    RPG_CONTROL_SCHEMES.includes(value as RpgControlScheme)
  );
}

export interface RpgCharacterProfile {
  createdAt: number;
  experience: number;
  hp: number;
  id: string;
  level: number;
  name: string;
  npcMemory: NpcMemory | null;
  rpgClassId: RpgClassId;
  rpgControlScheme: RpgControlScheme;
  rpgEquippedItems: Partial<
    Record<RpgEquipmentSlot, RpgEquipmentId>
  >;
  rpgFoundRelics: RpgRelicId[];
  rpgGold: number;
  rpgGuideSeen: boolean;
  rpgOpenedObjects: string[];
  rpgOwnedEquipment: RpgEquipmentId[];
  rpgPotionCount: number;
  rpgQuestStage: NpcQuestStatus;
  rpgRaidBestTimeMs: number | null;
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

export type RpgCharacterRenameResult =
  | { name: string; status: "renamed" }
  | { status: "duplicate_name" | "invalid_name" | "not_found" };

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
    rpgControlScheme: "keyboard",
    rpgEquippedItems: {},
    rpgFoundRelics: [],
    rpgGold: 0,
    rpgGuideSeen: false,
    rpgOpenedObjects: [],
    rpgOwnedEquipment: [],
    rpgPotionCount: 0,
    rpgQuestStage: "meet_elder",
    rpgRaidBestTimeMs: null,
    rpgRelicCollected: false,
    rpgRelicLevels: {},
    rpgSlimesDefeated: 0,
    rpgWeaponEnhancementLevel: 0,
    updatedAt: timestamp,
  };
}
