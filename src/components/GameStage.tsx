"use client";

import { useEffect, useRef, useState } from "react";
import { GameCanvas } from "@/components/game/GameCanvas";
import { HomeScreen } from "@/components/HomeScreen";
import type { ActiveView } from "@/stores/gameStore";

interface GameStageProps {
  activeView: ActiveView;
}

export function GameStage({ activeView }: GameStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = async () => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      await stage.requestFullscreen();
    } catch {
      // Browsers can reject fullscreen when the click is not a trusted gesture.
    }
  };

  return (
    <section className="game-stage" aria-live="polite" ref={stageRef}>
      {activeView === "home" && <HomeScreen />}
      {activeView !== "home" && <GameCanvas gameId={activeView} />}
      {activeView !== "home" && (
        <button
          aria-label={isFullscreen ? "전체화면 종료" : "게임 전체화면"}
          aria-pressed={isFullscreen}
          className="game-fullscreen-toggle"
          onClick={handleFullscreenToggle}
          title={isFullscreen ? "전체화면 종료 (Esc)" : "게임만 전체화면"}
          type="button"
        >
          <span aria-hidden="true">{isFullscreen ? "↙" : "⛶"}</span>
          {isFullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN"}
        </button>
      )}
    </section>
  );
}
