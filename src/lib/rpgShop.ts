import type { RpgRelicRarity } from "@/lib/rpgRelics";

export type RpgEquipmentSlot = "accessory" | "armor" | "weapon";

export type RpgEquipmentId =
  | "adventurer_sword"
  | "ember_ring"
  | "formula_talisman"
  | "guardian_armor"
  | "iron_heart"
  | "wind_boots"
  | "wolf_eye";

export interface RpgEquipment {
  id: RpgEquipmentId;
  name: string;
  description: string;
  iconPath: string;
  price: number;
  rarity: RpgRelicRarity;
  slot: RpgEquipmentSlot;
  stats: {
    attackDamage?: number;
    attackRange?: number;
    criticalChance?: number;
    maxHp?: number;
    moveSpeed?: number;
  };
}

const RPG_ROOT = "/assets/pixel-art/rpg";
const RELIC_ROOT = `${RPG_ROOT}/adventure/relics`;

export const RPG_SHOP_ITEMS: RpgEquipment[] = [
  {
    id: "adventurer_sword",
    name: "모험가의 검",
    description: "기본 공격력이 1 증가합니다.",
    iconPath: `${RPG_ROOT}/sword.png`,
    price: 30,
    rarity: "common",
    slot: "weapon",
    stats: { attackDamage: 1 },
  },
  {
    id: "guardian_armor",
    name: "수호자의 갑옷",
    description: "최대 HP가 20 증가합니다.",
    iconPath: `${RPG_ROOT}/equipment/guardian-mark.png`,
    price: 45,
    rarity: "common",
    slot: "armor",
    stats: { maxHp: 20 },
  },
  {
    id: "iron_heart",
    name: "강철 심장",
    description: "보통 등급 장비 · 최대 HP가 18 증가합니다.",
    iconPath: `${RELIC_ROOT}/iron-heart.png`,
    price: 60,
    rarity: "common",
    slot: "armor",
    stats: { maxHp: 18 },
  },
  {
    id: "wind_boots",
    name: "바람 장화",
    description: "이동 속도가 25 증가합니다.",
    iconPath: `${RPG_ROOT}/equipment/wind-boots.png`,
    price: 70,
    rarity: "uncommon",
    slot: "accessory",
    stats: { moveSpeed: 25 },
  },
  {
    id: "ember_ring",
    name: "불씨 반지",
    description: "희귀 등급 장비 · 공격력이 2 증가합니다.",
    iconPath: `${RELIC_ROOT}/ember-ring.png`,
    price: 110,
    rarity: "uncommon",
    slot: "accessory",
    stats: { attackDamage: 2 },
  },
  {
    id: "formula_talisman",
    name: "수식 부적",
    description: "공격 범위가 24 증가합니다.",
    iconPath: `${RPG_ROOT}/equipment/wolf-eye.png`,
    price: 130,
    rarity: "rare",
    slot: "accessory",
    stats: { attackRange: 24 },
  },
  {
    id: "wolf_eye",
    name: "회색 늑대의 눈",
    description: "레어 등급 장비 · 치명타 확률이 12% 증가합니다.",
    iconPath: `${RELIC_ROOT}/wolf-eye.png`,
    price: 180,
    rarity: "rare",
    slot: "accessory",
    stats: { criticalChance: 12 },
  },
];

export function getRpgEquipment(id?: RpgEquipmentId) {
  return RPG_SHOP_ITEMS.find((item) => item.id === id);
}
