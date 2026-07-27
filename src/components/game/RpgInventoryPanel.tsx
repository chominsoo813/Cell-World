"use client";

import Image from "next/image";
import { getRpgEquipment } from "@/lib/rpgShop";
import { getRpgRelic } from "@/lib/rpgRelics";
import { useGameStore } from "@/stores/gameStore";

const equipmentIconPaths = {
  armor: "/assets/pixel-art/rpg/equipment/guardian-mark.png",
  boots: "/assets/pixel-art/rpg/equipment/wind-boots.png",
  relic: "/assets/pixel-art/rpg/equipment/wolf-eye.png",
  sword: "/assets/pixel-art/rpg/sword.png",
} as const;

export function RpgInventoryPanel() {
  const hp = useGameStore((state) => state.hp);
  const maxHp = useGameStore((state) => state.maxHp);
  const rpgEquippedItems = useGameStore((state) => state.rpgEquippedItems);
  const rpgFoundRelics = useGameStore((state) => state.rpgFoundRelics);
  const rpgGold = useGameStore((state) => state.rpgGold);
  const rpgOwnedEquipment = useGameStore((state) => state.rpgOwnedEquipment);
  const rpgPotionCount = useGameStore((state) => state.rpgPotionCount);
  const useRpgPotion = useGameStore((state) => state.useRpgPotion);
  const equippedIds = new Set(Object.values(rpgEquippedItems));

  return (
    <aside
      aria-label="현재 습득한 아이템"
      className="rpg-inventory-panel"
    >
      <header>
        <strong>INVENTORY</strong>
        <span>Z 습득 · 클릭 사용</span>
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
          aria-label={`회복 물약 ${rpgPotionCount}개 사용`}
          disabled={rpgPotionCount === 0 || hp >= maxHp}
          onClick={useRpgPotion}
          type="button"
        >
          <Image
            alt=""
            height={34}
            src="/assets/pixel-art/rpg/adventure/items/health-potion.png"
            unoptimized
            width={34}
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
                src={equipmentIconPaths[equipment.icon]}
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

          return relic ? (
            <article key={relicId} title={relic.description}>
              <Image
                alt=""
                height={34}
                src={relic.icon}
                unoptimized
                width={34}
              />
              <strong>1</strong>
              <small>{relic.name}</small>
            </article>
          ) : null;
        })}
        {rpgOwnedEquipment.length === 0 && rpgFoundRelics.length === 0 && (
          <p>아이템을 주워 슬롯을 채워보세요.</p>
        )}
      </div>
    </aside>
  );
}
