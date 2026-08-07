"use client";

import { useEffect, useState } from "react";
import {
  formatRpgRaidDuration,
  RPG_RAID_COMMAND_EVENT,
  RPG_RAID_STATE_EVENT,
  type RpgRaidCommandDetail,
  type RpgRaidStateDetail,
} from "@/lib/rpgRaid";

const INITIAL_STATE: RpgRaidStateDetail = {
  active: false,
  bossName: "망각의 셀 타이탄 제로스",
  defeated: false,
};

export function RpgRaidControls() {
  const [raidState, setRaidState] = useState(INITIAL_STATE);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const handleRaidState = (event: Event) => {
      const detail = (event as CustomEvent<RpgRaidStateDetail>).detail;
      if (detail) {
        setRaidState(detail);
      }
    };

    window.addEventListener(RPG_RAID_STATE_EVENT, handleRaidState);
    return () => {
      window.removeEventListener(RPG_RAID_STATE_EVENT, handleRaidState);
    };
  }, []);

  useEffect(() => {
    if (!raidState.active || raidState.defeated || !raidState.startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(timer);
  }, [raidState.active, raidState.defeated, raidState.startedAt]);

  if (!raidState.active) {
    return null;
  }

  const leaveRaid = () => {
    window.dispatchEvent(
      new CustomEvent<RpgRaidCommandDetail>(RPG_RAID_COMMAND_EVENT, {
        detail: { action: "leave" },
      }),
    );
  };

  return (
    <aside
      aria-label="레이드 전투 메뉴"
      className={`rpg-raid-controls${raidState.defeated ? " is-cleared" : ""}`}
    >
      <div>
        <span>{raidState.defeated ? "RAID CLEAR" : "RAID IN PROGRESS"}</span>
        <strong>{raidState.bossName}</strong>
        {raidState.startedAt && (
          <em>{formatRpgRaidDuration(Math.max(0, now - raidState.startedAt))}</em>
        )}
      </div>
      <button type="button" onClick={leaveRaid}>
        {raidState.defeated ? "레이드 종료" : "포기하고 나가기"}
      </button>
    </aside>
  );
}
