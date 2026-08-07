import { describe, expect, it } from "vitest";
import { RPG_RELICS, type RpgRelicId } from "@/lib/rpgRelics";
import {
  getRpgRaidSummonEligibility,
  RPG_RAID_RELIC_TYPE_REQUIREMENT,
} from "@/lib/rpgRaid";

const relicIds = RPG_RELICS.map((relic) => relic.id);

describe("getRpgRaidSummonEligibility", () => {
  it("locks the altar when fewer than 15 distinct relic types are owned", () => {
    const result = getRpgRaidSummonEligibility(
      relicIds.slice(0, RPG_RAID_RELIC_TYPE_REQUIREMENT - 1),
    );

    expect(result).toEqual({
      current: 14,
      eligible: false,
      remaining: 1,
      required: 15,
    });
  });

  it("unlocks summon eligibility at 15 distinct relic types", () => {
    const result = getRpgRaidSummonEligibility(
      relicIds.slice(0, RPG_RAID_RELIC_TYPE_REQUIREMENT),
    );

    expect(result).toEqual({
      current: 15,
      eligible: true,
      remaining: 0,
      required: 15,
    });
  });

  it("does not count duplicate relics as additional types", () => {
    const owned = relicIds.slice(0, 14);
    const withDuplicates = [...owned, owned[0], owned[1]] as RpgRelicId[];

    expect(getRpgRaidSummonEligibility(withDuplicates)).toMatchObject({
      current: 14,
      eligible: false,
      remaining: 1,
    });
  });
});
