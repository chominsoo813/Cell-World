"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RpgSpritePortrait } from "@/components/game/RpgSpritePortrait";
import {
  RPG_COMBAT_COOLDOWN_EVENT,
  type RpgCombatCooldownDetail,
} from "@/lib/rpgCombatHud";
import { getRpgClass } from "@/lib/rpgClasses";
import {
  getRpgWeaponEnhancementCooldownMultiplier,
  getRpgWeaponEnhancementCooldownReductionPercent,
  getRpgWeaponEnhancementMultiplier,
} from "@/lib/rpgEnhancement";
import { getRpgEquipment } from "@/lib/rpgShop";
import {
  getRpgRelic,
  getRpgRelicBonuses,
  getRpgRelicEffectValue,
  RPG_RELICS,
  RPG_RELIC_RARITIES,
  type RpgRelicEffectKey,
  type RpgRelicId,
} from "@/lib/rpgRelics";
import { useGameStore } from "@/stores/gameStore";

interface ActiveRelicTooltip {
  characterId: string | null;
  id: RpgRelicId;
  left: number;
}

interface CombatCooldownSnapshot extends RpgCombatCooldownDetail {
  identity: string;
}

const INITIAL_COOLDOWNS: RpgCombatCooldownDetail = {
  dashRemainingMs: 0,
  dashTotalMs: 0,
  skillRemainingMs: 0,
  skillTotalMs: 0,
};

const RPG_EXPERIENCE_PER_LEVEL = 100;
const RPG_MAX_LEVEL = 99;
const RPG_DASH_ICON = "/assets/pixel-art/rpg/equipment/wind-boots.png";

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
  "skillCooldownPercent",
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

function getCooldownPresentation(remainingMs: number, totalMs: number) {
  const normalizedRemaining = Math.max(0, remainingMs);
  const progress =
    totalMs > 0
      ? Math.max(0, Math.min(100, (1 - normalizedRemaining / totalMs) * 100))
      : 100;

  return {
    progress,
    ready: normalizedRemaining <= 0,
    text:
      normalizedRemaining <= 0
        ? "READY"
        : `${(normalizedRemaining / 1_000).toFixed(1)}s`,
  };
}

export function RpgInventoryPanel() {
  const activeCharacterId = useGameStore(
    (state) => state.activeRpgCharacterId,
  );
  const hp = useGameStore((state) => state.hp);
  const experience = useGameStore((state) => state.experience);
  const level = useGameStore((state) => state.level);
  const rpgClassId = useGameStore((state) => state.rpgClassId);
  const maxHp = useGameStore((state) => state.maxHp);
  const rpgEquippedItems = useGameStore((state) => state.rpgEquippedItems);
  const rpgFoundRelics = useGameStore((state) => state.rpgFoundRelics);
  const rpgGold = useGameStore((state) => state.rpgGold);
  const rpgOwnedEquipment = useGameStore((state) => state.rpgOwnedEquipment);
  const rpgPotionCount = useGameStore((state) => state.rpgPotionCount);
  const rpgRelicLevels = useGameStore((state) => state.rpgRelicLevels);
  const weaponEnhancementLevel = useGameStore(
    (state) => state.rpgWeaponEnhancementLevel,
  );
  const drinkRpgPotion = useGameStore((state) => state.useRpgPotion);
  const [activeTooltip, setActiveTooltip] =
    useState<ActiveRelicTooltip | null>(null);
  const cooldownIdentity = `${activeCharacterId ?? "none"}:${rpgClassId}`;
  const [cooldownSnapshot, setCooldownSnapshot] =
    useState<CombatCooldownSnapshot>({
      ...INITIAL_COOLDOWNS,
      identity: cooldownIdentity,
    });
  const cooldowns =
    cooldownSnapshot.identity === cooldownIdentity
      ? cooldownSnapshot
      : INITIAL_COOLDOWNS;
  const visibleTooltip =
    activeTooltip?.characterId === activeCharacterId &&
    rpgFoundRelics.includes(activeTooltip.id)
      ? activeTooltip
      : null;
  const hudRef = useRef<HTMLElement>(null);
  const equippedIds = new Set(Object.values(rpgEquippedItems));
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isMaxLevel = level >= RPG_MAX_LEVEL;
  const experiencePercent = isMaxLevel
    ? 100
    : Math.max(
        0,
        Math.min(100, (experience / RPG_EXPERIENCE_PER_LEVEL) * 100),
      );
  const classDefinition = getRpgClass(rpgClassId);
  const classPortrait =
    rpgClassId === "adventurer"
      ? "rpg-character-adventurer-front"
      : `rpg-character-${rpgClassId}`;
  const relicBonuses = getRpgRelicBonuses(rpgRelicLevels);
  const totalRelicLevels = rpgFoundRelics.reduce(
    (total, relicId) => total + (rpgRelicLevels[relicId] ?? 1),
    0,
  );
  const weaponEnhancementMultiplier = getRpgWeaponEnhancementMultiplier(
    weaponEnhancementLevel,
  );
  const weaponEnhancementPercent = Math.round(
    (weaponEnhancementMultiplier - 1) * 100,
  );
  const weaponCooldownMultiplier =
    getRpgWeaponEnhancementCooldownMultiplier(weaponEnhancementLevel);
  const weaponCooldownReductionPercent =
    getRpgWeaponEnhancementCooldownReductionPercent(weaponEnhancementLevel);
  const weaponEffectSummary = `ATK +${weaponEnhancementPercent}% · CD -${weaponCooldownReductionPercent}%`;
  const totalSkillCooldownReductionPercent = Math.round(
    (1 -
      (1 - relicBonuses.skillCooldownPercent / 100) *
        weaponCooldownMultiplier) *
      100,
  );
  const totalAttackMultiplier =
    (1 + relicBonuses.attackPercent / 100) * weaponEnhancementMultiplier;
  const activeRelicBonuses = summaryEffectOrder.flatMap((key) => {
    const value = relicBonuses[key];
    return value > 0 && key !== "skillCooldownPercent"
      ? [{ key, value }]
      : [];
  });
  const skillCooldown = getCooldownPresentation(
    cooldowns.skillRemainingMs,
    cooldowns.skillTotalMs,
  );
  const dashCooldown = getCooldownPresentation(
    cooldowns.dashRemainingMs,
    cooldowns.dashTotalMs,
  );
  const tooltipRelic = visibleTooltip
    ? getRpgRelic(visibleTooltip.id)
    : undefined;
  const tooltipLevel = visibleTooltip
    ? (rpgRelicLevels[visibleTooltip.id] ?? 1)
    : 1;

  useEffect(() => {
    const handlePotionHotkey = (event: KeyboardEvent) => {
      if (event.key === "Alt" && !event.repeat) {
        event.preventDefault();
        drinkRpgPotion();
      }
    };
    window.addEventListener("keydown", handlePotionHotkey);
    return () => window.removeEventListener("keydown", handlePotionHotkey);
  }, [drinkRpgPotion]);

  useEffect(() => {
    const handleCooldownUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<RpgCombatCooldownDetail>;
      if (customEvent.detail) {
        setCooldownSnapshot({
          ...customEvent.detail,
          identity: cooldownIdentity,
        });
      }
    };

    window.addEventListener(
      RPG_COMBAT_COOLDOWN_EVENT,
      handleCooldownUpdate,
    );
    return () => {
      window.removeEventListener(
        RPG_COMBAT_COOLDOWN_EVENT,
        handleCooldownUpdate,
      );
    };
  }, [cooldownIdentity]);

  const showRelicTooltip = (relicId: RpgRelicId, element: HTMLElement) => {
    const hudBounds = hudRef.current?.getBoundingClientRect();
    const itemBounds = element.getBoundingClientRect();
    const tooltipWidth = 286;
    const rawLeft = hudBounds
      ? itemBounds.left - hudBounds.left + itemBounds.width / 2 - tooltipWidth / 2
      : 8;
    const maximumLeft = Math.max(8, (hudBounds?.width ?? tooltipWidth) - tooltipWidth - 8);

    setActiveTooltip({
      characterId: activeCharacterId,
      id: relicId,
      left: Math.max(8, Math.min(maximumLeft, rawLeft)),
    });
  };

  return (
    <section
      className="rpg-bottom-hud"
      aria-label="캐릭터 상태와 인벤토리"
      ref={hudRef}
    >
      <div className="rpg-hud-overview">
        <div className="rpg-hud-left-stack">
          <aside
            aria-label={`레벨 ${level}, ${isMaxLevel ? "최대 레벨" : `경험치 ${experience}/${RPG_EXPERIENCE_PER_LEVEL}`}`}
            className="rpg-progression-panel"
          >
            <RpgSpritePortrait
              className="rpg-progression-avatar"
              label={`${classDefinition.name} 아바타`}
              portrait={classPortrait}
            />
            <div className="rpg-progression-copy">
              <header>
                <small>{classDefinition.name}</small>
                <strong>LV.{level}</strong>
                <span>
                  {isMaxLevel
                    ? "EXP MAX"
                    : `EXP ${experience} / ${RPG_EXPERIENCE_PER_LEVEL}`}
                </span>
              </header>
              <div
                aria-label={isMaxLevel ? "최대 레벨" : `경험치 ${experiencePercent}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={experiencePercent}
                className="rpg-progression-track"
                role="progressbar"
              >
                <i style={{ width: `${experiencePercent}%` }} />
              </div>
            </div>
          </aside>

          <aside
            aria-label="전투 재사용 대기시간"
            className="rpg-combat-status-strip"
          >
            <div
              aria-label={`${classDefinition.skill.name} ${skillCooldown.ready ? "사용 가능" : `${skillCooldown.text} 남음`}`}
              className={`rpg-combat-status-card${skillCooldown.ready ? " is-ready" : ""}`}
            >
              <Image
                alt=""
                className="rpg-combat-status-icon"
                height={40}
                src={classDefinition.iconFile}
                unoptimized
                width={40}
              />
              <div className="rpg-combat-status-copy">
                <span>D · {classDefinition.skill.name}</span>
                <strong>{skillCooldown.text}</strong>
                <i aria-hidden="true">
                  <b style={{ width: `${skillCooldown.progress}%` }} />
                </i>
              </div>
            </div>
            <div
              aria-label={`대시 ${dashCooldown.ready ? "사용 가능" : `${dashCooldown.text} 남음`}`}
              className={`rpg-combat-status-card${dashCooldown.ready ? " is-ready" : ""}`}
            >
              <Image
                alt=""
                className="rpg-combat-status-icon"
                height={40}
                src={RPG_DASH_ICON}
                unoptimized
                width={40}
              />
              <div className="rpg-combat-status-copy">
                <span>L-SHIFT · 대시</span>
                <strong>{dashCooldown.text}</strong>
                <i aria-hidden="true">
                  <b style={{ width: `${dashCooldown.progress}%` }} />
                </i>
              </div>
            </div>
            <div
              aria-label={`무기 강화 +${weaponEnhancementLevel}, 공격력 ${weaponEnhancementPercent}% 증가, 쿨타임 ${weaponCooldownReductionPercent}% 감소`}
              className="rpg-weapon-status"
            >
              <span>WEAPON</span>
              <strong>+{weaponEnhancementLevel}</strong>
              <small>{weaponEffectSummary}</small>
            </div>
          </aside>
        </div>

        <aside
          aria-label={`유물 ${rpgFoundRelics.length}/${RPG_RELICS.length}종, 중복 포함 총 레벨 ${totalRelicLevels}, 무기 강화 +${weaponEnhancementLevel}, 강화 쿨타임 ${weaponCooldownReductionPercent}% 감소`}
          className="rpg-total-effects-panel"
          tabIndex={0}
        >
          <header>
            <div>
              <small>CHARACTER TOTALS</small>
              <strong>유물 · 강화 효과 총합</strong>
            </div>
            <span>
              유물 {rpgFoundRelics.length}/{RPG_RELICS.length}종 · 총 Lv.{totalRelicLevels}
              {" · "}
              무기 +{weaponEnhancementLevel} ({weaponEffectSummary})
            </span>
          </header>
          <dl>
            <div className="is-total">
              <dt>공통 피해 배율</dt>
              <dd>×{totalAttackMultiplier.toFixed(2)}</dd>
            </div>
            {totalSkillCooldownReductionPercent > 0 ? (
              <div>
                <dt>스킬 재사용 대기시간</dt>
                <dd>-{totalSkillCooldownReductionPercent}%</dd>
              </div>
            ) : null}
            {weaponCooldownReductionPercent > 0 ? (
              <div>
                <dt>대시 재사용 대기시간</dt>
                <dd>-{weaponCooldownReductionPercent}%</dd>
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
          </dl>
        </aside>
      </div>
      <aside className="rpg-health-panel" aria-label={`체력 ${hp}/${maxHp}`}>
        <strong>HP</strong>
        <span>
          {hp}/{maxHp}
        </span>
        <div aria-hidden="true">
          <i style={{ width: `${hpPercent}%` }} />
        </div>
      </aside>
      <aside
        aria-label="현재 습득한 아이템"
        className="rpg-inventory-panel"
      >
        <header>
          <strong>INVENTORY</strong>
          <span>Z 습득 · ALT 물약</span>
        </header>
        <div className="rpg-inventory-slots">
          <article aria-label={`보유 코인 ${rpgGold}`}>
            <Image
              alt=""
              height={34}
              src="/assets/pixel-art/rpg/coin.png"
              unoptimized
              width={34}
            />
            <strong>{rpgGold}</strong>
            <small>COIN</small>
          </article>
          <button
            aria-label={`회복 물약 ${rpgPotionCount}개 사용, Alt 키`}
            disabled={rpgPotionCount === 0 || hp >= maxHp}
            onClick={drinkRpgPotion}
            title="Alt 키로 회복 물약 사용"
            type="button"
          >
            <Image
              alt=""
              height={22}
              src="/assets/pixel-art/rpg/adventure/items/health-potion.png"
              unoptimized
              width={22}
            />
            <strong>{rpgPotionCount}</strong>
            <small>POTION</small>
          </button>
          {rpgOwnedEquipment.map((equipmentId) => {
            const equipment = getRpgEquipment(equipmentId);

            if (!equipment) {
              return null;
            }

            return (
              <article
                className={equippedIds.has(equipmentId) ? "is-equipped" : ""}
                key={equipmentId}
                title={equipment.name}
              >
                <Image
                  alt=""
                  height={34}
                  src={equipment.iconPath}
                  unoptimized
                  width={34}
                />
                <strong>{equippedIds.has(equipmentId) ? "E" : "1"}</strong>
                <small>{equipment.name}</small>
              </article>
            );
          })}
          {rpgFoundRelics.map((relicId) => {
            const relic = getRpgRelic(relicId);
            const level = rpgRelicLevels[relicId] ?? 1;
            const isTooltipOpen = visibleTooltip?.id === relicId;

            return relic ? (
              <article
                aria-describedby={
                  isTooltipOpen ? "rpg-active-relic-tooltip" : undefined
                }
                aria-label={`${relic.name}, ${RPG_RELIC_RARITIES[relic.rarity].label}, 레벨 ${level}. ${relic.description}`}
                className={`is-relic is-${relic.rarity}`}
                key={relicId}
                onBlur={() => setActiveTooltip(null)}
                onFocus={(event) => showRelicTooltip(relicId, event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setActiveTooltip(null);
                    event.currentTarget.blur();
                  }
                }}
                onMouseEnter={(event) =>
                  showRelicTooltip(relicId, event.currentTarget)
                }
                onMouseLeave={(event) => {
                  if (document.activeElement !== event.currentTarget) {
                    setActiveTooltip(null);
                  }
                }}
                tabIndex={0}
              >
                <Image
                  alt=""
                  height={34}
                  src={relic.icon}
                  unoptimized
                  width={34}
                />
                <strong>Lv.{level}</strong>
                <small>{relic.name}</small>
              </article>
            ) : null;
          })}
          {rpgOwnedEquipment.length === 0 && rpgFoundRelics.length === 0 && (
            <p>아이템을 주워 슬롯을 채워보세요.</p>
          )}
        </div>
      </aside>
      {tooltipRelic && visibleTooltip && (
        <aside
          className={`rpg-relic-tooltip is-${tooltipRelic.rarity}`}
          id="rpg-active-relic-tooltip"
          role="tooltip"
          style={{ left: `${visibleTooltip.left}px` }}
        >
          <header>
            <Image
              alt=""
              height={42}
              src={tooltipRelic.icon}
              unoptimized
              width={42}
            />
            <div>
              <small>{RPG_RELIC_RARITIES[tooltipRelic.rarity].label} · RELIC</small>
              <strong>{tooltipRelic.name}</strong>
              <span>Lv.{tooltipLevel}</span>
            </div>
          </header>
          <p>{tooltipRelic.description}</p>
          <dl>
            {tooltipRelic.effects.map((effect) => {
              const presentation = effectLabels[effect.key];
              const value = getRpgRelicEffectValue(effect, tooltipLevel);

              return (
                <div key={effect.key}>
                  <dt>{presentation.label}</dt>
                  <dd>
                    {presentation.prefix}
                    {value}
                    {presentation.suffix}
                  </dd>
                </div>
              );
            })}
          </dl>
          <span>마우스를 올리거나 Tab으로 선택하면 확인할 수 있습니다.</span>
        </aside>
      )}
    </section>
  );
}
