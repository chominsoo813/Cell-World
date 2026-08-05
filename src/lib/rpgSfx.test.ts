import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RPG_CLASS_IDS, type RpgClassId } from "@/lib/rpgClasses";
import {
  dispatchRpgSfxRequest,
  getRpgBasicAttackSfxPlayback,
  getRpgBasicAttackSfxKey,
  getRpgSkillActivationDurationMs,
  getRpgSkillSfxKey,
  isRpgSfxKey,
  isSnowRpgBoss,
  isSnowRpgMap,
  RPG_SFX_FILES,
  RPG_SKILL_SFX_BY_CLASS,
  shouldPlayRpgEnhancementSfx,
} from "@/lib/rpgSfx";

describe("RPG sound effects", () => {
  it("keeps all 23 provided files in the public asset manifest", () => {
    expect(Object.keys(RPG_SFX_FILES)).toHaveLength(23);
    expect(new Set(Object.values(RPG_SFX_FILES))).toHaveLength(23);

    for (const file of Object.values(RPG_SFX_FILES)) {
      expect(
        existsSync(
          join(process.cwd(), "public", "assets", "audio", "rpg", "sfx", file),
        ),
        `missing ${file}`,
      ).toBe(true);
    }
  });

  it("maps every playable class to a valid skill sound", () => {
    expect(RPG_CLASS_IDS).toHaveLength(21);
    expect(Object.keys(RPG_SKILL_SFX_BY_CLASS)).toHaveLength(
      RPG_CLASS_IDS.length,
    );
    for (const classId of RPG_CLASS_IDS) {
      expect(isRpgSfxKey(getRpgSkillSfxKey(classId))).toBe(true);
    }
  });

  it("selects the three requested basic-attack recordings", () => {
    expect(getRpgBasicAttackSfxKey("adventurer")).toBe(
      "adventurerBasicAttack",
    );
    for (const classId of [
      "mage",
      "firemage",
      "frostmage",
      "stormmage",
      "toxicmage",
    ] satisfies RpgClassId[]) {
      expect(getRpgBasicAttackSfxKey(classId)).toBe("mageBasicAttack");
    }
    for (const classId of RPG_CLASS_IDS.filter(
      (candidate) =>
        candidate !== "adventurer" &&
        !["mage", "firemage", "frostmage", "stormmage", "toxicmage"].includes(
          candidate,
        ),
    )) {
      expect(getRpgBasicAttackSfxKey(classId)).toBe("commonBasicAttack");
    }
  });

  it("skips leading silence while keeping basic sounds inside the attack window", () => {
    expect(getRpgBasicAttackSfxPlayback("adventurer")).toEqual({
      key: "adventurerBasicAttack",
      seekSeconds: 0.54,
    });
    expect(getRpgBasicAttackSfxPlayback("warrior")).toEqual({
      key: "commonBasicAttack",
      seekSeconds: 0.22,
    });
    expect(getRpgBasicAttackSfxPlayback("mage")).toEqual({
      key: "mageBasicAttack",
      seekSeconds: 0,
    });

    for (const classId of RPG_CLASS_IDS) {
      const playback = getRpgBasicAttackSfxPlayback(classId);
      expect(playback.key).toBe(getRpgBasicAttackSfxKey(classId));
      expect(Number.isFinite(playback.seekSeconds)).toBe(true);
      expect(playback.seekSeconds).toBeGreaterThanOrEqual(0);
    }
  });

  it("preserves shared specialist recordings and explicit class recordings", () => {
    expect(getRpgSkillSfxKey("warrior")).toBe("warriorSkill");
    for (const classId of ["swordmaster", "greatsword", "spearman"] as const) {
      expect(getRpgSkillSfxKey(classId)).toBe("warriorSpecialistSkill");
    }
    for (const classId of ["longbow", "crossbow"] as const) {
      expect(getRpgSkillSfxKey(classId)).toBe("bowSpecialistSkill");
    }
    expect(getRpgSkillSfxKey("pirate")).toBe("gunslingerSkill");
    expect(getRpgSkillSfxKey("plunder_captain")).toBe(
      "plunderCaptainSkill",
    );
    expect(getRpgSkillSfxKey("storm_captain")).toBe("stormCaptainSkill");
  });

  it("caps long recordings to the authoritative skill activation window", () => {
    expect(getRpgSkillActivationDurationMs("adventurer")).toBe(2_000);
    expect(getRpgSkillActivationDurationMs("warrior")).toBe(520);
    expect(getRpgSkillActivationDurationMs("mage")).toBe(620);
    expect(getRpgSkillActivationDurationMs("crossbow")).toBe(820);
    expect(getRpgSkillActivationDurationMs("gunslinger")).toBe(820);
    expect(getRpgSkillActivationDurationMs("toxicmage")).toBe(2_800);
    expect(getRpgSkillActivationDurationMs("storm_captain")).toBe(2_600);
  });

  it("plays the forge sound only when an enhancement attempt spends gold", () => {
    expect(shouldPlayRpgEnhancementSfx("success")).toBe(true);
    expect(shouldPlayRpgEnhancementSfx("failed")).toBe(true);
    expect(shouldPlayRpgEnhancementSfx("insufficient_gold")).toBe(false);
    expect(shouldPlayRpgEnhancementSfx("max_level")).toBe(false);
    expect(shouldPlayRpgEnhancementSfx("no_character")).toBe(false);
  });

  it("separates snow ambience from snow boss skill playback", () => {
    expect(isSnowRpgMap("snow-1")).toBe(true);
    expect(isSnowRpgMap("snow-10")).toBe(true);
    expect(isSnowRpgMap("wolf-1")).toBe(true);
    expect(isSnowRpgMap("town")).toBe(false);
    expect(isSnowRpgMap("cave-10")).toBe(false);
    expect(isSnowRpgBoss("snowGiantBoss")).toBe(true);
    expect(isSnowRpgBoss("snowWitchBoss")).toBe(true);
    expect(isSnowRpgBoss("hellCerberus")).toBe(true);
    expect(isSnowRpgBoss("dragonBoss")).toBe(false);
  });

  it("does not dispatch browser audio events during server-side execution", () => {
    expect(
      dispatchRpgSfxRequest({ key: "blacksmithEnhance", volume: 0.5 }),
    ).toBe(false);
  });
});
