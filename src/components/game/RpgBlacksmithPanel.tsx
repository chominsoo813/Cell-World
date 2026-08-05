"use client";

import { useEffect, useRef, useState } from "react";
import { RpgSpritePortrait } from "@/components/game/RpgSpritePortrait";
import { getRpgClass } from "@/lib/rpgClasses";
import {
  getRpgWeaponEnhancementChance,
  getRpgWeaponEnhancementCooldownReductionPercent,
  getRpgWeaponEnhancementCost,
  RPG_WEAPON_ENHANCEMENT_MAX_LEVEL,
  RPG_WEAPON_ENHANCEMENT_SUCCESS_CHANCES,
} from "@/lib/rpgEnhancement";
import {
  dispatchRpgSfxRequest,
  shouldPlayRpgEnhancementSfx,
} from "@/lib/rpgSfx";
import { useGameStore } from "@/stores/gameStore";

const enhancementCosts = Array.from(
  { length: RPG_WEAPON_ENHANCEMENT_MAX_LEVEL },
  (_, level) => getRpgWeaponEnhancementCost(level) ?? 0,
);

const focusableSelector =
  'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export function RpgBlacksmithPanel() {
  const activeCharacterId = useGameStore(
    (state) => state.activeRpgCharacterId,
  );
  const characters = useGameStore((state) => state.rpgCharacters);
  const closeBlacksmith = useGameStore((state) => state.closeRpgBlacksmith);
  const enhanceWeapon = useGameStore((state) => state.enhanceRpgWeapon);
  const gold = useGameStore((state) => state.rpgGold);
  const isOpen = useGameStore((state) => state.rpgBlacksmithOpen);
  const enhancementLevel = useGameStore(
    (state) => state.rpgWeaponEnhancementLevel,
  );
  const [notice, setNotice] = useState(
    "강화에 실패해도 무기의 단계는 유지되지만 시도 비용은 소모됩니다.",
  );
  const actionRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const activeCharacter = characters.find(
    (character) => character.id === activeCharacterId,
  );
  const classDefinition = activeCharacter
    ? getRpgClass(activeCharacter.rpgClassId)
    : null;
  const chance = getRpgWeaponEnhancementChance(enhancementLevel);
  const cost = getRpgWeaponEnhancementCost(enhancementLevel);
  const cooldownReductionPercent =
    getRpgWeaponEnhancementCooldownReductionPercent(enhancementLevel);
  const enhancementEffectSummary = `ATK +${enhancementLevel * 10}% · CD -${cooldownReductionPercent}%`;
  const isMax = enhancementLevel >= RPG_WEAPON_ENHANCEMENT_MAX_LEVEL;
  const canEnhance = Boolean(
    activeCharacter && !isMax && cost !== null && gold >= cost,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusFrame = requestAnimationFrame(() => {
      const preferredTarget = actionRef.current?.disabled
        ? panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        : actionRef.current;
      preferredTarget?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const focusable = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
        );
        const first = focusable[0];
        const last = focusable.at(-1);

        if (first && last) {
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeBlacksmith();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeBlacksmith, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleEnhance = () => {
    const result = enhanceWeapon();
    const formattedChance = Math.round(result.chance * 100);
    if (shouldPlayRpgEnhancementSfx(result.status)) {
      dispatchRpgSfxRequest({ key: "blacksmithEnhance", volume: 0.55 });
    }

    switch (result.status) {
      case "success": {
        const nextCooldownReductionPercent =
          getRpgWeaponEnhancementCooldownReductionPercent(result.level);
        setNotice(
          `강화 성공! 무기가 +${result.level} 단계가 되었습니다. 공격력 +${result.level * 10}%, 스킬·대시 쿨타임 -${nextCooldownReductionPercent}%가 적용됩니다.`,
        );
        break;
      }
      case "failed":
        setNotice(
          `강화 실패 · ${result.cost}G를 소모했습니다. +${result.level} 단계는 유지됩니다.`,
        );
        break;
      case "insufficient_gold":
        setNotice(`골드가 부족합니다. 이번 시도에는 ${result.cost}G가 필요합니다.`);
        break;
      case "max_level":
        setNotice("이미 최고 강화 단계인 +10에 도달했습니다.");
        break;
      case "no_character":
        setNotice("먼저 플레이할 캐릭터를 선택해 주세요.");
        break;
      default:
        setNotice(`강화 확률 ${formattedChance}%를 확인해 주세요.`);
    }
  };

  const unavailableReason = !activeCharacter
    ? "플레이할 캐릭터를 먼저 선택해 주세요."
    : isMax
      ? "최고 강화 단계에 도달했습니다."
      : cost !== null && gold < cost
        ? `${cost - gold}G가 더 필요합니다.`
        : "";

  return (
    <div className="rpg-modal-layer rpg-blacksmith-layer">
      <section
        aria-describedby="rpg-blacksmith-description"
        aria-labelledby="rpg-blacksmith-title"
        aria-modal="true"
        className="rpg-blacksmith-panel"
        ref={panelRef}
        role="dialog"
      >
        <header>
          <div>
            <RpgSpritePortrait
              className="blacksmith-avatar"
              portrait="rpg-character-greatsword"
            />
            <div>
              <small>BLACKSMITH / WEAPON ENHANCE</small>
              <h2 id="rpg-blacksmith-title">대장장이 브람</h2>
              <p id="rpg-blacksmith-description">
                캐릭터의 기본·직업 무기를 최대 +10까지 강화합니다.
              </p>
            </div>
          </div>
          <div className="shop-balance">
            <strong>{gold}G</strong>
            <button
              aria-label="대장간 닫기"
              onClick={closeBlacksmith}
              type="button"
            >
              ×
            </button>
          </div>
        </header>

        <p aria-live="polite" className="blacksmith-notice">
          {notice}
        </p>

        <div className="rpg-blacksmith-content">
          <section className="rpg-weapon-card" aria-label="현재 무기 강화 정보">
            <div className="rpg-weapon-emblem" aria-hidden="true">
              <span>+{enhancementLevel}</span>
            </div>
            <div>
              <small>CURRENT CHARACTER WEAPON</small>
              <h3>
                {classDefinition
                  ? `${classDefinition.name}의 기본 무기`
                  : "선택된 캐릭터 없음"}
              </h3>
              <p>{activeCharacter?.name ?? "캐릭터를 먼저 선택해 주세요."}</p>
            </div>
            <dl>
              <div>
                <dt>현재 단계</dt>
                <dd>+{enhancementLevel}</dd>
              </div>
              <div>
                <dt>강화 효과</dt>
                <dd>{enhancementEffectSummary}</dd>
              </div>
              <div>
                <dt>다음 성공 확률</dt>
                <dd>{chance === null ? "MAX" : `${Math.round(chance * 100)}%`}</dd>
              </div>
              <div>
                <dt>시도 비용</dt>
                <dd>{cost === null ? "-" : `${cost}G`}</dd>
              </div>
            </dl>
            <button
              aria-describedby="rpg-blacksmith-unavailable"
              disabled={!canEnhance}
              onClick={handleEnhance}
              ref={actionRef}
              type="button"
            >
              {isMax
                ? "+10 MAX"
                : `+${enhancementLevel + 1} 강화 시도 · ${cost ?? 0}G`}
            </button>
            <p id="rpg-blacksmith-unavailable">{unavailableReason}</p>
          </section>

          <section aria-labelledby="rpg-enhancement-table-title">
            <div className="rpg-character-section-heading">
              <h3 id="rpg-enhancement-table-title">강화 확률표</h3>
              <span>실패 시 단계 유지</span>
            </div>
            <ol className="rpg-enhancement-table">
              {RPG_WEAPON_ENHANCEMENT_SUCCESS_CHANCES.map(
                (successChance, level) => (
                  <li
                    className={
                      (isMax ? level === enhancementLevel - 1 : level === enhancementLevel)
                        ? "is-current"
                        : undefined
                    }
                    key={level}
                  >
                    <span>
                      +{level} → +{level + 1}
                    </span>
                    <strong>{Math.round(successChance * 100)}%</strong>
                    <span>{enhancementCosts[level]}G</span>
                  </li>
                ),
              )}
            </ol>
          </section>
        </div>

        <footer>
          <span>
            강화 1단계마다 공격력 +10% · 스킬·대시 쿨타임 ×0.9
          </span>
          <button onClick={closeBlacksmith} type="button">
            대장간 닫기
          </button>
        </footer>
      </section>
    </div>
  );
}
