"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";

interface GuideItem {
  description: string;
  label: string;
  meta?: string;
}

interface GuideSection {
  code: string;
  eyebrow: string;
  icon: string;
  intro: string;
  items: readonly GuideItem[];
  title: string;
}

const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    code: "FLOW",
    eyebrow: "01 · ADVENTURE LOOP",
    icon: "◎",
    title: "게임 진행 방식",
    intro:
      "마을에서 준비하고, 사냥터를 돌파하고, 얻은 보상으로 더 강해지는 액션 RPG입니다.",
    items: [
      {
        label: "첫 번째 목표",
        description:
          "마을 중앙의 장로 노라와 대화해 첫 퀘스트를 시작하세요. 화면 왼쪽 위 목표가 다음 행동을 알려줍니다.",
        meta: "장로 노라 · E 상호작용",
      },
      {
        label: "전투와 성장",
        description:
          "몬스터를 처치하면 경험치와 골드를 얻습니다. 레벨 5에는 1차 전직, 레벨 10에는 2차 전직을 선택할 수 있습니다.",
        meta: "EXP · GOLD · JOB",
      },
      {
        label: "파밍과 강화",
        description:
          "골드, 물약, 장비와 유물을 모으세요. 유물은 캐릭터마다 따로 보유하며 중복 획득 시 효과가 성장합니다.",
        meta: "RELIC · EQUIPMENT",
      },
      {
        label: "사냥터 공략",
        description:
          "각 사냥터는 1~10단계로 이어집니다. 일반 구역을 돌파해 10단계 보스를 쓰러뜨리는 것이 핵심 목표입니다.",
        meta: "STAGE 01 → BOSS 10",
      },
    ],
  },
  {
    code: "CONTROL",
    eyebrow: "02 · CONTROLS",
    icon: "⌨",
    title: "기본 조작법",
    intro:
      "이동 방향은 공격과 스킬의 발사 방향에도 사용됩니다. 대각선 입력도 그대로 반영됩니다.",
    items: [
      {
        label: "이동",
        description: "방향키로 상하좌우 및 대각선 방향으로 이동합니다.",
        meta: "↑ ↓ ← →",
      },
      {
        label: "기본 공격",
        description:
          "A 키로 현재 직업의 기본 공격을 사용합니다. 궁수와 마법사 계열은 원거리 공격을 사용합니다.",
        meta: "A",
      },
      {
        label: "직업 스킬",
        description:
          "D 키로 고유 스킬을 사용합니다. 장궁과 격투가는 D를 누른 채 방향을 바꾸고 놓아서 발동합니다.",
        meta: "D · HOLD / RELEASE",
      },
      {
        label: "대시와 상호작용",
        description:
          "왼쪽 Shift로 대시하고 E로 NPC·포탈·오브젝트와 상호작용합니다. Z는 전리품, Alt는 물약입니다.",
        meta: "L-SHIFT · E · Z · ALT",
      },
      {
        label: "가이드와 전체화면",
        description:
          "G 키를 누르면 게임 가이드를 언제든 다시 확인할 수 있습니다. H 키로 게임 화면을 전체화면으로 전환하고, H 또는 Esc 키로 종료할 수 있습니다.",
        meta: "G · GUIDE / H · FULLSCREEN",
      },
    ],
  },
  {
    code: "WORLD",
    eyebrow: "03 · WORLD MAP",
    icon: "◇",
    title: "맵 구성",
    intro:
      "마을은 안전한 거점이며, 마을 외곽과 하단의 포탈을 통해 세 개의 10단계 사냥터로 이동합니다.",
    items: [
      {
        label: "마을 광장",
        description:
          "퀘스트 수락, 캐릭터 변경, 전직, 장비 구매와 무기 강화를 담당하는 안전 지역입니다.",
        meta: "VILLAGE SQUARE",
      },
      {
        label: "수정 동굴",
        description:
          "슬라임과 고블린부터 해골 궁수와 암흑 마법사까지 등장하는 기본 던전입니다.",
        meta: "CAVE 01–10",
      },
      {
        label: "설원 던전",
        description:
          "빙결 계열 몬스터와 강력한 설원 보스가 기다리는 고난도 얼음 지역입니다.",
        meta: "SNOW 01–10",
      },
      {
        label: "늑대소굴",
        description:
          "마을 하부의 툰드라 사냥터입니다. 빠른 늑대 무리와 거대한 늑대인간이 추격해 옵니다.",
        meta: "WOLF DEN 01–10",
      },
    ],
  },
  {
    code: "ENEMY",
    eyebrow: "04 · MONSTERS & BOSSES",
    icon: "⚔",
    title: "몬스터와 보스",
    intro:
      "뒤 단계일수록 몬스터 조합과 공격력이 강해집니다. 보스의 큰 공격은 대시로 피한 뒤 빈틈을 노리세요.",
    items: [
      {
        label: "수정 동굴 몬스터",
        description:
          "슬라임, 고블린, 박쥐, 미믹, 좀비, 해골 전사·궁수와 암흑 마법사가 등장합니다.",
        meta: "BOSS · 고대 화염룡",
      },
      {
        label: "설원 몬스터",
        description:
          "서리 슬라임, 서리 고블린, 설원 늑대, 얼음 박쥐와 서리 오크가 등장합니다.",
        meta: "BOSS · 눈사태 거인 흐라움",
      },
      {
        label: "설원의 또 다른 위협",
        description:
          "백야의 마녀 세라피네는 원거리 냉기 마법과 광역 공격으로 전장을 장악합니다.",
        meta: "BOSS · 백야의 마녀 세라피네",
      },
      {
        label: "늑대소굴 몬스터",
        description:
          "북극 늑대, 그림자 늑대와 툰드라 늑대인간이 빠르게 거리를 좁혀 공격합니다.",
        meta: "BOSS · 지옥의 케르베로스",
      },
    ],
  },
  {
    code: "RAID",
    eyebrow: "05 · RAID CHALLENGE",
    icon: "✦",
    title: "레이드 보스 공략",
    intro:
      "소환의 제단은 충분한 유물을 모은 모험가만 입장할 수 있는 단독 보스 전투입니다. 일반 몬스터는 등장하지 않으며 망각의 셀 타이탄 제로스와 즉시 전투를 시작합니다.",
    items: [
      {
        label: "소환 조건",
        description:
          "마을 동쪽 고대 유적의 소환의 제단에서 E를 누르세요. 서로 다른 유물을 15종 이상 보유해야 제단이 활성화되고 레이드 입구가 열립니다.",
        meta: "RELIC TYPE 15+ · SUMMONING ALTAR",
      },
      {
        label: "망각의 셀 타이탄 제로스",
        description:
          "레이드 맵에는 제로스 한 개체만 출현합니다. 매우 넓은 체력바와 강한 접촉 피해를 지니므로 회복 물약과 대시를 충분히 준비하세요.",
        meta: "RAID BOSS · SOLO ARENA",
      },
      {
        label: "핵심 공격 패턴",
        description:
          "돌진은 이동 경로에서 벗어나 피하고, 양팔 내려찍기 뒤에는 표시된 원을 피해 운석 낙하 지점에서 이탈하세요. 가슴 크리스탈 레이저는 반원형 궤적의 바깥으로 대시해 회피합니다.",
        meta: "CHARGE · METEOR SLAM · LASER SWEEP",
      },
      {
        label: "입장과 퇴장",
        description:
          "레이드 아레나 우측 상단의 포기하고 나가기 버튼으로 언제든 마을로 돌아갈 수 있습니다. 처치 후에는 처치하고 나가기로 보상을 정리한 뒤 퇴장하세요.",
        meta: "TOP-RIGHT RAID CONTROLS",
      },
    ],
  },
  {
    code: "NPC",
    eyebrow: "06 · VILLAGE NPC",
    icon: "※",
    title: "NPC별 기능",
    intro:
      "NPC 가까이에서 E를 누르면 대화하거나 전용 기능을 이용할 수 있습니다.",
    items: [
      {
        label: "장로 노라",
        description: "첫 번째 수식 복구 퀘스트를 시작하고 완료를 확인합니다.",
        meta: "MAIN QUEST",
      },
      {
        label: "용병 관리자 세라오스",
        description: "저장된 캐릭터를 변경하거나 새로운 캐릭터를 생성합니다.",
        meta: "CHARACTER ROSTER",
      },
      {
        label: "전직 관리자 아론",
        description:
          "레벨 30 이상의 2차 전직 캐릭터를 같은 직업군의 다른 2차 직업으로 전환합니다.",
        meta: "SECOND JOB SWITCH",
      },
      {
        label: "상인 피코",
        description: "골드로 무기, 방어구와 액세서리를 구매하고 즉시 장착합니다.",
        meta: "EQUIPMENT SHOP",
      },
      {
        label: "대장장이 브람",
        description:
          "골드를 사용해 무기를 +10까지 강화합니다. 공격력은 증가하고 스킬·대시 쿨타임은 감소합니다.",
        meta: "WEAPON ENHANCE",
      },
      {
        label: "학자 루미 · 순찰자 로완",
        description:
          "루미는 마을 보급 상자 퀘스트를, 로완은 던전 탐험과 끝없는 성장의 길을 안내합니다.",
        meta: "LORE · HUNTING INFO",
      },
      {
        label: "유물 관리자 디거",
        description:
          "발견한 유물의 종류와 효과를 기록합니다. 유물 15종을 모으면 소환의 제단 도전을 안내합니다.",
        meta: "RELIC ARCHIVE · SUMMONING ALTAR",
      },
    ],
  },
];

const focusableSelector =
  'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export function RpgGuidePanel() {
  const characterName = useGameStore((state) =>
    state.rpgCharacters.find(
      (profile) => profile.id === state.activeRpgCharacterId,
    )?.name,
  );
  const closeGuide = useGameStore((state) => state.closeRpgGuide);
  const isOpen = useGameStore((state) => state.rpgGuideOpen);
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const section = GUIDE_SECTIONS[activeIndex] ?? GUIDE_SECTIONS[0];
  const isLastSection = activeIndex === GUIDE_SECTIONS.length - 1;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusFrame = requestAnimationFrame(() => panelRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGuide();
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => Math.max(0, index - 1));
      } else if (event.key === "ArrowRight") {
        setActiveIndex((index) =>
          Math.min(GUIDE_SECTIONS.length - 1, index + 1),
        );
      } else if (event.key === "Tab") {
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeGuide, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="rpg-modal-layer rpg-guide-layer">
      <section
        aria-describedby="rpg-guide-description"
        aria-labelledby="rpg-guide-title"
        aria-modal="true"
        className="rpg-guide-panel"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header>
          <div className="rpg-guide-brand" aria-hidden="true">
            PDL
          </div>
          <div>
            <small>PIXEL DOT LAND / NEW ADVENTURER GUIDE</small>
            <h2 id="rpg-guide-title">{characterName ?? "모험가"}의 첫 모험 안내서</h2>
            <p id="rpg-guide-description">
              마을을 떠나기 전에 꼭 알아야 할 핵심 내용을 6단계로 정리했습니다.
            </p>
          </div>
          <button aria-label="가이드 닫기" onClick={closeGuide} type="button">
            ×
          </button>
        </header>

        <div className="rpg-guide-layout">
          <nav aria-label="가이드 목차" role="tablist">
            <span>GUIDE INDEX</span>
            {GUIDE_SECTIONS.map((guideSection, index) => (
              <button
                aria-controls="rpg-guide-section"
                aria-selected={activeIndex === index}
                className={activeIndex === index ? "is-active" : undefined}
                key={guideSection.code}
                onClick={() => setActiveIndex(index)}
                role="tab"
                type="button"
              >
                <i aria-hidden="true">{guideSection.icon}</i>
                <span>
                  <small>{guideSection.code}</small>
                  <strong>{guideSection.title}</strong>
                </span>
                <em>{String(index + 1).padStart(2, "0")}</em>
              </button>
            ))}
            <p>
              이 가이드는 우측 <strong>AI GUIDE</strong>에서 언제든 다시 열 수 있습니다.
            </p>
          </nav>

          <article
            aria-labelledby="rpg-guide-section-title"
            className="rpg-guide-content"
            id="rpg-guide-section"
            role="tabpanel"
          >
            <header>
              <div aria-hidden="true">{section.icon}</div>
              <span>
                <small>{section.eyebrow}</small>
                <h3 id="rpg-guide-section-title">{section.title}</h3>
              </span>
            </header>
            <p>{section.intro}</p>
            <div className="rpg-guide-card-grid">
              {section.items.map((item) => (
                <section key={item.label}>
                  <span aria-hidden="true" />
                  <div>
                    <small>{item.meta}</small>
                    <h4>{item.label}</h4>
                    <p>{item.description}</p>
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>

        <footer>
          <div className="rpg-guide-progress" aria-label={`가이드 ${activeIndex + 1}/${GUIDE_SECTIONS.length}`}>
            {GUIDE_SECTIONS.map((guideSection, index) => (
              <button
                aria-label={`${index + 1}단계 ${guideSection.title}`}
                aria-current={activeIndex === index ? "step" : undefined}
                className={activeIndex === index ? "is-active" : undefined}
                key={guideSection.code}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
          <span>← → 키로도 페이지를 넘길 수 있습니다.</span>
          <div className="rpg-guide-actions">
            <button
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
              type="button"
            >
              이전
            </button>
            <button
              className="is-primary"
              onClick={() => {
                if (isLastSection) {
                  closeGuide();
                  return;
                }
                setActiveIndex((index) => index + 1);
              }}
              type="button"
            >
              {isLastSection ? "모험 시작" : "다음 안내"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
