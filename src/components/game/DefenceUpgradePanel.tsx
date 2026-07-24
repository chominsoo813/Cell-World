"use client";

import {
  useGameStore,
  type DefenceUpgrade,
} from "@/stores/gameStore";

const upgrades: Array<{
  description: string;
  iconClass: string;
  id: DefenceUpgrade;
  title: string;
}> = [
  {
    id: "damage",
    iconClass: "upgrade-icon--damage",
    title: "PAPERCLIP",
    description: "페이퍼클립 피해량 +1",
  },
  {
    id: "speed",
    iconClass: "upgrade-icon--speed",
    title: "STAPLER",
    description: "자동 공격 속도 +15%",
  },
  {
    id: "health",
    iconClass: "upgrade-icon--health",
    title: "HEALTH UP",
    description: "최대 체력 +20 · 즉시 회복",
  },
];

export function DefenceUpgradePanel() {
  const chooseDefenceUpgrade = useGameStore(
    (state) => state.chooseDefenceUpgrade,
  );
  const isPending = useGameStore((state) => state.defenceUpgradePending);
  const level = useGameStore((state) => state.defenceLevel);

  if (!isPending) {
    return null;
  }

  return (
    <section className="upgrade-panel" aria-label="레벨업 강화 선택">
      <span>LEVEL {level} / SELECT UPGRADE</span>
      <h2>업무 능력을 강화하세요</h2>
      <div>
        {upgrades.map((upgrade) => (
          <button
            key={upgrade.id}
            type="button"
            onClick={() => chooseDefenceUpgrade(upgrade.id)}
          >
            <i
              className={`upgrade-pixel-icon ${upgrade.iconClass}`}
              aria-hidden="true"
            />
            <strong>{upgrade.title}</strong>
            <small>{upgrade.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
