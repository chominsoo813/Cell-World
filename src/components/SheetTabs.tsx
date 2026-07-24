"use client";

import { gameCatalog } from "@/lib/gameCatalog";
import { useGameStore, type ActiveView } from "@/stores/gameStore";

interface SheetTabsProps {
  activeView: ActiveView;
}

export function SheetTabs({ activeView }: SheetTabsProps) {
  const setActiveView = useGameStore((state) => state.setActiveView);

  return (
    <nav className="sheet-tabs" aria-label="게임 시트">
      <div className="sheet-nav-icons" aria-hidden="true">
        ‹ &nbsp; ›
      </div>
      <button
        className={activeView === "home" ? "is-active" : undefined}
        type="button"
        onClick={() => setActiveView("home")}
      >
        Game Select
      </button>
      {gameCatalog.map((game) => (
        <button
          className={activeView === game.id ? "is-active" : undefined}
          key={game.id}
          type="button"
          onClick={() => setActiveView(game.id)}
        >
          {game.sheetName}
        </button>
      ))}
      <button className="add-sheet" type="button" aria-label="새 시트">
        +
      </button>
    </nav>
  );
}
