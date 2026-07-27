"use client";

import { useEffect, useRef, useState } from "react";
import { AiNpcPanel } from "@/components/game/AiNpcPanel";
import { DefenceUpgradePanel } from "@/components/game/DefenceUpgradePanel";
import { RpgDialoguePanel } from "@/components/game/RpgDialoguePanel";
import { RpgDeathPanel } from "@/components/game/RpgDeathPanel";
import { RpgInventoryPanel } from "@/components/game/RpgInventoryPanel";
import { RpgJobChangePanel } from "@/components/game/RpgJobChangePanel";
import { RpgShopPanel } from "@/components/game/RpgShopPanel";
import { RunResultPanel } from "@/components/game/RunResultPanel";
import type { GameId } from "@/lib/gameCatalog";
import { useGameStore } from "@/stores/gameStore";

interface GameCanvasProps {
  gameId: GameId;
}

const controlLabels: Record<GameId, string> = {
  rpg: "이동 방향키 · 공격 A · 줍기 Z · 물약 ALT · 대시 L-SHIFT · 스킬 D",
  keeper: "이동 WASD · 파일 3개 회수 후 EXIT",
  defence: "이동 WASD · 자동 공격 · 강화 선택",
};

export function GameCanvas({ gameId }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<{
    error: string | null;
    key: string;
    ready: boolean;
  }>({ error: null, key: "", ready: false });
  const [retryRevision, setRetryRevision] = useState(0);
  const sessionRevision = useGameStore((state) => state.sessionRevision);
  const loadKey = `${gameId}:${sessionRevision}:${retryRevision}`;
  const isLoading = loadState.key !== loadKey || !loadState.ready;
  const errorMessage =
    loadState.key === loadKey ? loadState.error : null;

  useEffect(() => {
    let game: import("phaser").Game | undefined;
    let isDisposed = false;

    async function mountGame() {
      await Promise.resolve();
      const container = containerRef.current;

      if (!container) {
        setLoadState({
          error: "게임 화면을 초기화할 수 없습니다.",
          key: loadKey,
          ready: false,
        });
        return;
      }

      try {
        const { createCellWorldGame } = await import("@/game/createCellWorldGame");

        if (isDisposed) {
          return;
        }

        game = createCellWorldGame(container, gameId);
        setLoadState({ error: null, key: loadKey, ready: true });
      } catch {
        if (!isDisposed) {
          setLoadState({
            error:
              "게임 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            key: loadKey,
            ready: false,
          });
        }
      }
    }

    void mountGame();

    return () => {
      isDisposed = true;
      game?.destroy(true);
    };
  }, [gameId, loadKey]);

  return (
    <div className="phaser-frame">
      <div className="game-tip">
        <span>{gameId.toUpperCase()} / LIVE PROTOTYPE</span>
        <span>{controlLabels[gameId]}</span>
      </div>
      {isLoading && !errorMessage && (
        <div className="game-loading" role="status">
          <span />
          맵 데이터를 불러오는 중…
        </div>
      )}
      {errorMessage && (
        <div className="game-loading game-error" role="alert">
          <strong>GAME LOAD ERROR</strong>
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => setRetryRevision((revision) => revision + 1)}
          >
            다시 시도
          </button>
        </div>
      )}
      <div
        className="phaser-container"
        ref={containerRef}
        aria-label={`${gameId} 게임 화면`}
        tabIndex={0}
        onPointerDown={(event) => event.currentTarget.focus()}
      />
      {gameId === "rpg" && (
        <>
          <AiNpcPanel />
          <RpgDeathPanel />
          <RpgDialoguePanel />
          <RpgInventoryPanel />
          <RpgJobChangePanel />
          <RpgShopPanel />
        </>
      )}
      {gameId === "defence" && <DefenceUpgradePanel />}
      {gameId !== "rpg" && <RunResultPanel gameId={gameId} />}
    </div>
  );
}
