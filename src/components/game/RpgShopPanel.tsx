"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { RpgSpritePortrait } from "@/components/game/RpgSpritePortrait";
import {
  RPG_SHOP_ITEMS,
  type RpgEquipmentId,
} from "@/lib/rpgShop";
import { RPG_RELIC_RARITIES } from "@/lib/rpgRelics";
import { useGameStore } from "@/stores/gameStore";

export function RpgShopPanel() {
  const [notice, setNotice] = useState("장비를 구매하면 바로 장착됩니다.");
  const buyEquipment = useGameStore((state) => state.buyRpgEquipment);
  const closeShop = useGameStore((state) => state.closeRpgShop);
  const equipEquipment = useGameStore((state) => state.equipRpgEquipment);
  const equippedItems = useGameStore((state) => state.rpgEquippedItems);
  const gold = useGameStore((state) => state.rpgGold);
  const isOpen = useGameStore((state) => state.rpgShopOpen);
  const ownedEquipment = useGameStore((state) => state.rpgOwnedEquipment);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeShop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeShop, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleItemAction = (equipmentId: RpgEquipmentId) => {
    const equipment = RPG_SHOP_ITEMS.find((item) => item.id === equipmentId);
    if (!equipment) {
      return;
    }

    if (ownedEquipment.includes(equipmentId)) {
      equipEquipment(equipmentId);
      setNotice(`${equipment.name}을(를) 장착했습니다.`);
      return;
    }

    if (buyEquipment(equipmentId)) {
      setNotice(`${equipment.name}을(를) 구매하고 장착했습니다.`);
    } else {
      setNotice("골드가 부족합니다. 필드 상자와 퀘스트 보상을 확인하세요.");
    }
  };

  return (
    <section
      aria-labelledby="rpg-shop-title"
      aria-modal="true"
      className="rpg-shop-panel"
      role="dialog"
    >
      <header>
        <div>
          <RpgSpritePortrait
            className="shop-merchant-avatar"
            portrait="rpg-character-pirate"
          />
          <div>
            <small>MERCHANT / EQUIPMENT SHOP</small>
            <h2 id="rpg-shop-title">상인 피코의 장비점</h2>
            <p>필요한 장비가 있다면 언제든지 둘러보세요.</p>
          </div>
        </div>
        <div className="shop-balance">
          <strong>{gold}G</strong>
          <button type="button" onClick={closeShop} aria-label="상점 닫기">
            ×
          </button>
        </div>
      </header>
      <p className="shop-notice">{notice}</p>
      <div className="shop-item-grid">
        {RPG_SHOP_ITEMS.map((item) => {
          const isOwned = ownedEquipment.includes(item.id);
          const isEquipped = equippedItems[item.slot] === item.id;

          return (
            <article
              key={item.id}
              className={`${isEquipped ? "is-equipped " : ""}is-${item.rarity}`}
            >
              <span className="shop-item-icon" aria-hidden="true">
                <Image
                  alt=""
                  height={54}
                  src={item.iconPath}
                  unoptimized
                  width={54}
                />
              </span>
              <div>
                <small>
                  {RPG_RELIC_RARITIES[item.rarity].label} ·{" "}
                  {item.slot.toUpperCase()}
                </small>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              <button
                type="button"
                disabled={isEquipped}
                onClick={() => handleItemAction(item.id)}
              >
                {isEquipped
                  ? "장착 중"
                  : isOwned
                    ? "장착"
                    : `${item.price}G 구매`}
              </button>
            </article>
          );
        })}
      </div>
      <footer>
        <span>상자와 몬스터를 탐험해 골드를 모으세요.</span>
        <button type="button" onClick={closeShop}>
          상점 닫기
        </button>
      </footer>
    </section>
  );
}
