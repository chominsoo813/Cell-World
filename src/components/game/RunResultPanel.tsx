"use client";

import type { GameId } from "@/lib/gameCatalog";
import { getNextKeeperLevel } from "@/game/keeperLevels";
import { useGameStore } from "@/stores/gameStore";

interface RunResultPanelProps {
  gameId: Exclude<GameId, "rpg">;
}

export function RunResultPanel({ gameId }: RunResultPanelProps) {
  const keeperDocuments = useGameStore((state) => state.keeperDocuments);
  const keeperLevel = useGameStore((state) => state.keeperLevel);
  const keeperStatus = useGameStore((state) => state.keeperStatus);
  const defenceKills = useGameStore((state) => state.defenceKills);
  const defenceStatus = useGameStore((state) => state.defenceStatus);
  const resetGame = useGameStore((state) => state.resetGame);
  const selectKeeperLevel = useGameStore(
    (state) => state.selectKeeperLevel,
  );
  const status = gameId === "keeper" ? keeperStatus : defenceStatus;

  if (status !== "won" && status !== "lost") {
    return null;
  }

  const won = status === "won";
  const nextKeeperLevel =
    gameId === "keeper" && won ? getNextKeeperLevel(keeperLevel) : null;

  return (
    <section className={`run-result is-${status}`} aria-label="게임 결과">
      <span>{won ? "MISSION COMPLETE" : "RUN TERMINATED"}</span>
      <h2>{won ? "시트 저장 완료" : "수식 오류 발생"}</h2>
      <p>
        {gameId === "keeper"
          ? `LEVEL ${keeperLevel} · 회수한 업무 파일 ${keeperDocuments}/3`
          : `처치한 사무실 몬스터 ${defenceKills}마리`}
      </p>
      <div className="run-result-actions">
        <button type="button" onClick={() => resetGame(gameId)}>
          다시 실행
        </button>
        {nextKeeperLevel && (
          <button
            type="button"
            onClick={() => selectKeeperLevel(nextKeeperLevel)}
          >
            다음 레벨
          </button>
        )}
      </div>
    </section>
  );
}
