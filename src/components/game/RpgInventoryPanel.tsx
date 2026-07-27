"use client";

import Image from "next/image";
import { useEffect } from "react";
import { getRpgEquipment } from "@/lib/rpgShop";
import {
  getRpgRelic,
  RPG_RELIC_RARITIES,
} from "@/lib/rpgRelics";
import { useGameStore } from "@/stores/gameStore";

export function RpgInventoryPanel() {
  const hp = useGameStore((state) => state.hp);
  const maxHp = useGameStore((state) => state.maxHp);
  const rpgEquippedItems = useGameStore((state) => state.rpgEquippedItems);
  const rpgFoundRelics = useGameStore((state) => state.rpgFoundRelics);
  const rpgGold = useGameStore((state) => state.rpgGold);
  const rpgOwnedEquipment = useGameStore((state) => state.rpgOwnedEquipment);
  const rpgPotionCount = useGameStore((state) => state.rpgPotionCount);
  const rpgRelicLevels = useGameStore((state) => state.rpgRelicLevels);
  const drinkRpgPotion = useGameStore((state) => state.useRpgPotion);
  const equippedIds = new Set(Object.values(rpgEquippedItems));
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

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

  return (
    <section className="rpg-bottom-hud" aria-label="체력과 인벤토리">
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

          return relic ? (
            <article
              className={`is-relic is-${relic.rarity}`}
              key={relicId}
              title={`${RPG_RELIC_RARITIES[relic.rarity].label} · ${relic.description}`}
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
    </section>
  );
}
