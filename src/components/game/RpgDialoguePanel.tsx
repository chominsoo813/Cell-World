"use client";

import { useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";

const portraitUrls: Record<string, string> = {
  "rpg-chest": "/assets/pixel-art/rpg/chest.png",
  "rpg-house": "/assets/pixel-art/rpg/house.png",
  "rpg-knight": "/assets/pixel-art/rpg/knight_front.png",
  "rpg-market": "/assets/pixel-art/rpg/market.png",
  "rpg-merchant": "/assets/pixel-art/rpg/merchant_front.png",
  "rpg-potion": "/assets/pixel-art/rpg/potion.png",
  "rpg-questRelic": "/assets/pixel-art/rpg/quest_relic.png",
  "rpg-ruins": "/assets/pixel-art/rpg/ruins.png",
  "rpg-sign": "/assets/pixel-art/rpg/sign.png",
  "rpg-villager": "/assets/pixel-art/rpg/villager_front.png",
};

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

  const portraitUrl =
    portraitUrls[dialogue.portrait ?? ""] ??
    "/assets/pixel-art/rpg/villager_front.png";

  return (
    <section className="rpg-dialogue-panel" aria-label={`${dialogue.name} 대화`}>
      <header>
        <div>
          <span
            className="rpg-dialogue-avatar"
            style={{ backgroundImage: `url("${portraitUrl}")` }}
            aria-hidden="true"
          />
          <div>
            <small>WORLD NPC / INTERACTION</small>
            <h2>{dialogue.name}</h2>
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
