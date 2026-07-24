"use client";

import { SpreadsheetShell } from "@/components/SpreadsheetShell";
import { useGameStore } from "@/stores/gameStore";

export function CellWorldApp() {
  const activeView = useGameStore((state) => state.activeView);

  return (
    <main className="app-frame">
      <SpreadsheetShell activeView={activeView} />
    </main>
  );
}
