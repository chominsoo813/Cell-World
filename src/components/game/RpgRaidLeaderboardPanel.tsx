"use client";

import { useEffect, useMemo, useState } from "react";
import { formatRpgRaidDuration, RPG_RAID_LEADERBOARD_EVENT } from "@/lib/rpgRaid";
import { useGameStore } from "@/stores/gameStore";

export function RpgRaidLeaderboardPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const characters = useGameStore((state) => state.rpgCharacters);
  const ranking = useMemo(
    () => characters
      .filter((character) => character.rpgRaidBestTimeMs !== null)
      .sort((a, b) => (a.rpgRaidBestTimeMs ?? Infinity) - (b.rpgRaidBestTimeMs ?? Infinity))
      .slice(0, 10),
    [characters],
  );

  useEffect(() => {
    const openLeaderboard = () => setIsOpen(true);
    window.addEventListener(RPG_RAID_LEADERBOARD_EVENT, openLeaderboard);
    return () => window.removeEventListener(RPG_RAID_LEADERBOARD_EVENT, openLeaderboard);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="rpg-modal-layer rpg-raid-leaderboard-layer">
      <section aria-label="Raid ranking" aria-modal="true" className="rpg-raid-leaderboard-panel" role="dialog">
        <button aria-label="Close raid ranking" className="rpg-raid-leaderboard-close" onClick={() => setIsOpen(false)} type="button">×</button>
        <header>
          <small>SUMMONING ALTAR / RECORDS</small>
          <h2>레이드 현황판</h2>
          <p>망각의 셀 타이탄 제로스 · 캐릭터별 최단 처치 기록</p>
        </header>
        <div className="rpg-raid-leaderboard-body">
          <div className="rpg-raid-leaderboard-record">
            <span>BEST CLEAR TIME</span>
            <strong>{ranking[0]?.rpgRaidBestTimeMs ? formatRpgRaidDuration(ranking[0].rpgRaidBestTimeMs) : "--:--.--"}</strong>
            <em>{ranking[0]?.name ?? "기록 없음"}</em>
          </div>
          <ol>
            {ranking.length > 0 ? ranking.map((character, index) => (
              <li key={character.id}>
                <b>{index + 1}</b>
                <span>{character.name}</span>
                <strong>{formatRpgRaidDuration(character.rpgRaidBestTimeMs ?? 0)}</strong>
              </li>
            )) : <li className="is-empty">아직 기록된 레이드 처치 시간이 없습니다.</li>}
          </ol>
        </div>
        <footer>소환의 제단에서 레이드에 도전해 첫 기록을 남겨보세요.</footer>
      </section>
    </div>
  );
}
