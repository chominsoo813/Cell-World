"use client";

import type { GameId } from "@/lib/gameCatalog";
import { useGameStore } from "@/stores/gameStore";

interface RunResultPanelProps {
  gameId: Exclude<GameId, "rpg">;
}

export function RunResultPanel({ gameId }: RunResultPanelProps) {
  const keeperDocuments = useGameStore((state) => state.keeperDocuments);
  const keeperStatus = useGameStore((state) => state.keeperStatus);
  const defenceKills = useGameStore((state) => state.defenceKills);
  const defenceStatus = useGameStore((state) => state.defenceStatus);
  const resetGame = useGameStore((state) => state.resetGame);
  const status = gameId === "keeper" ? keeperStatus : defenceStatus;

  if (status !== "won" && status !== "lost") {
    return null;
  }

  const won = status === "won";

  return (
    <section className={`run-result is-${status}`} aria-label="게임 결과">
      <span>{won ? "MISSION COMPLETE" : "RUN TERMINATED"}</span>
      <h2>{won ? "시트 저장 완료" : "수식 오류 발생"}</h2>
      <p>
        {gameId === "keeper"
          ? `회수한 업무 파일 ${keeperDocuments}/3`
          : `처치한 사무실 몬스터 ${defenceKills}마리`}
      </p>
      <button type="button" onClick={() => resetGame(gameId)}>
        다시 실행
      </button>
    </section>
  );
}
