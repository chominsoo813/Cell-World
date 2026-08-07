"use client";

import { useEffect, useRef } from "react";
import { RpgSpritePortrait } from "@/components/game/RpgSpritePortrait";
import { getRpgClass } from "@/lib/rpgClasses";
import {
  getRpgWeaponEnhancementCooldownMultiplier,
  getRpgWeaponEnhancementCooldownReductionPercent,
  getRpgWeaponEnhancementMultiplier,
} from "@/lib/rpgEnhancement";
import {
  getRpgRelicBonuses,
  RPG_RELICS,
  type RpgRelicEffectKey,
} from "@/lib/rpgRelics";
import { useGameStore } from "@/stores/gameStore";

const summaryEffectOrder = [
  "attackPercent",
  "skillDamagePercent",
  "criticalChancePercent",
  "criticalDamagePercent",
  "damageReductionPercent",
  "maxHp",
  "killHeal",
  "retaliationDamage",
  "attackSpeedPercent",
  "moveSpeedPercent",
  "attackRangePercent",
  "goldPercent",
] as const satisfies readonly RpgRelicEffectKey[];

const effectLabels: Record<
  RpgRelicEffectKey,
  { label: string; prefix: "+" | "-"; suffix: "" | "%" }
> = {
  attackPercent: { label: "공격력", prefix: "+", suffix: "%" },
  attackRangePercent: { label: "공격 범위", prefix: "+", suffix: "%" },
  attackSpeedPercent: { label: "공격 속도", prefix: "+", suffix: "%" },
  criticalChancePercent: { label: "치명타 확률", prefix: "+", suffix: "%" },
  criticalDamagePercent: { label: "치명타 피해", prefix: "+", suffix: "%" },
  damageReductionPercent: { label: "받는 피해", prefix: "-", suffix: "%" },
  goldPercent: { label: "골드 획득량", prefix: "+", suffix: "%" },
  killHeal: { label: "처치 시 HP", prefix: "+", suffix: "" },
  maxHp: { label: "최대 HP", prefix: "+", suffix: "" },
  moveSpeedPercent: { label: "이동 속도", prefix: "+", suffix: "%" },
  retaliationDamage: { label: "반격 피해", prefix: "+", suffix: "" },
  skillCooldownPercent: {
    label: "스킬 재사용 대기시간",
    prefix: "-",
    suffix: "%",
  },
  skillDamagePercent: { label: "스킬 피해", prefix: "+", suffix: "%" },
};

export function RpgCharacterStatsPanel() {
  const closeStats = useGameStore((state) => state.closeRpgCharacterStats);
  const foundRelics = useGameStore((state) => state.rpgFoundRelics);
  const isOpen = useGameStore((state) => state.rpgCharacterStatsOpen);
  const level = useGameStore((state) => state.level);
  const rpgClassId = useGameStore((state) => state.rpgClassId);
  const relicLevels = useGameStore((state) => state.rpgRelicLevels);
  const weaponEnhancementLevel = useGameStore(
    (state) => state.rpgWeaponEnhancementLevel,
  );
  const panelRef = useRef<HTMLElement>(null);
  const relicBonuses = getRpgRelicBonuses(relicLevels);
  const totalRelicLevels = foundRelics.reduce(
    (total, relicId) => total + (relicLevels[relicId] ?? 1),
    0,
  );
  const weaponMultiplier = getRpgWeaponEnhancementMultiplier(
    weaponEnhancementLevel,
  );
  const weaponAttackPercent = Math.round((weaponMultiplier - 1) * 100);
  const weaponCooldownMultiplier = getRpgWeaponEnhancementCooldownMultiplier(
    weaponEnhancementLevel,
  );
  const weaponCooldownReduction = getRpgWeaponEnhancementCooldownReductionPercent(
    weaponEnhancementLevel,
  );
  const totalSkillCooldownReduction = Math.round(
    (1 -
      (1 - relicBonuses.skillCooldownPercent / 100) *
        weaponCooldownMultiplier) *
      100,
  );
  const totalAttackMultiplier =
    (1 + relicBonuses.attackPercent / 100) * weaponMultiplier;
  const activeRelicBonuses = summaryEffectOrder.flatMap((key) => {
    const value = relicBonuses[key];
    return value > 0 ? [{ key, value }] : [];
  });
  const classDefinition = getRpgClass(rpgClassId);
  const portrait =
    rpgClassId === "adventurer"
      ? "rpg-character-adventurer-front"
      : `rpg-character-${rpgClassId}`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const focusFrame = requestAnimationFrame(() => panelRef.current?.focus());
    return () => cancelAnimationFrame(focusFrame);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="rpg-modal-layer rpg-character-stats-layer">
      <section
        aria-describedby="rpg-character-stats-description"
        aria-labelledby="rpg-character-stats-title"
        aria-modal="true"
        className="rpg-character-stats-panel"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header>
          <RpgSpritePortrait
            className="rpg-character-stats-avatar"
            label={`${classDefinition.name} 아바타`}
            portrait={portrait}
          />
          <div>
            <small>CHARACTER / EFFECT SUMMARY</small>
            <h2 id="rpg-character-stats-title">캐릭터 능력 요약</h2>
            <p id="rpg-character-stats-description">
              보유 유물과 무기 강화로 현재 적용 중인 전투 효과입니다.
            </p>
          </div>
          <button aria-label="캐릭터 능력 요약 닫기" onClick={closeStats} type="button">
            ×
          </button>
        </header>

        <div className="rpg-character-stats-highlights">
          <div>
            <small>CLASS</small>
            <strong>{classDefinition.name}</strong>
            <span>LV.{level}</span>
          </div>
          <div>
            <small>RELICS</small>
            <strong>{foundRelics.length}</strong>
            <span>/ {RPG_RELICS.length}종 · 총 Lv.{totalRelicLevels}</span>
          </div>
          <div>
            <small>WEAPON</small>
            <strong>+{weaponEnhancementLevel}</strong>
            <span>ATK +{weaponAttackPercent}% · CD -{weaponCooldownReduction}%</span>
          </div>
          <div className="is-total">
            <small>COMBAT MULTIPLIER</small>
            <strong>×{totalAttackMultiplier.toFixed(2)}</strong>
            <span>공통 피해 배율</span>
          </div>
        </div>

        <div className="rpg-character-stats-content">
          <h3>현재 적용 효과</h3>
          <dl>
            {totalSkillCooldownReduction > 0 ? (
              <div>
                <dt>스킬 재사용 대기시간</dt>
                <dd>-{totalSkillCooldownReduction}%</dd>
              </div>
            ) : null}
            {weaponCooldownReduction > 0 ? (
              <div>
                <dt>대시 재사용 대기시간</dt>
                <dd>-{weaponCooldownReduction}%</dd>
              </div>
            ) : null}
            {activeRelicBonuses.map(({ key, value }) => {
              const presentation = effectLabels[key];
              return (
                <div key={key}>
                  <dt>{presentation.label}</dt>
                  <dd>
                    {presentation.prefix}
                    {value}
                    {presentation.suffix}
                  </dd>
                </div>
              );
            })}
            {activeRelicBonuses.length === 0 &&
            totalSkillCooldownReduction === 0 &&
            weaponCooldownReduction === 0 ? (
              <p>아직 적용 중인 유물 또는 강화 효과가 없습니다.</p>
            ) : null}
          </dl>
        </div>

        <footer>
          <span>K 또는 ESC로 닫기</span>
          <span>유물 효과는 같은 유물을 획득할수록 누적됩니다.</span>
        </footer>
      </section>
    </div>
  );
}
