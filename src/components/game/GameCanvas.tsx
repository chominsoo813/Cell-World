"use client";

import { useEffect, useRef, useState } from "react";
import { AiNpcPanel } from "@/components/game/AiNpcPanel";
import { DefenceUpgradePanel } from "@/components/game/DefenceUpgradePanel";
import { RunResultPanel } from "@/components/game/RunResultPanel";
import type { GameId } from "@/lib/gameCatalog";
import { useGameStore } from "@/stores/gameStore";

interface GameCanvasProps {
  gameId: GameId;
}

const controlLabels: Record<GameId, string> = {
  rpg: "이동 WASD · 공격 SPACE · 상호작용 E",
  keeper: "이동 WASD · 파일 3개 회수 후 EXIT",
  defence: "이동 WASD · 자동 공격 · 강화 선택",
};

export function GameCanvas({ gameId }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRevision = useGameStore((state) => state.sessionRevision);

  useEffect(() => {
    let game: import("phaser").Game | undefined;
    let isDisposed = false;

    async function mountGame() {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const { createCellWorldGame } = await import("@/game/createCellWorldGame");

      if (isDisposed) {
        return;
      }

      game = createCellWorldGame(container, gameId);
      setIsLoading(false);
    }

    void mountGame();

    return () => {
      isDisposed = true;
      game?.destroy(true);
    };
  }, [gameId, sessionRevision]);

  return (
    <div className="phaser-frame">
      <div className="game-tip">
        <span>{gameId.toUpperCase()} / LIVE PROTOTYPE</span>
        <span>{controlLabels[gameId]}</span>
      </div>
      {isLoading && (
        <div className="game-loading" role="status">
          <span />
          맵 데이터를 불러오는 중…
        </div>
      )}
      <div
        className="phaser-container"
        ref={containerRef}
        aria-label={`${gameId} 게임 화면`}
      />
      {gameId === "rpg" && <AiNpcPanel />}
      {gameId === "defence" && <DefenceUpgradePanel />}
      {gameId !== "rpg" && <RunResultPanel gameId={gameId} />}
    </div>
  );
}
