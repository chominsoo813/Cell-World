"use client";

import { FormulaBar } from "@/components/FormulaBar";
import { GameViewport } from "@/components/GameViewport";
import { Ribbon } from "@/components/Ribbon";
import { SheetTabs } from "@/components/SheetTabs";
import { StatusBar } from "@/components/StatusBar";
import { TitleBar } from "@/components/TitleBar";
import type { ActiveView } from "@/stores/gameStore";

interface SpreadsheetShellProps {
  activeView: ActiveView;
}

export function SpreadsheetShell({ activeView }: SpreadsheetShellProps) {
  return (
    <section className="spreadsheet-shell" aria-label="CELL WORLD spreadsheet">
      <TitleBar activeView={activeView} />
      <Ribbon />
      <FormulaBar />
      <GameViewport activeView={activeView} />
      <SheetTabs activeView={activeView} />
      <StatusBar />
    </section>
  );
}
