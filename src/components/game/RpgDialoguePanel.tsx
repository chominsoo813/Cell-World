"use client";

import { useEffect } from "react";
import { RpgSpritePortrait } from "@/components/game/RpgSpritePortrait";
import { useGameStore } from "@/stores/gameStore";

export function RpgDialoguePanel() {
  const closeDialogue = useGameStore((state) => state.closeRpgDialogue);
  const dialogue = useGameStore((state) => state.rpgDialogue);

  useEffect(() => {
    if (!dialogue) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key.toLowerCase() === "e") {
        closeDialogue();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialogue, dialogue]);

  if (!dialogue) {
    return null;
  }

  return (
    <section
      aria-labelledby="rpg-dialogue-title"
      aria-modal="true"
      className="rpg-dialogue-panel"
      role="dialog"
    >
      <header>
        <div>
          <RpgSpritePortrait
            className="rpg-dialogue-avatar"
            portrait={dialogue.portrait}
          />
          <div>
            <small>WORLD NPC / INTERACTION</small>
            <h2 id="rpg-dialogue-title">{dialogue.name}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={closeDialogue}
          aria-label="대화창 닫기"
        >
          ×
        </button>
      </header>
      <p>{dialogue.text}</p>
      <footer>
        <span>E 또는 ESC로 닫기</span>
        <button type="button" onClick={closeDialogue}>
          대화 닫기
        </button>
      </footer>
    </section>
  );
}
