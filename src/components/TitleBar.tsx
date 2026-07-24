import { getGameById } from "@/lib/gameCatalog";
import type { ActiveView } from "@/stores/gameStore";

interface TitleBarProps {
  activeView: ActiveView;
}

export function TitleBar({ activeView }: TitleBarProps) {
  const title =
    activeView === "home"
      ? "CELL WORLD"
      : `${getGameById(activeView).order} ${getGameById(activeView).title}`;

  return (
    <header className="title-bar">
      <div className="quick-actions" aria-label="빠른 실행">
        <span className="app-mark" aria-hidden="true">
          C
        </span>
        <button type="button" aria-label="저장">
          ◫
        </button>
        <button type="button" aria-label="실행 취소">
          ↶
        </button>
        <button type="button" aria-label="다시 실행">
          ↷
        </button>
      </div>
      <p>{title.toUpperCase()}</p>
      <div className="window-actions" aria-hidden="true">
        <span>—</span>
        <span>□</span>
        <span>×</span>
      </div>
    </header>
  );
}
