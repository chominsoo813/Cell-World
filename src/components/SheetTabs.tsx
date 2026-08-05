"use client";

import { gameCatalog } from "@/lib/gameCatalog";
import { primeRpgAudioContext } from "@/lib/rpgAudio";
import { useGameStore, type ActiveView } from "@/stores/gameStore";

interface SheetTabsProps {
  activeView: ActiveView;
}

export function SheetTabs({ activeView }: SheetTabsProps) {
  const setActiveView = useGameStore((state) => state.setActiveView);
  const openGame = (gameId: ActiveView) => {
    if (gameId === "rpg") {
      primeRpgAudioContext();
    }
    setActiveView(gameId);
  };

  return (
    <nav className="sheet-tabs" aria-label="게임 시트">
      <div className="sheet-nav-icons" aria-hidden="true">
        ‹ &nbsp; ›
      </div>
      <button
        className={activeView === "home" ? "is-active" : undefined}
        type="button"
        onClick={() => openGame("home")}
      >
        Game Select
      </button>
      {gameCatalog.map((game) => (
        <button
          className={activeView === game.id ? "is-active" : undefined}
          key={game.id}
          type="button"
          onClick={() => openGame(game.id)}
        >
          {game.sheetName}
        </button>
      ))}
    </nav>
  );
}
