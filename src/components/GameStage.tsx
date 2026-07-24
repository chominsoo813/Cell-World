"use client";

import { GameCanvas } from "@/components/game/GameCanvas";
import { HomeScreen } from "@/components/HomeScreen";
import type { ActiveView } from "@/stores/gameStore";

interface GameStageProps {
  activeView: ActiveView;
}

export function GameStage({ activeView }: GameStageProps) {
  return (
    <section className="game-stage" aria-live="polite">
      {activeView === "home" && <HomeScreen />}
      {activeView !== "home" && <GameCanvas gameId={activeView} />}
    </section>
  );
}
