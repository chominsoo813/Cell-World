export const RPG_COMBAT_COOLDOWN_EVENT =
  "cell-world:rpg-combat-cooldowns";

export interface RpgCombatCooldownDetail {
  dashRemainingMs: number;
  dashTotalMs: number;
  skillRemainingMs: number;
  skillTotalMs: number;
}
