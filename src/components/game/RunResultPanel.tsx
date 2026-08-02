"use client";

import { getOfficeSheet } from "@/game/officeRefSheets";
import type { GameId } from "@/lib/gameCatalog";
import { useGameStore } from "@/stores/gameStore";

interface RunResultPanelProps {
  gameId: Exclude<GameId, "rpg">;
}

export function RunResultPanel({ gameId }: RunResultPanelProps) {
  const keeperStatus = useGameStore((state) => state.keeperStatus);
  const keeperLevel = useGameStore((state) => state.keeperLevel);
  const keeperSheet = useGameStore((state) => state.keeperSheet);
  const keeperAlerts = useGameStore((state) => state.keeperAlerts);
  const keeperCompletedSessions = useGameStore((state) => state.keeperCompletedSessions);
  const defenceKills = useGameStore((state) => state.defenceKills);
  const defenceStatus = useGameStore((state) => state.defenceStatus);
  const resetGame = useGameStore((state) => state.resetGame);
  const selectKeeperLevel = useGameStore((state) => state.selectKeeperLevel);
  const selectKeeperSheet = useGameStore((state) => state.selectKeeperSheet);
  const status = gameId === "keeper" ? keeperStatus : defenceStatus;

  if (status !== "won" && status !== "lost") return null;

  const won = status === "won";
  const officeSheet = getOfficeSheet(keeperLevel, keeperSheet);
  const isSessionClose = gameId === "keeper" && won && keeperLevel === 1 && keeperSheet === 5;

  if (isSessionClose) {
    const sessionStored = keeperCompletedSessions.includes(keeperLevel);
    const nextSession = keeperLevel < 6 ? keeperLevel + 1 : null;
    const startNextSession = () => {
      if (!nextSession) return;
      selectKeeperLevel(nextSession as 1 | 2 | 3 | 4 | 5 | 6);
      selectKeeperSheet(1);
    };

    return (
      <section className="run-result session-close is-won" aria-label={`Session ${keeperLevel} 결산`}>
        <header className="session-close__header">
          <span>SESSION_CLOSE.xlsx · AUTO SAVED</span>
          <h2>SESSION {keeperLevel} 결산 완료</h2>
          <p>수습 평가 결과가 PASS로 확정되었고 영구 보상이 저장되었습니다.</p>
        </header>

        <div className="session-close__grid">
          <article>
            <small>01 · RECORDS</small>
            <h3>이번 세션 기록</h3>
            <ul>
              <li><span>완료 시트</span><strong>5 / 5</strong></li>
              <li><span>FINAL SCORE</span><strong>75 PASS</strong></li>
              <li><span>FINAL 경보</span><strong>{keeperAlerts}</strong></li>
              <li><span>감사 도장</span><strong>SESSION 1</strong></li>
            </ul>
          </article>

          <article className="session-close__rewards">
            <small>02 · PERMANENT</small>
            <h3>영구 저장 보상</h3>
            <ul>
              <li><span>COPY / PASTE</span><strong>영구 해금</strong></li>
              <li><span>Session {nextSession ?? keeperLevel}</span><strong>{nextSession ? "개방" : "완료"}</strong></li>
              <li><span>STORY FILE</span><strong>교육자료_수정금지.xlsx</strong></li>
              <li><span>HIDDEN SHEET</span><strong>진행도 개방</strong></li>
            </ul>
          </article>

          <article className="session-close__expired">
            <small>03 · SESSION ONLY</small>
            <h3>종료되는 임시 상태</h3>
            <ul>
              <li><span>파일 PATCH</span><strong>Session 종료</strong></li>
              <li><span>CLIPBOARD</span><strong>초기화</strong></li>
              <li><span>CALC / HIDE</span><strong>기본값 복구</strong></li>
              <li><span>저장 상태</span><strong>{sessionStored ? "확정" : "동기화 중"}</strong></li>
            </ul>
          </article>
        </div>

        <div className="session-close__footer">
          <p>다음 근무일에는 새로운 함수와 규정이 적용됩니다.</p>
          <div className="run-result-actions">
            <button className="is-secondary" type="button" onClick={() => resetGame("keeper")}>
              FINAL 다시 보기
            </button>
            {nextSession ? (
              <button className="is-primary" type="button" onClick={startNextSession}>
                SESSION {nextSession} 시작
              </button>
            ) : (
              <button className="is-primary" type="button" onClick={() => resetGame("keeper")}>
                OFFICE INDEX로 돌아가기
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`run-result is-${status}`} aria-label="게임 결과">
      <span>{won ? "MISSION COMPLETE" : "RUN TERMINATED"}</span>
      <h2>{won ? "시트 통과 완료" : "수식 오류 발생"}</h2>
      <p>
        {gameId === "keeper"
          ? `SESSION ${keeperLevel} · ${keeperSheet === 5 ? "FINAL" : `SHEET ${keeperSheet}`} · ${officeSheet.workbook} 저장`
          : `처치한 사무실 몬스터 ${defenceKills}마리`}
      </p>
      <div className="run-result-actions">
        <button type="button" onClick={() => resetGame(gameId)}>
          다시 실행
        </button>
      </div>
    </section>
  );
}
