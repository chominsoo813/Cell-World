"use client";

import { useEffect, useState } from "react";
import {
  RPG_BOSS_HEALTH_EVENT,
  type RpgBossHealthDetail,
} from "@/lib/rpgBossHud";

const EMPTY_STATE: RpgBossHealthDetail = { bosses: [] };

export function RpgBossHealthHud() {
  const [state, setState] = useState<RpgBossHealthDetail>(EMPTY_STATE);

  useEffect(() => {
    const handleBossHealth = (event: Event) => {
      const detail = (event as CustomEvent<RpgBossHealthDetail>).detail;
      if (detail) setState(detail);
    };

    window.addEventListener(RPG_BOSS_HEALTH_EVENT, handleBossHealth);
    return () => window.removeEventListener(RPG_BOSS_HEALTH_EVENT, handleBossHealth);
  }, []);

  if (state.bosses.length === 0) return null;

  return (
    <section
      aria-label="Boss health"
      className={`rpg-boss-health-hud${state.bosses.length > 1 ? " is-multiple" : ""}`}
    >
      {state.bosses.map((boss) => {
        const percentage = Math.max(0, Math.min(100, (boss.currentHp / Math.max(1, boss.maxHp)) * 100));
        return (
          <article key={boss.id}>
            <header>
              <span>BOSS</span>
              <strong>{boss.name}</strong>
              <em>{Math.max(0, boss.currentHp).toLocaleString()} / {boss.maxHp.toLocaleString()}</em>
            </header>
            <div
              aria-label={`${boss.name}: ${Math.round(percentage)}% health remaining`}
              aria-valuemax={boss.maxHp}
              aria-valuemin={0}
              aria-valuenow={Math.max(0, boss.currentHp)}
              className="rpg-boss-health-track"
              role="progressbar"
            >
              <i style={{ width: `${percentage}%` }} />
            </div>
          </article>
        );
      })}
    </section>
  );
}
