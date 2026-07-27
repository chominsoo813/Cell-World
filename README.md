# CELL WORLD

> Hidden Games Inside the Spreadsheet

스프레드시트처럼 보이는 하나의 웹 화면에서 세 가지 도트 게임을 플레이하는 AI 게임 해커톤 프로젝트입니다. 상단의 리본·수식 입력줄·행/열 헤더·시트 탭은 게임을 바꿔도 유지되고, 셀 영역만 각 Phaser 게임 월드로 전환됩니다.

## 라이브 데모

**Vercel:** [https://cell-world.vercel.app](https://cell-world.vercel.app)

## 현재 구현

- Excel 스타일 공통 셸과 게임 선택 화면
- `Cell World RPG`
  - 방향키 이동, `A` 기본 공격, `Z` 아이템 습득, `L-Shift` 대쉬
  - `D` 2초 회전검 스킬, `E` NPC·사물·포탈 상호작용
  - 안전한 마을과 동굴 10구역·설원 10구역, 테마별 최종 보스
  - 8프레임 플레이어·NPC·몬스터 애니메이션과 확률형 유물 드롭
  - 장로 의뢰 → 수식 코어 회수 → 슬라임 3마리 처치 → 보상 수령
  - 플레이 상태를 전달받는 AI NPC 대화와 로컬 폴백
- `Cell Office Keeper`
  - 제한 시간 90초, 업무 파일 3개 회수, 경비 시야 회피, EXIT 탈출
- `Cell Office Defence`
  - 페이퍼클립 자동 공격, 다중 발사·관통 성장, 적 웨이브, 경험치와 레벨업 강화, 12킬 후 보스전
- Zustand 로컬 세션 저장 및 게임별 재시작
- `/api/health`, `/api/npc/chat` Next.js Route Handler
- OpenAI Responses API 서버 연동

## 기술 스택

- Next.js App Router
- React + TypeScript
- Phaser 3
- Zustand
- Zod
- OpenAI Responses API
- Vercel 프로덕션 배포
- Supabase는 본선 확장용 선택 항목

## 로컬 실행

Node.js 20.9 이상과 pnpm이 필요합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

검증 명령:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## 환경 변수

`.env.example`을 `.env.local`로 복사하고 서버 전용 값을 설정합니다.

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-sol
```

`OPENAI_API_KEY`는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 키는 브라우저 번들에 포함되지 않고 `/api/npc/chat`에서만 사용됩니다. 키가 없거나 요청이 실패해도 결정론적 NPC 폴백으로 게임 루프가 계속됩니다.

## 구조

```text
src/
├─ app/
│  ├─ api/                 # Vercel Functions로 배포되는 Route Handlers
│  ├─ globals.css
│  └─ page.tsx
├─ components/             # 스프레드시트 셸, HUD, 대화/결과 UI
├─ game/
│  ├─ createCellWorldGame.ts
│  └─ scenes/              # RPG, Keeper, Defence Phaser Scene
├─ lib/                    # 게임 카탈로그
└─ stores/                 # Zustand 클라이언트 상태
```

## 제품 원칙

1. 상단 스프레드시트 UI는 게임을 전환해도 유지합니다.
2. 규칙·보상·상태 변경은 게임 코드가 결정하고 AI는 대사·힌트를 담당합니다.
3. AI 오류가 핵심 플레이를 중단시키지 않게 합니다.
4. 사전 과제에서는 세 게임의 짧고 완결된 루프와 RPG의 AI 경험을 우선합니다.

세부 일정은 [docs/16_DAY_PLAN.md](docs/16_DAY_PLAN.md)를 참고하세요.
