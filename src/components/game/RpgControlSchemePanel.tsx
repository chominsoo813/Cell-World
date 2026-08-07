"use client";

import { useEffect, useRef } from "react";
import type { RpgControlScheme } from "@/lib/rpgCharacters";
import { useGameStore } from "@/stores/gameStore";

const CONTROL_SCHEMES: readonly {
  description: string;
  id: RpgControlScheme;
  keys: readonly string[];
  title: string;
}[] = [
  {
    description: "방향키로 이동하고 A와 D로 전투합니다. 기존 조작을 그대로 사용합니다.",
    id: "keyboard",
    keys: ["방향키 이동", "A 기본 공격", "D 직업 스킬", "Shift 대시"],
    title: "키보드",
  },
  {
    description:
      "WASD로 이동하고 마우스로 자유롭게 조준합니다. 우클릭을 길게 눌러 차징 스킬도 사용할 수 있습니다.",
    id: "keyboard_mouse",
    keys: ["WASD 이동", "좌클릭 기본 공격", "우클릭 직업 스킬", "Shift 대시"],
    title: "키보드 + 마우스",
  },
];

export function RpgControlSchemePanel() {
  const closeRpgControlScheme = useGameStore(
    (state) => state.closeRpgControlScheme,
  );
  const rpgControlScheme = useGameStore((state) => state.rpgControlScheme);
  const isOpen = useGameStore((state) => state.rpgControlSchemeOpen);
  const setRpgControlScheme = useGameStore(
    (state) => state.setRpgControlScheme,
  );
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusFrame = requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLButtonElement>(
        `[data-control-scheme="${rpgControlScheme}"]`,
      )?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRpgControlScheme();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeRpgControlScheme, isOpen, rpgControlScheme]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="rpg-modal-layer rpg-control-scheme-layer">
      <section
        aria-describedby="rpg-control-scheme-description"
        aria-labelledby="rpg-control-scheme-title"
        aria-modal="true"
        className="rpg-control-scheme-panel"
        ref={panelRef}
        role="dialog"
      >
        <header>
          <small>PIXEL DOT LAND / CONTROL SETUP</small>
          <h2 id="rpg-control-scheme-title">조작방식을 선택하세요</h2>
          <p id="rpg-control-scheme-description">
            선택값은 이 캐릭터에 저장되며, 게임 중에도 안내 패널에서 바꿀 수 있습니다.
          </p>
        </header>

        <div className="rpg-control-scheme-options" role="radiogroup">
          {CONTROL_SCHEMES.map((scheme) => {
            const selected = scheme.id === rpgControlScheme;
            return (
              <button
                aria-checked={selected}
                className={selected ? "is-selected" : undefined}
                data-control-scheme={scheme.id}
                key={scheme.id}
                onClick={() => setRpgControlScheme(scheme.id)}
                role="radio"
                type="button"
              >
                <span className="rpg-control-scheme-radio" aria-hidden="true" />
                <span>
                  <strong>{scheme.title}</strong>
                  <p>{scheme.description}</p>
                  <ul>
                    {scheme.keys.map((key) => (
                      <li key={key}>{key}</li>
                    ))}
                  </ul>
                </span>
              </button>
            );
          })}
        </div>

        <footer>
          <span>
            {rpgControlScheme === "keyboard_mouse"
              ? "마우스 방향으로 조준합니다. 우클릭 메뉴는 게임 화면에서 열리지 않습니다."
              : "기존 키보드 조작을 사용합니다."}
          </span>
          <button onClick={closeRpgControlScheme} type="button">
            저장하고 게임 시작
          </button>
        </footer>
      </section>
    </div>
  );
}
