"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { NpcMemory } from "@/lib/npcChat";
import { useGameStore } from "@/stores/gameStore";

const questLabels = {
  meet_elder: "장로의 의뢰를 수락할 수 있습니다.",
  collect_relic: "동쪽 폐허에서 수식 코어를 찾으세요.",
  defeat_slimes: "균열 슬라임 3마리를 처치하세요.",
  return_elder: "장로에게 돌아가 보상을 받으세요.",
  complete: "첫 번째 수식이 복구되었습니다.",
} as const;

export function AiNpcPanel() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [message, setMessage] = useState("");
  const acceptRpgQuest = useGameStore((state) => state.acceptRpgQuest);
  const closeNpcDialogue = useGameStore((state) => state.closeNpcDialogue);
  const completeRpgQuest = useGameStore((state) => state.completeRpgQuest);
  const hp = useGameStore((state) => state.hp);
  const isLoading = useGameStore((state) => state.npcIsLoading);
  const isOpen = useGameStore((state) => state.npcDialogueOpen);
  const lastDialogue = useGameStore((state) => state.npcLastDialogue);
  const memory = useGameStore((state) => state.npcMemory);
  const questStage = useGameStore((state) => state.rpgQuestStage);
  const setNpcLoading = useGameStore((state) => state.setNpcLoading);
  const setNpcResponse = useGameStore((state) => state.setNpcResponse);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setNpcLoading(true);

    try {
      const response = await fetch("/api/npc/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcId: "elder_nora",
          message: trimmedMessage,
          gameState: {
            currentMap: "village_01",
            playerLevel: useGameStore.getState().level,
            hp,
            hasPotion: false,
            questStatus: questStage,
            memory,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          errorPayload?.message ??
            "통신 셀이 끊겼군. 잠시 후 다시 질문해 주세요.",
        );
      }

      const data = (await response.json()) as {
        dialogue?: string;
        memory?: NpcMemory;
      };
      setNpcResponse(
        data.dialogue ?? "셀 신호가 잠시 흐려졌군. 다시 질문해 주겠나?",
        data.memory,
      );
      setMessage("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setNpcResponse(
        error instanceof Error
          ? error.message
          : "통신 셀이 끊겼군. 그래도 기억하게—빛나는 수식 코어는 동쪽 폐허에 있네.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setNpcLoading(false);
      }
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <section className="npc-dialogue-panel" aria-label="AI NPC 대화">
      <header>
        <div>
          <span className="npc-avatar" aria-hidden="true" />
          <div>
            <small>AI NPC / ELDER</small>
            <h2>장로 노라</h2>
          </div>
        </div>
        <button type="button" onClick={closeNpcDialogue} aria-label="대화 닫기">
          ×
        </button>
      </header>
      <p className="npc-dialogue-copy">{lastDialogue}</p>
      <p className="npc-quest-note">{questLabels[questStage]}</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="npc-message">무엇이든 물어보세요</label>
        <div>
          <input
            id="npc-message"
            maxLength={400}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="예: 북쪽 숲에 가기 전에 뭘 준비해야 해?"
            value={message}
          />
          <button disabled={isLoading || !message.trim()} type="submit">
            {isLoading ? "THINKING…" : "ASK"}
          </button>
        </div>
      </form>
      <footer>
        {questStage === "meet_elder" && (
          <button type="button" onClick={acceptRpgQuest}>
            퀘스트 수락
          </button>
        )}
        {questStage === "return_elder" && (
          <button type="button" onClick={completeRpgQuest}>
            퀘스트 완료
          </button>
        )}
        <span>ESC 또는 ×로 닫기</span>
      </footer>
    </section>
  );
}
