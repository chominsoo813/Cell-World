"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GameHud } from "@/components/GameHud";
import { GameStage } from "@/components/GameStage";
import type { ActiveView } from "@/stores/gameStore";

const OFFICE_REF_WORLD_ASPECT = 2080 / 936;

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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [gridPadding, setGridPadding] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const workspace = workspaceRef.current;
    const stage = workspace?.querySelector<HTMLElement>(".game-stage");
    if (!stage || activeView !== "keeper") {
      setGridPadding({ x: 0, y: 0 });
      return;
    }

    const alignHeadings = () => {
      const { width, height } = stage.getBoundingClientRect();
      const stageAspect = width / height;
      if (stageAspect > OFFICE_REF_WORLD_ASPECT) {
        setGridPadding({
          x: Math.max(0, (width - height * OFFICE_REF_WORLD_ASPECT) / 2),
          y: 0,
        });
      } else {
        setGridPadding({
          x: 0,
          y: Math.max(0, (height - width / OFFICE_REF_WORLD_ASPECT) / 2),
        });
      }
    };

    alignHeadings();
    const observer = new ResizeObserver(alignHeadings);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [activeView]);

  const workspaceStyle = {
    "--sheet-grid-pad-x": `${gridPadding.x}px`,
    "--sheet-grid-pad-y": `${gridPadding.y}px`,
  } as CSSProperties;

  return (
    <div className="sheet-workspace" ref={workspaceRef} style={workspaceStyle}>
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
