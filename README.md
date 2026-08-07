# Pixel Dot Land

> 캐릭터를 성장시키며 마을과 사냥터를 탐험하는 픽셀 판타지 액션 RPG입니다.

**라이브 서비스:** [cell-world.vercel.app](https://cell-world.vercel.app)

## 주요 기능

- Phaser 기반 액션 RPG 월드, NPC 상호작용, 퀘스트, 사냥터·보스·레이드
- 캐릭터별 성장 데이터 저장: 레벨, 장비, 유물, 골드, 전직, 전투 기록
- 직업별 기본 공격·스킬, 투사체, 범위 공격, 돌진, 차징 스킬
- 게임 내 가이드, 인벤토리, 상점, 대장간, 전직 및 캐릭터 관리 UI
- Zustand 기반 클라이언트 상태 관리와 브라우저 로컬 저장
- `/api/health`, `/api/npc/chat` Next.js Route Handlers

## 조작방식

캐릭터를 선택한 뒤 게임에 입장하기 전에 조작방식을 고를 수 있습니다. 선택값은 캐릭터별로 저장되며, 캐릭터 선택 화면 또는 게임 내 가이드에서 다시 변경할 수 있습니다.

| 기능 | 키보드 | 키보드 + 마우스 |
| --- | --- | --- |
| 이동 | 방향키 | `W` `A` `S` `D` |
| 기본 공격 | `A` | 좌클릭 |
| 직업 스킬 | `D` | 우클릭 |
| 대시 | `Shift` | `Shift` |
| 상호작용 | `E` | `E` |
| 줍기 | `Z` | `Z` |
| 물약 회복 | `Alt` | `Alt` |

`키보드 + 마우스` 방식에서 마우스는 공격과 스킬의 자유 조준에만 사용합니다. 캐릭터의 외형과 이동 애니메이션은 마우스 위치와 관계없이 `WASD` 이동 방향을 따라 바뀌며, 멈추면 마지막 이동 방향을 유지합니다.

마법사 계열 스킬은 마우스 월드 좌표를 목표로 사용하며, 장궁·격투가 스킬은 우클릭을 누르는 동안 차징하고 뗀 시점의 마우스 방향으로 발동합니다.

## 기술 스택

- Next.js 16 App Router
- React 19 + TypeScript
- Phaser 3
- Zustand
- Zod
- OpenAI Responses API
- Vercel

## 로컬 실행

Node.js 20.9 이상과 pnpm이 필요합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 검증 명령

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 환경 변수

`.env.example`을 `.env.local`로 복사한 뒤 서버 전용 값을 설정합니다.

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-sol
```

`OPENAI_API_KEY`에는 `NEXT_PUBLIC_` 접두사를 사용하지 마세요. 키는 `/api/npc/chat` Route Handler에서만 사용되며, 키가 없거나 요청이 실패해도 결정론적인 NPC 응답으로 게임 진행을 계속할 수 있습니다.

## 배포

프로덕션 배포는 프로젝트 루트에서 다음 명령으로 실행합니다.

```bash
pnpm dlx vercel --prod --yes
```

## 구조

```text
src/
├─ app/                 # Next.js App Router와 Route Handlers
├─ components/          # HUD, 캐릭터 선택, 조작방식, 가이드 UI
├─ game/                # Phaser 게임 초기화와 RPG Scene
├─ lib/                 # 직업, 아이템, 전투, 저장 데이터 정의
└─ stores/              # Zustand 게임 상태
```
