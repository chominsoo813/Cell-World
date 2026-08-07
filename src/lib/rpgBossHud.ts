export const RPG_BOSS_HEALTH_EVENT = "pixel-dot-land:rpg-boss-health";

export interface RpgBossHealthEntry {
  currentHp: number;
  id: string;
  maxHp: number;
  name: string;
}

export interface RpgBossHealthDetail {
  bosses: RpgBossHealthEntry[];
}
