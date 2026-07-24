"use client";

import { GameHud } from "@/components/GameHud";
import { GameStage } from "@/components/GameStage";
import type { ActiveView } from "@/stores/gameStore";

const columns = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

const rows = Array.from({ length: 18 }, (_, index) => index + 1);

interface GameViewportProps {
  activeView: ActiveView;
}

export function GameViewport({ activeView }: GameViewportProps) {
  return (
    <div className="sheet-workspace">
      <div className="sheet-corner" aria-hidden="true" />
      <div className="column-headings" aria-hidden="true">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="hud-heading" aria-hidden="true">
        AA
      </div>
      <div className="row-headings" aria-hidden="true">
        {rows.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </div>
      <GameStage activeView={activeView} />
      <GameHud activeView={activeView} />
    </div>
  );
}
