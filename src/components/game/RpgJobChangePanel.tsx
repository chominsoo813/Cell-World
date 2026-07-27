"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import {
  getRpgClass,
  getRpgJobChangeOptions,
} from "@/lib/rpgClasses";
import { useGameStore } from "@/stores/gameStore";

export function RpgJobChangePanel() {
  const chooseRpgClass = useGameStore((state) => state.chooseRpgClass);
  const level = useGameStore((state) => state.level);
  const rpgClassId = useGameStore((state) => state.rpgClassId);
  const options = getRpgJobChangeOptions(level, rpgClassId);

  if (options.length === 0) {
    return null;
  }

  const currentClass = getRpgClass(rpgClassId);
  const nextTier = currentClass.tier + 1;

  return (
    <section
      aria-labelledby="rpg-job-change-title"
      aria-modal="true"
      className="rpg-job-change-panel"
      role="dialog"
    >
      <header>
        <span>{nextTier === 1 ? "LEVEL 5" : "LEVEL 10"}</span>
        <h2 id="rpg-job-change-title">
          {nextTier === 1 ? "1차 전직" : "2차 전직"}을 선택하세요
        </h2>
        <p>
          현재 직업 <strong>{currentClass.name}</strong> · 선택한 직업은 즉시
          캐릭터 외형과 D 스킬에 적용됩니다.
        </p>
      </header>
      <div className="rpg-job-options">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => chooseRpgClass(option.id)}
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
      <footer>전직 선택 중에는 게임이 일시 정지됩니다.</footer>
    </section>
  );
}
