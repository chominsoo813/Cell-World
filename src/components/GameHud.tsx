"use client";

import {
  useGameStore,
  type ActiveView,
  type RpgQuestStage,
} from "@/stores/gameStore";

interface GameHudProps {
  activeView: ActiveView;
}

const questOrder: RpgQuestStage[] = [
  "meet_elder",
  "collect_relic",
  "defeat_slimes",
  "return_elder",
  "complete",
];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function GameHud({ activeView }: GameHudProps) {
  const experience = useGameStore((state) => state.experience);
  const hp = useGameStore((state) => state.hp);
  const level = useGameStore((state) => state.level);
  const maxHp = useGameStore((state) => state.maxHp);
  const resetGame = useGameStore((state) => state.resetGame);
  const rpgGold = useGameStore((state) => state.rpgGold);
  const rpgQuestStage = useGameStore((state) => state.rpgQuestStage);
  const rpgRelicCollected = useGameStore((state) => state.rpgRelicCollected);
  const rpgSlimesDefeated = useGameStore((state) => state.rpgSlimesDefeated);

  const keeperAlerts = useGameStore((state) => state.keeperAlerts);
  const keeperCollectedDocuments = useGameStore(
    (state) => state.keeperCollectedDocuments,
  );
  const keeperDocuments = useGameStore((state) => state.keeperDocuments);
  const keeperStatus = useGameStore((state) => state.keeperStatus);
  const keeperTimeRemaining = useGameStore(
    (state) => state.keeperTimeRemaining,
  );

  const defenceAttackDelay = useGameStore(
    (state) => state.defenceAttackDelay,
  );
  const defenceBossHp = useGameStore((state) => state.defenceBossHp);
  const defenceDamage = useGameStore((state) => state.defenceDamage);
  const defenceExperience = useGameStore((state) => state.defenceExperience);
  const defenceHp = useGameStore((state) => state.defenceHp);
  const defenceKills = useGameStore((state) => state.defenceKills);
  const defenceLevel = useGameStore((state) => state.defenceLevel);
  const defenceMaxHp = useGameStore((state) => state.defenceMaxHp);
  const defenceStatus = useGameStore((state) => state.defenceStatus);
  const defenceTimeSurvived = useGameStore(
    (state) => state.defenceTimeSurvived,
  );

  if (activeView === "home") {
    return (
      <aside className="game-hud game-hud--home">
        <HudPanel title="WORKBOOK">
          <p className="hud-big-label">CELL WORLD</p>
          <p className="hud-muted">3 playable sheets discovered</p>
        </HudPanel>
        <HudPanel title="BUILD STATUS">
          <ProgressRow label="Foundation" value={100} />
          <ProgressRow label="RPG Core" value={82} />
          <ProgressRow label="AI Layer" value={55} />
        </HudPanel>
        <HudPanel title="MVP TARGET">
          <p className="hud-day">DAY 16</p>
          <p className="hud-muted">Playable web prototype</p>
        </HudPanel>
      </aside>
    );
  }

  if (activeView === "keeper") {
    return (
      <aside className="game-hud">
        <HudPanel title={`TIME ${formatTime(keeperTimeRemaining)}`}>
          <div className="keeper-clock-row">
            <span className="keeper-clock-icon" aria-hidden="true" />
            <p className="hud-big-label">
              {keeperStatus === "playing" ? "ESCAPE" : keeperStatus.toUpperCase()}
            </p>
          </div>
          <ProgressRow
            label="TIME LEFT"
            value={Math.round((keeperTimeRemaining / 90) * 100)}
          />
        </HudPanel>
        <HudPanel title={`TASK ${keeperDocuments}/3`}>
          <ul className="quest-list">
            <KeeperTaskItem
              done={keeperCollectedDocuments.includes("report")}
              kind="report"
              label="REPORT.XLSX"
            />
            <KeeperTaskItem
              done={keeperCollectedDocuments.includes("budget")}
              kind="budget"
              label="BUDGET.XLSX"
            />
            <KeeperTaskItem
              done={keeperCollectedDocuments.includes("idList")}
              kind="id-list"
              label="ID_LIST.XLSX"
            />
          </ul>
        </HudPanel>
        <HudPanel title="SECURITY">
          <div className="keeper-security-row">
            <span className="keeper-guard-icon" aria-hidden="true" />
            <div>
              <p className="hud-day">{keeperAlerts} ALERTS</p>
              <p className="hud-muted">경비 시야에 걸리면 시간 -10초</p>
            </div>
          </div>
        </HudPanel>
        <HudPanel title="CONTROLS">
          <p className="hud-controls">WASD / ARROW KEYS</p>
          <p className="hud-muted">파일을 모두 회수한 뒤 EXIT로 이동</p>
          <ResetButton onReset={() => resetGame("keeper")} />
        </HudPanel>
      </aside>
    );
  }

  if (activeView === "defence") {
    return (
      <aside className="game-hud game-hud--defence">
        <HudPanel title={`TIME ${formatTime(defenceTimeSurvived)}`}>
          <div className="defence-profile">
            <span className="defence-player-avatar" aria-hidden="true" />
            <div>
              <p className="hud-big-label">
                {defenceStatus === "playing"
                  ? "SURVIVE"
                  : defenceStatus.toUpperCase()}
              </p>
              <p className="hud-muted">AUTO ATTACK ONLINE</p>
            </div>
          </div>
          <ProgressRow
            label={`HP ${defenceHp}/${defenceMaxHp}`}
            value={Math.round((defenceHp / defenceMaxHp) * 100)}
          />
        </HudPanel>
        <HudPanel title={`LEVEL ${defenceLevel}`}>
          <div className="defence-exp-row">
            <span className="defence-xp-icon" aria-hidden="true" />
            <div>
              <ProgressRow label="EXP" value={defenceExperience} />
              <p className="hud-muted">
                처치 {defenceKills}/12 · 이후 BOSS 출현
              </p>
            </div>
          </div>
        </HudPanel>
        <HudPanel title="UPGRADE">
          <ul className="defence-build-list">
            <DefenceBuildItem
              icon="damage"
              label="PAPERCLIP"
              value={`DMG ${defenceDamage} · x${Math.min(
                5,
                1 + Math.floor((defenceLevel - 1) / 2),
              )}${defenceLevel >= 6 ? " · PIERCE" : ""}`}
            />
            <DefenceBuildItem
              icon="speed"
              label="STAPLER"
              value={`${defenceAttackDelay}ms`}
            />
            <DefenceBuildItem
              icon="health"
              label="HEALTH UP"
              value={`${defenceMaxHp} MAX HP`}
            />
          </ul>
        </HudPanel>
        {defenceBossHp > 0 && (
          <HudPanel title="BOSS">
            <div className="defence-boss-row">
              <span className="defence-boss-icon" aria-hidden="true" />
              <div>
                <ProgressRow
                  label={`${defenceBossHp}/42`}
                  value={Math.round((defenceBossHp / 42) * 100)}
                />
                <p className="hud-muted">RED CABINET · EXECUTIVE CLASS</p>
              </div>
            </div>
          </HudPanel>
        )}
        <HudPanel title="CONTROLS">
          <p className="hud-controls">MOVE ONLY · AUTO ATTACK</p>
          <p className="hud-muted">WASD / 방향키 · 보석을 모아 레벨업</p>
          <ResetButton onReset={() => resetGame("defence")} />
        </HudPanel>
      </aside>
    );
  }

  const healthPercent = Math.round((hp / maxHp) * 100);
  const currentQuestIndex = questOrder.indexOf(rpgQuestStage);

  return (
    <aside className="game-hud">
      <HudPanel title={`HP ${hp}/${maxHp}`}>
        <div className="character-card">
          <span className="avatar" aria-hidden="true" />
          <div>
            <strong className="player-name">CELL RUNNER</strong>
            <span className="hud-gold">
              <i aria-hidden="true" />
              {rpgGold}G
            </span>
            <div className="segmented-meter" aria-label={`체력 ${healthPercent}%`}>
              {Array.from({ length: 6 }, (_, index) => (
                <span
                  className={
                    index < Math.ceil(healthPercent / 16.7) ? "filled" : ""
                  }
                  key={`hp-${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </HudPanel>
      <HudPanel title="QUEST 01">
        <ul className="quest-list">
          <QuestItem
            currentIndex={currentQuestIndex}
            index={0}
            label="장로 노라와 대화"
          />
          <QuestItem
            currentIndex={currentQuestIndex}
            index={1}
            label={`수식 코어 회수 ${rpgRelicCollected ? "1/1" : "0/1"}`}
          />
          <QuestItem
            currentIndex={currentQuestIndex}
            index={2}
            label={`균열 슬라임 ${rpgSlimesDefeated}/3`}
          />
          <QuestItem
            currentIndex={currentQuestIndex}
            index={3}
            label="장로에게 돌아가기"
          />
        </ul>
      </HudPanel>
      <HudPanel title={`LEVEL ${level}`}>
        <ProgressRow label="EXP" value={experience} />
        <p className="hud-muted">공격 SPACE · 상호작용 E</p>
      </HudPanel>
      <HudPanel title="AI GUIDE">
        <p className="ai-message">
          장로 옆에서 E를 누르면 진행 상황을 이해하는 AI 대화를 시작합니다.
        </p>
        <span className="ai-status">FALLBACK ENABLED · READY</span>
        <ResetButton onReset={() => resetGame("rpg")} />
      </HudPanel>
    </aside>
  );
}

function DefenceBuildItem({
  icon,
  label,
  value,
}: {
  icon: "damage" | "speed" | "health";
  label: string;
  value: string;
}) {
  return (
    <li>
      <span
        className={`defence-build-icon defence-build-icon--${icon}`}
        aria-hidden="true"
      />
      <div>
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </li>
  );
}

interface HudPanelProps {
  children: React.ReactNode;
  title: string;
}

function HudPanel({ children, title }: HudPanelProps) {
  return (
    <section className="hud-panel">
      <h2>{title}</h2>
      <div className="hud-panel-body">{children}</div>
    </section>
  );
}

interface ProgressRowProps {
  label: string;
  value: number;
}

function ProgressRow({ label, value }: ProgressRowProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="progress-row">
      <div>
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <progress
        className="progress-track"
        aria-label={`${label} ${safeValue}%`}
        max={100}
        value={safeValue}
      />
    </div>
  );
}

interface QuestItemProps {
  currentIndex: number;
  index: number;
  label: string;
}

function QuestItem({ currentIndex, index, label }: QuestItemProps) {
  const isDone = currentIndex > index || currentIndex === questOrder.length - 1;
  const iconState = isDone
    ? "done"
    : currentIndex === index
      ? "current"
      : "pending";

  return (
    <li className={isDone ? "is-done" : undefined}>
      <span
        className={`quest-pixel-icon quest-pixel-icon--${iconState}`}
        aria-hidden="true"
      />
      {label}
    </li>
  );
}

interface KeeperTaskItemProps {
  done: boolean;
  kind: "budget" | "id-list" | "report";
  label: string;
}

function KeeperTaskItem({ done, kind, label }: KeeperTaskItemProps) {
  return (
    <li className={done ? "is-done" : undefined}>
      <span
        className={`keeper-task-icon keeper-task-icon--${kind}${done ? " is-done" : ""}`}
        aria-hidden="true"
      />
      {label}
    </li>
  );
}

interface ResetButtonProps {
  onReset: () => void;
}

function ResetButton({ onReset }: ResetButtonProps) {
  return (
    <button className="hud-reset-button" type="button" onClick={onReset}>
      RESTART SHEET
    </button>
  );
}
