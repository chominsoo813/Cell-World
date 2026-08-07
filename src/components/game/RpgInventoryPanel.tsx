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
  getRpgWeaponEnhancementCooldownReductionPercent,
  getRpgWeaponEnhancementMultiplier,
} from "@/lib/rpgEnhancement";
import { getRpgEquipment } from "@/lib/rpgShop";
import {
  getRpgRelic,
  getRpgRelicEffectValue,
  RPG_RELIC_RARITIES,
  sortRpgRelicIdsByRarity,
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
const RPG_POTION_ICON = "/assets/pixel-art/rpg/adventure/items/health-potion.png";
const RPG_COIN_ICON = "/assets/pixel-art/rpg/coin.png";

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
  goldPercent: { label: "골드 획득", prefix: "+", suffix: "%" },
  killHeal: { label: "처치 시 HP", prefix: "+", suffix: "" },
  maxHp: { label: "최대 HP", prefix: "+", suffix: "" },
  moveSpeedPercent: { label: "이동 속도", prefix: "+", suffix: "%" },
  retaliationDamage: { label: "반격 피해", prefix: "+", suffix: "" },
  skillCooldownPercent: { label: "스킬 재사용 대기", prefix: "-", suffix: "%" },
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
    text: normalizedRemaining <= 0 ? "READY" : `${(normalizedRemaining / 1_000).toFixed(1)}s`,
  };
}

export function RpgInventoryPanel() {
  const activeCharacterId = useGameStore((state) => state.activeRpgCharacterId);
  const hp = useGameStore((state) => state.hp);
  const experience = useGameStore((state) => state.experience);
  const level = useGameStore((state) => state.level);
  const rpgClassId = useGameStore((state) => state.rpgClassId);
  const rpgControlScheme = useGameStore((state) => state.rpgControlScheme);
  const maxHp = useGameStore((state) => state.maxHp);
  const rpgEquippedItems = useGameStore((state) => state.rpgEquippedItems);
  const rpgFoundRelics = useGameStore((state) => state.rpgFoundRelics);
  const rpgGold = useGameStore((state) => state.rpgGold);
  const rpgPotionCount = useGameStore((state) => state.rpgPotionCount);
  const rpgRelicLevels = useGameStore((state) => state.rpgRelicLevels);
  const weaponEnhancementLevel = useGameStore((state) => state.rpgWeaponEnhancementLevel);
  const drinkRpgPotion = useGameStore((state) => state.useRpgPotion);
  const [activeTooltip, setActiveTooltip] = useState<ActiveRelicTooltip | null>(null);
  const cooldownIdentity = `${activeCharacterId ?? "none"}:${rpgClassId}`;
  const [cooldownSnapshot, setCooldownSnapshot] = useState<CombatCooldownSnapshot>({
    ...INITIAL_COOLDOWNS,
    identity: cooldownIdentity,
  });
  const cooldowns = cooldownSnapshot.identity === cooldownIdentity ? cooldownSnapshot : INITIAL_COOLDOWNS;
  const hudRef = useRef<HTMLElement>(null);
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isMaxLevel = level >= RPG_MAX_LEVEL;
  const experiencePercent = isMaxLevel
    ? 100
    : Math.max(0, Math.min(100, (experience / RPG_EXPERIENCE_PER_LEVEL) * 100));
  const classDefinition = getRpgClass(rpgClassId);
  const basicAttackControl =
    rpgControlScheme === "keyboard_mouse" ? "좌클릭" : "A";
  const classSkillControl =
    rpgControlScheme === "keyboard_mouse" ? "우클릭" : "D";
  const classPortrait = rpgClassId === "adventurer" ? "rpg-character-adventurer-front" : `rpg-character-${rpgClassId}`;
  const equippedWeapon = rpgEquippedItems.weapon ? getRpgEquipment(rpgEquippedItems.weapon) : undefined;
  const basicAttackIcon = equippedWeapon?.iconPath ?? classDefinition.iconFile;
  const sortedFoundRelics = sortRpgRelicIdsByRarity(rpgFoundRelics);
  const weaponEnhancementMultiplier = getRpgWeaponEnhancementMultiplier(weaponEnhancementLevel);
  const weaponEnhancementPercent = Math.round((weaponEnhancementMultiplier - 1) * 100);
  const weaponCooldownReductionPercent = getRpgWeaponEnhancementCooldownReductionPercent(weaponEnhancementLevel);
  const skillCooldown = getCooldownPresentation(cooldowns.skillRemainingMs, cooldowns.skillTotalMs);
  const dashCooldown = getCooldownPresentation(cooldowns.dashRemainingMs, cooldowns.dashTotalMs);
  const visibleTooltip =
    activeTooltip?.characterId === activeCharacterId && rpgFoundRelics.includes(activeTooltip.id)
      ? activeTooltip
      : null;
  const tooltipRelic = visibleTooltip ? getRpgRelic(visibleTooltip.id) : undefined;
  const tooltipLevel = visibleTooltip ? (rpgRelicLevels[visibleTooltip.id] ?? 1) : 1;

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
        setCooldownSnapshot({ ...customEvent.detail, identity: cooldownIdentity });
      }
    };
    window.addEventListener(RPG_COMBAT_COOLDOWN_EVENT, handleCooldownUpdate);
    return () => window.removeEventListener(RPG_COMBAT_COOLDOWN_EVENT, handleCooldownUpdate);
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
    <section className="rpg-bottom-hud" aria-label="캐릭터 상태와 전투 HUD" ref={hudRef}>
      <aside
        aria-label={`레벨 ${level}, 경험치 ${experience}/${RPG_EXPERIENCE_PER_LEVEL}, 체력 ${hp}/${maxHp}`}
        className="rpg-hud-character"
      >
        <RpgSpritePortrait
          className="rpg-hud-character-portrait"
          label={`${classDefinition.name} 아바타`}
          portrait={classPortrait}
        />
        <div className="rpg-hud-character-copy">
          <header>
            <strong>Lv.{level}</strong>
            <span>{classDefinition.name}</span>
            <small>{isMaxLevel ? "EXP MAX" : `EXP ${experiencePercent.toFixed(1)}%`}</small>
          </header>
          <div
            aria-label={isMaxLevel ? "최대 레벨" : `경험치 ${experiencePercent}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={experiencePercent}
            className="rpg-hud-experience-track"
            role="progressbar"
          >
            <i style={{ width: `${experiencePercent}%` }} />
          </div>
          <div className="rpg-hud-health-row">
            <strong>HP</strong>
            <div aria-hidden="true"><i style={{ width: `${hpPercent}%` }} /></div>
            <span>{hp}/{maxHp}</span>
          </div>
        </div>
      </aside>

      <aside aria-label="스킬과 전투 단축키" className="rpg-hud-actions">
        <div
          className="rpg-hud-action-slot"
          title={`기본 공격 · ${basicAttackControl}`}
        >
          <kbd className={rpgControlScheme === "keyboard_mouse" ? "is-mouse" : undefined}>
            {basicAttackControl}
          </kbd>
          <Image alt="" height={48} src={basicAttackIcon} unoptimized width={48} />
          <span>기본 공격</span>
        </div>
        <div
          aria-label={`${classDefinition.skill.name} ${skillCooldown.ready ? "사용 가능" : `${skillCooldown.text} 남음`}`}
          className={`rpg-hud-action-slot${skillCooldown.ready ? " is-ready" : ""}`}
        >
          <kbd className={rpgControlScheme === "keyboard_mouse" ? "is-mouse" : undefined}>
            {classSkillControl}
          </kbd>
          <Image alt="" height={48} src={classDefinition.iconFile} unoptimized width={48} />
          <strong>{skillCooldown.text}</strong>
          <i aria-hidden="true"><b style={{ width: `${skillCooldown.progress}%` }} /></i>
          <span>{classDefinition.skill.name}</span>
        </div>
        <div
          aria-label={`대시 ${dashCooldown.ready ? "사용 가능" : `${dashCooldown.text} 남음`}`}
          className={`rpg-hud-action-slot${dashCooldown.ready ? " is-ready" : ""}`}
        >
          <kbd>SHIFT</kbd>
          <Image alt="" height={48} src={RPG_DASH_ICON} unoptimized width={48} />
          <strong>{dashCooldown.text}</strong>
          <i aria-hidden="true"><b style={{ width: `${dashCooldown.progress}%` }} /></i>
          <span>대시</span>
        </div>
        <button
          aria-label={`회복 물약 ${rpgPotionCount}개 사용, Alt 키`}
          className="rpg-hud-action-slot rpg-hud-potion"
          disabled={rpgPotionCount === 0 || hp >= maxHp}
          onClick={drinkRpgPotion}
          title="Alt 키로 회복 물약 사용"
          type="button"
        >
          <kbd>ALT</kbd>
          <Image alt="" height={48} src={RPG_POTION_ICON} unoptimized width={48} />
          <strong>×{rpgPotionCount}</strong>
          <span>회복 물약</span>
        </button>
        <div
          aria-label={`무기 강화 +${weaponEnhancementLevel}, 공격력 ${weaponEnhancementPercent}% 증가, 쿨다운 ${weaponCooldownReductionPercent}% 감소`}
          className="rpg-hud-enhancement"
          title={`ATK +${weaponEnhancementPercent}% · CD -${weaponCooldownReductionPercent}%`}
        >
          <small>WEAPON</small>
          <strong>+{weaponEnhancementLevel}</strong>
          <span>ATK +{weaponEnhancementPercent}%</span>
        </div>
      </aside>

      <aside aria-label="현재 습득한 유물과 골드" className="rpg-hud-relics">
        <header><span>✦</span> 유물 <small>{sortedFoundRelics.length}/18</small></header>
        <div className="rpg-hud-relic-grid">
          {sortedFoundRelics.map((relicId) => {
            const relic = getRpgRelic(relicId);
            const relicLevel = rpgRelicLevels[relicId] ?? 1;
            const isTooltipOpen = visibleTooltip?.id === relicId;

            return relic ? (
              <article
                aria-describedby={isTooltipOpen ? "rpg-active-relic-tooltip" : undefined}
                aria-label={`${relic.name}, ${RPG_RELIC_RARITIES[relic.rarity].label}, 레벨 ${relicLevel}. ${relic.description}`}
                className={`is-${relic.rarity}`}
                key={relicId}
                onBlur={() => setActiveTooltip(null)}
                onFocus={(event) => showRelicTooltip(relicId, event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setActiveTooltip(null);
                    event.currentTarget.blur();
                  }
                }}
                onMouseEnter={(event) => showRelicTooltip(relicId, event.currentTarget)}
                onMouseLeave={(event) => {
                  if (document.activeElement !== event.currentTarget) setActiveTooltip(null);
                }}
                tabIndex={0}
              >
                <Image alt="" height={34} src={relic.icon} unoptimized width={34} />
              </article>
            ) : null;
          })}
          {sortedFoundRelics.length === 0 && <p>아직 발견한 유물이 없습니다.</p>}
        </div>
        <footer>
          <Image alt="" height={24} src={RPG_COIN_ICON} unoptimized width={24} />
          <strong>{rpgGold.toLocaleString()}</strong>
        </footer>
      </aside>

      {tooltipRelic && visibleTooltip && (
        <aside
          className={`rpg-relic-tooltip is-${tooltipRelic.rarity}`}
          id="rpg-active-relic-tooltip"
          role="tooltip"
          style={{ left: `${visibleTooltip.left}px` }}
        >
          <header>
            <Image alt="" height={42} src={tooltipRelic.icon} unoptimized width={42} />
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
                  <dd>{presentation.prefix}{value}{presentation.suffix}</dd>
                </div>
              );
            })}
          </dl>
          <span>마우스를 올리거나 Tab 키로 선택하면 상세 효과를 확인할 수 있습니다.</span>
        </aside>
      )}
    </section>
  );
}
