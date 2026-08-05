"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { RpgSpritePortrait } from "@/components/game/RpgSpritePortrait";
import { getRpgClass } from "@/lib/rpgClasses";
import { useGameStore } from "@/stores/gameStore";

const createMessages = {
  duplicate_name: "이미 사용 중인 이름입니다. 다른 이름을 입력해 주세요.",
  invalid_name: "캐릭터 이름은 공백을 제외하고 1~12자로 입력해 주세요.",
  limit_reached: "생성할 수 있는 캐릭터 수가 가득 찼습니다.",
} as const;

const focusableSelector =
  'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export function RpgCharacterSelectPanel() {
  const activeCharacterId = useGameStore(
    (state) => state.activeRpgCharacterId,
  );
  const characters = useGameStore((state) => state.rpgCharacters);
  const closeCharacterSelect = useGameStore(
    (state) => state.closeRpgCharacterSelect,
  );
  const createCharacter = useGameStore((state) => state.createRpgCharacter);
  const isOpen = useGameStore((state) => state.rpgCharacterSelectOpen);
  const selectCharacter = useGameStore((state) => state.selectRpgCharacter);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const canClose = Boolean(activeCharacterId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusFrame = requestAnimationFrame(() => {
      if (characters.length === 0) {
        inputRef.current?.focus();
        return;
      }
      panelRef.current
        ?.querySelector<HTMLButtonElement>("[data-character-play]")
        ?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const focusable = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
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
      if (event.key === "Escape" && canClose) {
        event.preventDefault();
        closeCharacterSelect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canClose, characters.length, closeCharacterSelect, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSelect = (characterId: string) => {
    if (!selectCharacter(characterId)) {
      setNotice("캐릭터 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createCharacter(name);

    if (result.status !== "created") {
      setNotice(createMessages[result.status]);
      return;
    }

    setName("");
    setNotice("캐릭터를 생성했습니다. 새로운 모험을 시작합니다.");
  };

  return (
    <div className="rpg-modal-layer rpg-character-select-layer">
      <section
        aria-describedby="rpg-character-select-description"
        aria-labelledby="rpg-character-select-title"
        aria-modal="true"
        className="rpg-character-select-panel"
        ref={panelRef}
        role="dialog"
      >
        <header>
          <div>
            <small>MERCENARY OFFICE / CHARACTER ARCHIVE</small>
            <h2 id="rpg-character-select-title">캐릭터 선택</h2>
            <p id="rpg-character-select-description">
              저장된 캐릭터를 이어서 플레이하거나 새 용병을 등록하세요.
              각 캐릭터의 유물과 성장 기록은 서로 공유되지 않습니다.
            </p>
          </div>
          {canClose && (
            <button
              aria-label="캐릭터 선택창 닫기"
              onClick={closeCharacterSelect}
              type="button"
            >
              ×
            </button>
          )}
        </header>

        <div className="rpg-character-select-content">
          <section aria-labelledby="rpg-saved-characters-title">
            <div className="rpg-character-section-heading">
              <h3 id="rpg-saved-characters-title">저장된 캐릭터</h3>
              <span>{characters.length}명</span>
            </div>
            {characters.length > 0 ? (
              <div className="rpg-character-card-grid">
                {characters.map((character) => {
                  const definition = getRpgClass(character.rpgClassId);
                  const isActive = character.id === activeCharacterId;

                  return (
                    <article
                      aria-current={isActive ? "true" : undefined}
                      className={isActive ? "is-active" : undefined}
                      key={character.id}
                      style={
                        { "--character-accent": definition.accent } as CSSProperties
                      }
                    >
                      <div className="rpg-character-card-visual">
                        <RpgSpritePortrait
                          className="rpg-character-card-sprite"
                          portrait={
                            character.rpgClassId === "adventurer"
                              ? "rpg-character-adventurer-front"
                              : `rpg-character-${character.rpgClassId}`
                          }
                        />
                        {isActive && <span>현재 플레이 중</span>}
                      </div>
                      <div className="rpg-character-card-copy">
                        <small>LV.{character.level} · {definition.title}</small>
                        <h4>{character.name}</h4>
                        <strong>{definition.name}</strong>
                        <dl>
                          <div>
                            <dt>GOLD</dt>
                            <dd>{character.rpgGold}G</dd>
                          </div>
                          <div>
                            <dt>RELIC</dt>
                            <dd>{character.rpgFoundRelics.length}종</dd>
                          </div>
                          <div>
                            <dt>WEAPON</dt>
                            <dd>+{character.rpgWeaponEnhancementLevel}</dd>
                          </div>
                        </dl>
                      </div>
                      <button
                        data-character-play
                        onClick={() => handleSelect(character.id)}
                        type="button"
                      >
                        {isActive ? "계속 플레이" : "이 캐릭터로 플레이"}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rpg-character-empty">
                저장된 캐릭터가 없습니다. 첫 용병을 등록해 주세요.
              </p>
            )}
          </section>

          <form className="rpg-character-create" onSubmit={handleCreate}>
            <small>NEW CHARACTER</small>
            <h3>새 용병 등록</h3>
            <RpgSpritePortrait
              className="rpg-character-create-sprite"
              portrait="rpg-character-adventurer-front"
            />
            <p>
              모든 용병은 모험가 Lv.1로 시작합니다. Lv.5가 되면 첫
              전직을 선택할 수 있습니다.
            </p>
            <label htmlFor="rpg-character-name">캐릭터 이름</label>
            <input
              aria-describedby="rpg-character-name-help rpg-character-create-notice"
              autoComplete="off"
              id="rpg-character-name"
              maxLength={12}
              onChange={(event) => {
                setName(event.target.value);
                setNotice("");
              }}
              placeholder="1~12자 이름"
              ref={inputRef}
              value={name}
            />
            <span id="rpg-character-name-help">
              캐릭터별로 유물, 골드, 장비와 성장 기록이 따로 저장됩니다.
            </span>
            <p
              aria-live="polite"
              className="rpg-character-create-notice"
              id="rpg-character-create-notice"
            >
              {notice}
            </p>
            <button disabled={!name.trim()} type="submit">
              용병 등록하고 시작
            </button>
          </form>
        </div>

        <footer>
          <span>이 브라우저에 자동 저장됩니다.</span>
          <span>{canClose ? "ESC로 닫기" : "캐릭터를 생성해야 시작할 수 있습니다."}</span>
        </footer>
      </section>
    </div>
  );
}
