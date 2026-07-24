"use client";

import { useGameStore } from "@/stores/gameStore";

export function FormulaBar() {
  const formulaText = useGameStore((state) => state.formulaText);
  const selectedCell = useGameStore((state) => state.selectedCell);

  return (
    <div className="formula-bar">
      <output aria-label="선택한 셀">{selectedCell}</output>
      <span className="formula-controls" aria-hidden="true">
        × &nbsp; ✓
      </span>
      <span className="fx" aria-hidden="true">
        ƒx
      </span>
      <output className="formula-output" aria-label="수식">
        {formulaText}
      </output>
    </div>
  );
}
