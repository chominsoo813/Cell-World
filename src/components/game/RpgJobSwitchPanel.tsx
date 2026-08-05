"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import {
  getRpgClass,
  getRpgSecondJobSwitchOptions,
} from "@/lib/rpgClasses";
import { useGameStore } from "@/stores/gameStore";

const focusableSelector =
  'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

function focusGameCanvas() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".phaser-container")?.focus();
    });
  });
}

export function RpgJobSwitchPanel() {
  const closeJobSwitch = useGameStore((state) => state.closeRpgJobSwitch);
  const isOpen = useGameStore((state) => state.rpgJobSwitchOpen);
  const level = useGameStore((state) => state.level);
  const rpgClassId = useGameStore((state) => state.rpgClassId);
  const switchSecondJob = useGameStore(
    (state) => state.switchRpgSecondJob,
  );
  const panelRef = useRef<HTMLElement>(null);
  const currentClass = getRpgClass(rpgClassId);
  const branchClass =
    currentClass.tier === 2 &&
    currentClass.parentId &&
    currentClass.parentId !== "adventurer"
      ? getRpgClass(currentClass.parentId)
      : null;
  const options = getRpgSecondJobSwitchOptions(level, rpgClassId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    return () => focusGameCanvas();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusFrame = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>("[data-job-switch-option]")
        ?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const focusable = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ??
            [],
        );
        const first = focusable[0];
        const last = focusable.at(-1);

        if (first && last) {
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeJobSwitch();
        focusGameCanvas();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeJobSwitch, isOpen, rpgClassId]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="rpg-modal-layer rpg-job-switch-layer">
      <section
        aria-describedby="rpg-job-switch-description"
        aria-labelledby="rpg-job-switch-title"
        aria-modal="true"
        className="rpg-job-change-panel rpg-job-switch-panel"
        ref={panelRef}
        role="dialog"
      >
        <header>
          <div>
            <small>LEVEL 30 / CLASS SWITCH</small>
            <h2 id="rpg-job-switch-title">같은 직업군의 2차 직업 전환</h2>
            <p id="rpg-job-switch-description">
              전직 관리자 아론이 현재 직업과 같은 계열의 다른 2차 직업으로
              즉시 전환해 줍니다. 횟수 제한은 없습니다.
            </p>
          </div>
          <button
            aria-label="2차 직업 전환창 닫기"
            onClick={() => {
              closeJobSwitch();
              focusGameCanvas();
            }}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="rpg-job-switch-current" aria-live="polite">
          <span>CURRENT JOB</span>
          <strong>{currentClass.name}</strong>
          <small>{branchClass?.name ?? "2차 직업"} 계열</small>
        </div>

        <div className="rpg-job-options rpg-job-switch-options">
          {options.map((option) => (
            <button
              aria-label={`${option.name}로 직업 전환`}
              data-job-switch-option
              key={option.id}
              onClick={() => switchSecondJob(option.id)}
              style={{ "--job-accent": option.accent } as CSSProperties}
              type="button"
            >
              <span
                aria-hidden="true"
                className="rpg-job-character"
                style={{ backgroundImage: `url("${option.spriteFile}")` }}
              />
              <span className="rpg-job-copy">
                <small>{option.title}</small>
                <strong>{option.name}</strong>
                <span>{option.description}</span>
              </span>
              <span className="rpg-job-skill">
                <Image
                  alt=""
                  height={38}
                  src={option.iconFile}
                  unoptimized
                  width={38}
                />
                <span>
                  <small>D SKILL</small>
                  <strong>{option.skill.name}</strong>
                </span>
              </span>
            </button>
          ))}
        </div>

        <footer>ESC로 닫기 · 전환 즉시 캐릭터별 저장 기록에 반영됩니다.</footer>
      </section>
    </div>
  );
}
