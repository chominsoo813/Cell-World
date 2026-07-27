"use client";

import { useGameStore } from "@/stores/gameStore";

export function RpgDeathPanel() {
  const resetGame = useGameStore((state) => state.resetGame);
  const restartRpgRun = useGameStore((state) => state.restartRpgRun);
  const rpgStatus = useGameStore((state) => state.rpgStatus);

  if (rpgStatus !== "lost") {
    return null;
  }

  return (
    <section
      className="run-result is-lost"
      aria-label="RPG 게임 오버"
      role="dialog"
      aria-modal="true"
    >
      <span>RUN TERMINATED</span>
      <h2>HP가 0이 되었습니다</h2>
      <p>
        이어서 시작하면 퀘스트, 골드와 장비를 유지합니다. 시트를
        재시작하면 RPG 진행도를 모두 초기화합니다.
      </p>
      <div className="rpg-death-actions">
        <button type="button" onClick={restartRpgRun}>
          진행도 유지하고 다시 시작
        </button>
        <button type="button" onClick={() => resetGame("rpg")}>
          RESTART SHEET
        </button>
      </div>
    </section>
  );
}
