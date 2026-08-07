"use client";

import { useEffect, useRef, useState } from "react";
import { RpgBlacksmithPanel } from "@/components/game/RpgBlacksmithPanel";
import { RpgCharacterSelectPanel } from "@/components/game/RpgCharacterSelectPanel";
import { RpgControlSchemePanel } from "@/components/game/RpgControlSchemePanel";
import { RpgCharacterStatsPanel } from "@/components/game/RpgCharacterStatsPanel";
import { RpgDialoguePanel } from "@/components/game/RpgDialoguePanel";
import { RpgBossHealthHud } from "@/components/game/RpgBossHealthHud";
import { RpgGuidePanel } from "@/components/game/RpgGuidePanel";
import { RpgDeathPanel } from "@/components/game/RpgDeathPanel";
import { RpgInventoryPanel } from "@/components/game/RpgInventoryPanel";
import { RpgJobChangePanel } from "@/components/game/RpgJobChangePanel";
import { RpgJobSwitchPanel } from "@/components/game/RpgJobSwitchPanel";
import { RpgRaidControls } from "@/components/game/RpgRaidControls";
import { RpgRaidLeaderboardPanel } from "@/components/game/RpgRaidLeaderboardPanel";
import { RpgRelicArchivePanel } from "@/components/game/RpgRelicArchivePanel";
import { RpgShopPanel } from "@/components/game/RpgShopPanel";
import type { GameId } from "@/lib/gameCatalog";
import { RPG_WORLD_READY_EVENT } from "@/lib/rpgLoading";
import { useGameStore } from "@/stores/gameStore";

interface GameCanvasProps {
  gameId: GameId;
}

const sceneRuntimeVersions: Partial<Record<GameId, string>> = {
  rpg: "1",
};

export function GameCanvas({ gameId }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<{
    error: string | null;
    key: string;
    ready: boolean;
  }>({ error: null, key: "", ready: false });
  const [retryRevision, setRetryRevision] = useState(0);
  const [rpgLoadingProgress, setRpgLoadingProgress] = useState(12);
  const sessionRevision = useGameStore((state) => state.sessionRevision);
  const rpgBlacksmithOpen = useGameStore((state) => state.rpgBlacksmithOpen);
  const rpgCharacterSelectOpen = useGameStore(
    (state) => state.rpgCharacterSelectOpen,
  );
  const rpgControlSchemeOpen = useGameStore(
    (state) => state.rpgControlSchemeOpen,
  );
  const rpgGuideOpen = useGameStore((state) => state.rpgGuideOpen);
  const rpgJobSwitchOpen = useGameStore((state) => state.rpgJobSwitchOpen);
  const rpgRelicArchiveOpen = useGameStore(
    (state) => state.rpgRelicArchiveOpen,
  );
  const rpgCharacterStatsOpen = useGameStore(
    (state) => state.rpgCharacterStatsOpen,
  );
  const isRpgBlockingModal =
    gameId === "rpg" &&
    (rpgBlacksmithOpen ||
      rpgCharacterSelectOpen ||
      rpgControlSchemeOpen ||
      rpgGuideOpen ||
      rpgJobSwitchOpen ||
      rpgRelicArchiveOpen ||
      rpgCharacterStatsOpen);
  const loadKey = `${gameId}:${sceneRuntimeVersions[gameId]}:${sessionRevision}:${retryRevision}`;
  const isLoading = loadState.key !== loadKey || !loadState.ready;
  const errorMessage =
    loadState.key === loadKey ? loadState.error : null;

  useEffect(() => {
    if (gameId !== "rpg" || !isLoading || errorMessage) {
      return;
    }

    setRpgLoadingProgress(12);
    const progressTimer = window.setInterval(() => {
      setRpgLoadingProgress((progress) =>
        Math.min(90, progress + (progress < 55 ? 5 : 2)),
      );
    }, 180);

    return () => window.clearInterval(progressTimer);
  }, [errorMessage, gameId, isLoading]);

  useEffect(() => {
    let game: import("phaser").Game | undefined;
    let isDisposed = false;

    const handleWorldReady = () => {
      if (!isDisposed) {
        setRpgLoadingProgress(100);
        setLoadState({ error: null, key: loadKey, ready: true });
      }
    };

    window.addEventListener(RPG_WORLD_READY_EVENT, handleWorldReady);

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

        setLoadState({ error: null, key: loadKey, ready: false });
        game = createCellWorldGame(container, gameId);
      } catch (error) {
        console.error(`[Pixel Dot Land] Failed to load ${gameId}`, error);
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
      window.removeEventListener(RPG_WORLD_READY_EVENT, handleWorldReady);
      game?.destroy(true);
    };
  }, [gameId, loadKey]);

  return (
    <div className="phaser-frame">
      {isLoading && !errorMessage && (
        <div
          className={
            gameId === "rpg" ? "game-loading rpg-world-loading" : "game-loading"
          }
          role="status"
        >
          {gameId === "rpg" ? (
            <div className="rpg-world-loading-content">
              <p className="rpg-world-loading-kicker">PIXEL DOT LAND</p>
              <strong>LOADING</strong>
              <p>모험을 준비 중입니다…</p>
              <div
                aria-label={`게임 로딩 ${rpgLoadingProgress}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={rpgLoadingProgress}
                className="rpg-world-loading-progress"
                role="progressbar"
              >
                <span style={{ width: `${rpgLoadingProgress}%` }} />
              </div>
              <em>{rpgLoadingProgress}%</em>
            </div>
          ) : (
            <>
              <span />
              맵 데이터를 불러오는 중…
            </>
          )}
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
        aria-hidden={isRpgBlockingModal || undefined}
        className="phaser-container"
        inert={isRpgBlockingModal || undefined}
        ref={containerRef}
        aria-label={`${gameId} 게임 화면`}
        onContextMenu={(event) => event.preventDefault()}
        tabIndex={0}
        onPointerDown={(event) => event.currentTarget.focus()}
      />
      {gameId === "rpg" && (
        <>
          <RpgDeathPanel />
          <RpgDialoguePanel />
          <RpgBossHealthHud />
          <RpgInventoryPanel />
          <RpgRaidControls />
          <RpgRaidLeaderboardPanel />
          <RpgJobChangePanel />
          {rpgJobSwitchOpen && <RpgJobSwitchPanel />}
          {rpgRelicArchiveOpen && <RpgRelicArchivePanel />}
          {rpgCharacterStatsOpen && <RpgCharacterStatsPanel />}
          <RpgShopPanel />
          {rpgBlacksmithOpen && <RpgBlacksmithPanel />}
          {rpgCharacterSelectOpen && <RpgCharacterSelectPanel />}
          {rpgControlSchemeOpen && <RpgControlSchemePanel />}
          {rpgGuideOpen && <RpgGuidePanel />}
        </>
      )}
    </div>
  );
}
