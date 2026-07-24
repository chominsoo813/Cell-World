"use client";

import { gameCatalog } from "@/lib/gameCatalog";
import { useGameStore } from "@/stores/gameStore";

export function HomeScreen() {
  const setActiveView = useGameStore((state) => state.setActiveView);

  return (
    <div className="home-screen">
      <div className="home-ambient-grid" aria-hidden="true" />
      <header className="home-heading">
        <span className="eyebrow">CELL_WORLD.XLSX / SELECT_MODE</span>
        <h1>
          BREAK OUT OF
          <br />
          THE SPREADSHEET
        </h1>
        <p>
          익숙한 업무 화면 아래 숨겨진 세 개의 세계.
          <br />
          플레이할 시트를 선택하세요.
        </p>
      </header>

      <div className="game-card-grid">
        {gameCatalog.map((game) => (
          <article
            className={`game-card game-card--${game.id}`}
            key={game.id}
          >
            <div className="game-card-art" aria-hidden="true">
              <span className="art-grid" />
              <span className="pixel-prop pixel-prop--one" />
              <span className="pixel-prop pixel-prop--two" />
              <span className="pixel-player" />
            </div>
            <div className="game-card-copy">
              <span className="card-order">{game.order}</span>
              <div>
                <small>{game.label}</small>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
              </div>
            </div>
            <div className="game-card-footer">
              <span className={`build-status is-${game.status.toLowerCase()}`}>
                {game.status}
              </span>
              <button
                type="button"
                onClick={() => setActiveView(game.id)}
                aria-label={`${game.title} 선택`}
              >
                OPEN SHEET <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
