"use client";

import { GameStage } from "@/components/GameStage";
import { PixelDotStartScreen } from "@/components/PixelDotStartScreen";
import { useGameStore } from "@/stores/gameStore";

export function CellWorldApp() {
  const activeView = useGameStore((state) => state.activeView);

  return (
    <main className="app-frame pixel-dot-app">
      {activeView === "home" ? (
        <PixelDotStartScreen />
      ) : (
        <section aria-label="Pixel Dot Land 게임" className="pixel-dot-runtime">
          <GameStage activeView="rpg" />
        </section>
      )}
    </main>
  );
}
