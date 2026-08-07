"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { RpgSpritePortrait } from "@/components/game/RpgSpritePortrait";
import {
  getRpgRelic,
  getRpgRelicEffectValue,
  RPG_RELIC_RARITIES,
  sortRpgRelicIdsByRarity,
  type RpgRelicEffectKey,
} from "@/lib/rpgRelics";
import { useGameStore } from "@/stores/gameStore";

const focusableSelector =
  'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

const effectPresentation: Readonly<
  Record<
    RpgRelicEffectKey,
    { label: string; prefix: "+" | "-"; suffix: "" | "%" }
  >
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

export function RpgRelicArchivePanel() {
  const closeArchive = useGameStore((state) => state.closeRpgRelicArchive);
  const foundRelics = useGameStore((state) => state.rpgFoundRelics);
  const relicLevels = useGameStore((state) => state.rpgRelicLevels);
  const panelRef = useRef<HTMLElement>(null);
  const ownedRelics = sortRpgRelicIdsByRarity(foundRelics).flatMap((id) => {
    const relic = getRpgRelic(id);
    return relic ? [{ level: relicLevels[id] ?? 1, relic }] : [];
  });
  const totalRelicCount = ownedRelics.reduce(
    (total, entry) => total + entry.level,
    0,
  );

  useEffect(() => {
    const focusFrame = requestAnimationFrame(() => panelRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key.toLowerCase() === "e") {
        event.preventDefault();
        closeArchive();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeArchive]);

  return (
    <div className="rpg-modal-layer rpg-relic-archive-layer">
      <section
        aria-describedby="rpg-relic-archive-description"
        aria-labelledby="rpg-relic-archive-title"
        aria-modal="true"
        className="rpg-relic-archive-panel"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header>
          <RpgSpritePortrait
            className="rpg-relic-archive-avatar"
            portrait="rpg-character-warrior"
          />
          <div>
            <small>RELIC KEEPER / COLLECTION ARCHIVE</small>
            <h2 id="rpg-relic-archive-title">유물 관리자 디거</h2>
            <p id="rpg-relic-archive-description">
              현재 캐릭터가 발견한 유물과 중복 획득으로 성장한 효과를 정리했습니다.
            </p>
          </div>
          <button aria-label="유물 도감 닫기" onClick={closeArchive} type="button">
            ×
          </button>
        </header>

        <div className="rpg-relic-archive-summary">
          <div>
            <small>DISCOVERED TYPES</small>
            <strong>{ownedRelics.length}</strong>
            <span>/ 18종</span>
          </div>
          <div>
            <small>TOTAL RELICS</small>
            <strong>{totalRelicCount}</strong>
            <span>개</span>
          </div>
          <p>
            “같은 유물도 다시 발견하면 힘이 겹쳐진다네. 각 용병의 수집 기록은
            서로 따로 관리하지.”
          </p>
        </div>

        <div className="rpg-relic-archive-content">
          {ownedRelics.length > 0 ? (
            <div className="rpg-relic-archive-grid">
              {ownedRelics.map(({ level, relic }) => {
                const rarity = RPG_RELIC_RARITIES[relic.rarity];
                return (
                  <article
                    className={`is-${relic.rarity}`}
                    key={relic.id}
                    style={{ "--relic-color": rarity.color } as CSSProperties}
                  >
                    <div className="rpg-relic-archive-icon">
                      <Image
                        alt={`${relic.name} 아이콘`}
                        height={58}
                        src={relic.icon}
                        width={58}
                      />
                      <strong>×{level}</strong>
                    </div>
                    <div className="rpg-relic-archive-copy">
                      <header>
                        <span>{rarity.label}</span>
                        <em>LV.{level}</em>
                      </header>
                      <h3>{relic.name}</h3>
                      <p>{relic.description}</p>
                      <dl>
                        {relic.effects.map((relicEffect) => {
                          const presentation = effectPresentation[relicEffect.key];
                          const value = getRpgRelicEffectValue(relicEffect, level);
                          return (
                            <div key={relicEffect.key}>
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
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rpg-relic-archive-empty">
              <span aria-hidden="true">◇</span>
              <h3>아직 발견한 유물이 없습니다</h3>
              <p>사냥터 몬스터와 보스를 처치하면 일정 확률로 유물을 발견합니다.</p>
            </div>
          )}
        </div>

        <footer>
          <span>E 또는 ESC로 닫기 · 유물은 등급 오름차순으로 정리됩니다.</span>
          <button onClick={closeArchive} type="button">
            도감 닫기
          </button>
        </footer>
      </section>
    </div>
  );
}
