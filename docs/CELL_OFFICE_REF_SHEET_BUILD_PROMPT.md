# Cell Office REF — 시트 제작 프롬프트 / 컨벤션

> 이 문서는 `CellOfficeRefScene.ts`에 세션·시트별 퍼즐을 "리터칭(재사용·일관화)"하며 확립한 규칙 모음이다.
> 새 시트를 추가하거나 다른 세션/에이전트가 이어서 작업할 때 이 문서를 그대로 지침(프롬프트)으로 사용한다.
> 스펙 원본은 `docs/CELL_OFFICE_CORE_RULES.md`(CR-0xx)와 `docs/CELL_OFFICE_REF_GDD.md`.

---

## 0. 역할과 목표

- 목표: 스펙(CR-0xx) 한 편 = 시트 한 개를, **기존 시트들과 똑같은 구조·연출·입력 규칙**으로 구현한다.
- 모든 게임 로직은 단일 Phaser 씬 `src/game/scenes/CellOfficeRefScene.ts` 안에 있다. 새 파일을 만들지 않는다.
- 시트 카탈로그(30개: 6세션 × 5시트)는 `src/game/officeRefSheets.ts`. 씬은 `getOfficeSheet(level, sheet)`로 현재 시트를 읽는다.
- 이미 커스텀 구현된 시트를 그대로 베끼는 것이 정석. **새로 발명하지 말고 가장 비슷한 기존 시트를 골라 미러링**한다.

---

## 1. 시트 추가 절차 (디스패치 지점 체크리스트)

새 시트 `SxSy`를 추가할 때 아래를 빠짐없이 연결한다. 하나라도 빠지면 조용히 기본 레이아웃으로 폴백된다.

1. **판별 헬퍼**: `private isSessionXSheetY() { return session===X && sheet===Y; }`
2. **상태 필드**: 접두사 `sXsY`(FINAL은 `sXfin`)로 그룹화해 선언. 예: `s5s3BoxEmployee`, `s3finBeamActive`.
3. **resetRuntime()**: 새 필드를 전부 초기화(참조 배열은 `[]`, 카운터/플래그 리셋). 시트 재시작 시 상태가 새는 것을 막는다.
4. **buildCompanyLayout()**: `else if (isSessionXSheetY()) this.buildSessionXSheetYLayout();` 추가.
5. **placeSessionProps 제외 목록**: 커스텀 시트는 기본 소품 배치를 끄도록 `&& !this.isSessionXSheetY()`를 and-체인에 추가.
6. **createMissionObjects()**: 분기 추가 → `createSessionXSheetYMissionObjects(); return;`
7. **updateInteractionPrompt()**: 분기 추가 → `updateSessionXSheetYPrompt(); return;`
8. **interact()**: 분기 추가 → `interactSessionXSheetY(); return;`
9. (편집 패널 쓰면) **setEditMode()** 분기 + **confirmEdit()** 분기 + `confirmSessionXSheetY...()`
10. (실시간 요소 있으면) **updateGuard() 하자드 블록**에 `this.updateSessionXSheetY(time, delta);` 추가(여기서만 `delta` 사용 가능).
11. (COPY/PASTE/UNDO 쓰면) `copyContextObject`/`pasteContextObject`/`undoContextObject`에 라우팅 추가.
12. **버전 마커**: `src/components/game/GameCanvas.tsx`의 `sceneRuntimeVersions.keeper`를 `office-sheets-30-sXsY`로 올린다(매 시트).

---

## 2. 코드·연출 리터칭 규칙

- **입력 키 고정**: 이동 `WASD`, 편집/자기HIDE `SPACE`, 미리보기·실행 `ENTER`, 상호작용 `E`, 복사 `C`, 붙여넣기 `V`, 되돌리기 `Z`(`OfficeKeys.undo`).
- **2단계 패널(미리보기 → 실행)**: 편집/오류 패널은 항상 첫 `ENTER`에서 미리보기(예상 결과·비용·손상도 표시), 두 번째 `ENTER`에서 실제 실행. `sXsYPreviewed` 플래그로 구분.
- **커스텀 편집 가드**: 자체 `setEditMode` 패널을 쓰는 시트는 반드시 `handleEditTyping`의 early-return 목록에 추가(A–Z/숫자 키가 패널을 가로채는 것 방지). 표준 ROW/COLUMN HIDE를 겸하는 시트(S3S3, S6S1 등)는 `(... && sXsYIfEditing)`처럼 편집 모드일 때만 가드.
- **문(게이트) 개폐 표준**: `door.setTexture("office-ref-exitOpen"/"exitLocked")` + `arcadeBody(doorBody).enable = false/true`. **문을 닫을 땐** 반드시 `movePlayerOutside(doorBody)`를 먼저 호출해 플레이어가 벽에 끼는 것 방지.
- **관용 설계(soft-lock 금지)**: 타이밍 실패는 되돌려 재시도하게 하고, 필요하면 소비한 CALC를 환불한다. 오류/드래프트 만료도 리셋 후 재시도 가능하게. 손상도가 85↑면 오류 사용을 막는다(파일 충돌 가드).
- **상태 라벨**: 각 시트는 인월드 텍스트 라벨로 진행 상태/카운트다운/판정을 보여준다(`backgroundColor:"#2a2320"`, 손상도/경고는 색으로: 정상 `#f0c9a6`, 경고 `#ff9b88`, 성공 `#bfe6c4`).
- **셀 수식 피드백**: 중요한 동작마다 `useGameStore.getState().setSelectedCell("<셀>", "=FUNC(...) // 설명")`으로 HUD 수식 바를 갱신(스프레드시트 몰입감).
- **효과 타이머는 절대시각 비교**: `xUntil = time + ms`, 만료는 `time >= xUntil`. 정지(freeze) 필요 시 "누적 정지시간(frozenAccum)"으로 유효시각을 계산(S5S2 참고).
- **탐지→경보**: `triggerAlert(time, "CCTV"|"GUARD")`(1.2s 스로틀 + 플레이어 시작위치 복귀 + 붉은 틴트). 인월드 상태 라벨로 사유 표시.

## 3. 자원 규칙 — CALC vs DAMAGE

- **일반 함수**(SORT/FILTER/IF/HIDE/COPY/PASTE/UNDO): `this.calc`를 소비. 시작 5/5. 충전 노드 `+2`(최대 7, `this.rechargeUsed`). 스펙의 "정확히 CALC N 사용"을 지키도록 각 함수 비용을 스펙대로(예: IF 3, SORT 2, HIDE 1, PASTE 2, UNDO 3) 차감.
- **오류 함수**(#NAME?/#DIV0!/#VALUE!/#REF!): CALC 대신 **손상도(DAMAGE)** 를 올린다(+15/+20/+25). 손상도는 씬 로컬 변수 + 인월드 라벨(`손상도 N/100`)로 표시(스토어 필드 아님). 파일 충돌 85. UNDO·시간으로 안 내려간다.

## 4. 검증 규칙 (시트마다)

- npm이 PATH에 없다. 코덱스 번들 노드로 로컬 바이너리를 직접 호출:
  `C:\Users\jin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`
- 순서: `tsc --noEmit` → `vitest run`(58 통과) → `eslint` → `next build`(전체 프레시 컴파일). 넷 다 통과해야 커밋.
- 마지막에 스펙(CR) 대비 **승리 경로 핸드-트레이스**(각 단계·CALC/손상도 합·게이트 개폐 순서). 텍스처 키가 `ASSETS`에 실제 존재하는지 확인.
- 브라우저 런타임 테스트는 이 샌드박스에서 불가(캐시된 JS 청크). 정적 검증 + 핸드-트레이스에 의존하고, 사용자에게 수동 플레이테스트를 권한다.

## 5. Git 규칙

- 브랜치 `codex/office-ref-design-assets`, push 대상 `origin`(woo222). `upstream`(chominsoo813)에서 pull.
- **시트마다 개별 커밋**(제목 `feat: add Session X Sheet Y ...`, 본문에 메커닉·CALC·검증·런타임 한계 명시).
- 스테이징은 `git add src/`만. **`next-env.d.ts`는 커밋에서 제외**(dev/build 변형으로 flip-flop → `git checkout -- next-env.d.ts` 후 스테이징).
- 빌드와 dev 서버가 `.next`를 다투므로, 빌드 전 dev 서버 중지 → 빌드 → 커밋 → dev 서버 3000번으로 재시작.

---

## 6. 맵 구성 규칙 (반드시 지킬 것)

### 6.1 월드 좌표계
- 상수: `CELL_WIDTH=80`, `CELL_HEIGHT=52`, `WORLD_COLUMNS=26`, `WORLD_ROWS=18` → **월드 2080 × 936 px**.
- **셀 → 픽셀 매핑**(스펙의 `H6` 같은 표기를 좌표로): 열 문자 → 인덱스(A=0), `x = (colIndex + 0.5) * 80`; 행 번호 → `y = (row - 0.5) * 52`. 예) `J6` = 열 J(9), 행 6 → `x=760, y=286`. `cellAt(x,y)`가 역변환.
- **진행 방향은 좌→우**가 기본. 시작은 좌측 하단부(대개 `configureRoute` player `{x:160, y:600대}`), 회수 목표·제출·EXIT는 우측.

### 6.2 레이아웃 빌더 (`buildSessionXSheetYLayout`)
- 첫 줄에서 `configureRoute(player, terminal, exit, guard)`로 시작/단말기/출구/경비 순찰을 설정.
- **체크포인트 벽 표준 3종 세트**: 세로벽 위/아래 두 파티션 + 그 사이 doorway.
  ```ts
  this.addPartition(GX, 100, 22, 184, "LOCKED");   // 위쪽 벽 (y ~8..192)
  this.addPartition(GX, 610, 22, 652, "LOCKED");   // 아래쪽 벽 (y ~284..936)
  this.addDoorway(GX, 234, true);                   // 통로 gap (row ~5, y=234)
  ```
  통로 gap은 관례상 **y=234**(세로 이동 라인). 실제 문/게이트 몸통은 미션 오브젝트에서 `addWall(GX,234,58,88,0)`로 만들고 개폐를 제어.
- **원거리 "믿을 만한 사무실" 잠금 구역**: 플레이 영역 끝(대개 x=1440~1680)에 `addPartition(x, WORLD_HEIGHT/2, 22, WORLD_HEIGHT, "LOCKED")`를 세우고 그 너머에 장식용 `createDeskPod`/`addHideableFurniture`를 배치. "이 시트에선 아직 잠김"을 시각적으로 표현.
- 근경엔 `createDeskPod`, `createMeetingTable`, `addHideableFurniture(plant/bookshelf/filingCabinet)`로 사무실 톤을 채운다(플레이 경로는 막지 않게).

### 6.3 오브젝트·소품 관례
- **단말기/콘솔**: 오류·연결 단말기 `office-ref-terminal`(오류 시트는 보라 틴트 `0xc9a0d0`), 편집 콘솔/센서패드 `office-ref-sensorPad`(청록 `0x7fc7a5`), 충전 노드 `office-ref-chargeNode`, 스캐너/버튼 `office-ref-scanner`.
- **문/게이트**: `office-ref-exitLocked`↔`exitOpen`. **키카드** `office-ref-keycard`, 문서/증빙 `office-ref-approvalDocument`/`contractDocument`, 제출 슬롯 `office-ref-saveSlot`.
- **NPC**: 경비 `office-ref-guardFront`, 동료 `office-ref-coworkerFront/Back`, VP DROP `office-ref-vpDrop`, Auditor `office-ref-auditorCtrl`, Director `office-ref-directorIferror` 등. **반드시 `ASSETS`에 있는 키만** 사용(없으면 로드 실패로 빈 박스).
- **하이라이트**: 상호작용 대상엔 `office-ref-itemHighlight`(노랑 `0xffd66e`)를, 활성/완료 시 `0x79d6a5` 틴트로 바꿔 피드백.
- **범위·존 시각화**: 예외 범위/샌드박스/버퍼는 반투명 사각형(`0x35d0c8, 0.08` + 청록 stroke), 감지존(HR/빔/스캐너)은 자홍/적색 반투명(`0xd070d0`/`0xff6b6b`).

### 6.4 깊이(Depth) 관례
- 바닥/그리드 `0`, 파티션/존 `5~6`, 문·NPC `8~9`, 하이라이트 `7`, 플레이어 `20`, 그림자 `17~19`, 상태 라벨 `12`, 프롬프트 `50`, 편집 패널 `100`. 카드/컨테이너 `8`.

### 6.5 HIDE 대상 등록
- 함수 HIDE로 접을 벽/오브젝트는 `registerHideTarget([visuals], [bodies], targetKey)`로 등록. `targetKey`는 `"ROW_n"`, `"COLUMN_X"`, 또는 `"LOCKED"`(항상 잠김·표준 편집 대상 제외).
- 표준 HIDE는 `HIDE_DURATION=5000`(5초). 3초 드래프트 등 다른 지속시간이 필요하면 커스텀 타이머로 구현(S6S3 참고).
- 기하학적 매칭 주의: `targetKey` 없는 hide 대상은 선택 ROW/COLUMN과 **겹치면** 함께 숨겨진다. 의도치 않은 오브젝트가 걸리지 않게 배치.

### 6.6 이동·판정 여백
- 플레이어 속도 `PLAYER_SPEED=260 px/s`. 타이밍 창(예: 8초 필터, 5초 HIDE, 3초 드래프트)은 **가장 먼 지점까지의 거리 ÷ 260 + 상호작용 시간**이 창 안에 들어오도록 오브젝트 간격을 잡는다.
- 감지존 lane은 `player.x∈[..]&&|player.y - z|<..` 식으로 좁게. 우회로가 있으면 벽으로 채널링해 반드시 통과하게(단, soft-lock은 금지).

---

## 7. 자주 쓰는 헬퍼 (씬 내장)

| 헬퍼 | 용도 |
|---|---|
| `configureRoute(player, terminal, exit, guard)` | 시작/단말기/출구/경비 세팅 |
| `addPartition(x,y,w,h,key?)` | 벽/파티션(+선택적 hide targetKey) |
| `addDoorway(x,y,vertical)` | 통로 시각 표시(hide 대상) |
| `addWall(x,y,w,h,alpha=1)` | 충돌 몸통(alpha 0이면 보이지 않는 콜라이더) |
| `registerHideTarget(vis,bodies,key?)` | HIDE로 접을 대상 등록 |
| `createDeskPod / createMeetingTable / addHideableFurniture` | 사무실 소품 |
| `arcadeBody(obj)` / `movePlayerOutside(body)` | 물리 몸통 접근 / 문 닫을 때 밀어내기 |
| `cellAt(x,y)` | 픽셀 → 셀 표기 |
| `triggerAlert(time, source)` | 경보(스로틀 + 시작복귀) |

---

### 부록 — 진행 현황(참고)
**구현 완료.** Session 2·3·4·5 전체 + Session 6 전체(S1~S4, FINAL) = 25개. Session 1은 이 작업 이전부터 존재. 남은 시트 없음.
- Session 6 Sheet 4(SAVE): 12초 `LOAD_LAST_FINAL` 주기를 IF 승인으로 정지시키는 커스텀 타이머 시트.
- Session 6 FINAL(UNPROTECT): 4 ROOT LOCK 캡스톤. 잠금별 SAVE 체크포인트(E 2초 홀드) + 하위 관리자 12초 복구 루프 + ROOT CACHE 5개(정확 CALC 15) + 필수 #REF!(손상+25) + FULL ROW REVIEW self-hide 회피.
- HUD CALC 분모: 카탈로그 `maxCalc`(충전 7 / FINAL 15) 기반으로 정확 표시(`Math.max(maxCalc, 현재값)` clamp).
