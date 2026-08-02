export const OFFICE_SESSION_IDS = [1, 2, 3, 4, 5, 6] as const;
export const OFFICE_SHEET_IDS = [1, 2, 3, 4, 5] as const;

export type OfficeSessionId = (typeof OFFICE_SESSION_IDS)[number];
export type OfficeSheetId = (typeof OFFICE_SHEET_IDS)[number];

export type OfficeLayoutKind =
  | "operations"
  | "records"
  | "checkpoint"
  | "meeting"
  | "audit";

export interface OfficeSheetConfig {
  functionName: string;
  layout: OfficeLayoutKind;
  mission: string;
  session: OfficeSessionId;
  sheet: OfficeSheetId;
  title: string;
  workbook: string;
}

const SESSION_SHEETS: Record<
  OfficeSessionId,
  readonly Omit<OfficeSheetConfig, "session" | "sheet">[]
> = {
  1: [
    { title: "숨겨진 복도", workbook: "ONBOARDING.xlsx", functionName: "HIDE", layout: "operations", mission: "퇴근 단말기를 확인하고 출입문으로 이동" },
    { title: "사라진 벽", workbook: "CONTRACT_ARCHIVE.xlsx", functionName: "HIDE", layout: "records", mission: "기록실을 통과해 계약서를 제출" },
    { title: "복사본 출입증", workbook: "BADGE_COPY.xlsx", functionName: "COPY / PASTE", layout: "checkpoint", mission: "복제 출입증으로 보안문 통과" },
    { title: "프린터 대소동", workbook: "MEETING_ERROR.xlsx", functionName: "HIDE + COPY", layout: "meeting", mission: "회의실에 갇힌 동료의 TASK 복구" },
    { title: "수습 평가표", workbook: "PROBATION_REVIEW.xlsx", functionName: "HIDE + COPY", layout: "audit", mission: "평가 점수를 75로 복구해 제출" },
  ],
  2: [
    { title: "정렬되지 않은 출근줄", workbook: "ATTENDANCE_QUEUE.xlsx", functionName: "SORT", layout: "operations", mission: "직급 순서로 출근 대기열 정렬" },
    { title: "부서별 출입구", workbook: "DEPARTMENT_GATE.xlsx", functionName: "SORT", layout: "checkpoint", mission: "부서 순서에 맞춰 그룹 센서 활성화" },
    { title: "조건부 검문소", workbook: "CLEARANCE_FILTER.xlsx", functionName: "FILTER", layout: "records", mission: "유효한 보안 등급만 남겨 검문소 통과" },
    { title: "감사 대기열", workbook: "AUDIT_QUEUE.xlsx", functionName: "FILTER + SORT", layout: "meeting", mission: "팀장 업무를 우선순위대로 처리" },
    { title: "표본 감사", workbook: "SAMPLE_AUDIT.xlsx", functionName: "FILTER + SORT", layout: "audit", mission: "오늘의 정상 기록으로 감사 표본 구성" },
  ],
  3: [
    { title: "문을 여는 직원", workbook: "EMPLOYEE_TRIGGER.xlsx", functionName: "IF", layout: "operations", mission: "직원 위치 조건으로 보안문 개방" },
    { title: "지금 참, 나중에 참", workbook: "DELAYED_TRUE.xlsx", functionName: "IF", layout: "records", mission: "즉시·지연 조건 두 개를 순서대로 만족" },
    { title: "숨겨진 조건", workbook: "HIDDEN_TRIGGER.xlsx", functionName: "IF + HIDE", layout: "checkpoint", mission: "조건 감시를 멈추고 제한 시간 문 통과" },
    { title: "회의 소집", workbook: "MEETING_CALL.xlsm", functionName: "IF + MACRO", layout: "meeting", mission: "회의 인원 네 명을 모아 조건 발동" },
    { title: "무한 업무 루프", workbook: "TASK_LOOP.xlsm", functionName: "IF + MACRO", layout: "audit", mission: "자동화를 중지하고 LOOP_DEPTH를 0으로 복구" },
  ],
  4: [
    { title: "취소되지 않은 문", workbook: "CHANGE_HISTORY.xlsx", functionName: "UNDO", layout: "operations", mission: "복제 작업만 취소하고 열린 문 상태 보존" },
    { title: "마지막 수정자", workbook: "LAST_EDITOR.xlsx", functionName: "IF + PASTE", layout: "checkpoint", mission: "미끼 오브젝트로 감사 복구 대상 변경" },
    { title: "겹쳐진 자리", workbook: "PREVIOUS_FLOORPLAN.xlsx", functionName: "IF + UNDO", layout: "records", mission: "과거 배치로 통로와 CCTV 엄폐 동시 확보" },
    { title: "내 행을 숨겨라", workbook: "FULL_ROW_REVIEW.xlsx", functionName: "SELF HIDE", layout: "meeting", mission: "감사 빔 세 구간을 자기 행 숨김으로 회피" },
    { title: "승인되지 않은 수정", workbook: "REVISION_AUDIT.xlsx", functionName: "PASTE + IF + UNDO", layout: "audit", mission: "조작된 승인 기록을 비교해 판정 제출" },
  ],
  5: [
    { title: "이름 없는 해고 대상", workbook: "CANONICAL_BADGE.xlsx", functionName: "#NAME?", layout: "operations", mission: "비어 있는 신원 필드를 복원해 안전 구역 진입" },
    { title: "멈춘 해고 작업", workbook: "DROP_COMMAND.xlsx", functionName: "#DIV/0!", layout: "checkpoint", mission: "보안 장치의 시간 범위를 정지해 통과" },
    { title: "잘못된 자료형", workbook: "TYPE_SCHEMA.xlsx", functionName: "#VALUE!", layout: "records", mission: "상자를 직원으로 오인한 삭제 판정을 무효화" },
    { title: "삭제할 수 있는 것", workbook: "REFERENCE_MAP.xlsx", functionName: "#REF!", layout: "meeting", mission: "안전한 참조 릴레이만 제거해 문 개방" },
    { title: "해고 명령의 참조", workbook: "TERMINATION_CHAIN.xlsx", functionName: "ERROR CHAIN", layout: "audit", mission: "오류 함수의 참조 사슬을 끊어 삭제 명령 취소" },
  ],
  6: [
    { title: "선택된 셀만", workbook: "ROOT_SELECTION.xlsx", functionName: "SELECT", layout: "operations", mission: "허용된 셀만 선택해 ROOT 구역 접근" },
    { title: "수식은 여기서만", workbook: "FORMULA_SCOPE.xlsx", functionName: "PROTECT", layout: "records", mission: "수식 입력 권한이 있는 범위 확보" },
    { title: "미리보기일 뿐", workbook: "PRINT_PREVIEW.xlsx", functionName: "PREVIEW", layout: "checkpoint", mission: "저장되지 않는 미리보기 규칙을 역이용" },
    { title: "저장되지 않은 변경", workbook: "UNSAVED_CHANGES.xlsx", functionName: "SAVE", layout: "meeting", mission: "저장 슬롯을 연결해 변경 사항 확정" },
    { title: "통합 문서 보호 해제", workbook: "CELL_OFFICE_ROOT.xlsx", functionName: "UNPROTECT", layout: "audit", mission: "ROOT LOCK을 해제하고 최종 결과 저장" },
  ],
};

export const OFFICE_REF_SHEETS = Object.fromEntries(
  OFFICE_SESSION_IDS.map((session) => [
    session,
    Object.fromEntries(
      SESSION_SHEETS[session].map((sheet, index) => [
        index + 1,
        { ...sheet, session, sheet: (index + 1) as OfficeSheetId },
      ]),
    ),
  ]),
) as Record<OfficeSessionId, Record<OfficeSheetId, OfficeSheetConfig>>;

export function isOfficeSheetId(value: unknown): value is OfficeSheetId {
  return typeof value === "number" && OFFICE_SHEET_IDS.includes(value as OfficeSheetId);
}

export function getOfficeSheet(session: OfficeSessionId, sheet: OfficeSheetId) {
  return OFFICE_REF_SHEETS[session][sheet];
}
