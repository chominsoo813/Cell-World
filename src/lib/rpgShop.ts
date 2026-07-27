export type RpgEquipmentSlot = "accessory" | "armor" | "weapon";

export type RpgEquipmentId =
  | "adventurer_sword"
  | "formula_talisman"
  | "guardian_armor"
  | "wind_boots";

export interface RpgEquipment {
  id: RpgEquipmentId;
  name: string;
  description: string;
  icon: "armor" | "boots" | "relic" | "sword";
  price: number;
  slot: RpgEquipmentSlot;
  stats: {
    attackDamage?: number;
    attackRange?: number;
    maxHp?: number;
    moveSpeed?: number;
  };
}

export const RPG_SHOP_ITEMS: RpgEquipment[] = [
  {
    id: "adventurer_sword",
    name: "모험가의 검",
    description: "기본 공격력이 1 증가합니다.",
    icon: "sword",
    price: 30,
    slot: "weapon",
    stats: { attackDamage: 1 },
  },
  {
    id: "guardian_armor",
    name: "수호자의 갑옷",
    description: "최대 HP가 20 증가합니다.",
    icon: "armor",
    price: 45,
    slot: "armor",
    stats: { maxHp: 20 },
  },
  {
    id: "wind_boots",
    name: "바람 장화",
    description: "이동 속도가 25 증가합니다.",
    icon: "boots",
    price: 55,
    slot: "accessory",
    stats: { moveSpeed: 25 },
  },
  {
    id: "formula_talisman",
    name: "수식 부적",
    description: "공격 범위가 24 증가합니다.",
    icon: "relic",
    price: 80,
    slot: "accessory",
    stats: { attackRange: 24 },
  },
];

export function getRpgEquipment(id?: RpgEquipmentId) {
  return RPG_SHOP_ITEMS.find((item) => item.id === id);
}
