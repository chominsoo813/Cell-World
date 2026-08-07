import type { RpgRelicId } from "@/lib/rpgRelics";

export const RPG_RAID_RELIC_TYPE_REQUIREMENT = 15;
export const RPG_RAID_MAP_ID = "raid-xeros";
export const RPG_RAID_STATE_EVENT = "pixel-dot-land:rpg-raid-state";
export const RPG_RAID_COMMAND_EVENT = "pixel-dot-land:rpg-raid-command";
export const RPG_RAID_LEADERBOARD_EVENT = "pixel-dot-land:rpg-raid-leaderboard";

export interface RpgRaidStateDetail {
  active: boolean;
  bossName: string;
  defeated: boolean;
  startedAt?: number;
}

export interface RpgRaidCommandDetail {
  action: "leave";
}

export interface RpgRaidSummonEligibility {
  current: number;
  eligible: boolean;
  remaining: number;
  required: number;
}

export function formatRpgRaidDuration(durationMs: number) {
  const safeDuration = Math.max(0, Math.floor(durationMs));
  const minutes = Math.floor(safeDuration / 60_000);
  const seconds = Math.floor((safeDuration % 60_000) / 1_000);
  const centiseconds = Math.floor((safeDuration % 1_000) / 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

export function getRpgRaidSummonEligibility(
  relicIds: readonly RpgRelicId[],
): RpgRaidSummonEligibility {
  const current = new Set(relicIds).size;
  const required = RPG_RAID_RELIC_TYPE_REQUIREMENT;

  return {
    current,
    eligible: current >= required,
    remaining: Math.max(0, required - current),
    required,
  };
}
