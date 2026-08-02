from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "public/assets/pixel-art/office-ref"
KEEPER = ROOT / "public/assets/pixel-art/office-escape"
OUTPUT = ROOT / "docs/mockups/office-ref-sheets"
WIDTH, HEIGHT = 1280, 720


@dataclass(frozen=True)
class Sheet:
    session: int
    slot: str
    title: str
    grid: str
    formula: str
    icon: str
    goal: str
    gimmick: str
    selection: str
    prop: str
    boss: str


SHEETS = [
    Sheet(1, "sheet-01", "숨겨진 복도", "A1:N10", "=HIDE(COLUMN_H)", "hide.png", "접힌 통로를 건너 EXIT로 이동", "5초 뒤 COLUMN H 복원", "column", "security_turnstile.png", "team_leader_front.png"),
    Sheet(1, "sheet-02", "사라진 벽", "A1:P10", "=HIDE(ROW_6)", "hide.png", "계약서를 OUTBOX에 제출", "벽·CCTV 동시 제거", "row", "calc_recharge_node.png", "team_leader_front.png"),
    Sheet(1, "sheet-03", "복사본 출입증", "A1:Q11", "=COPY(BADGE_H3) → PASTE(HANDS)", "copy_paste.png", "복제 배지로 보안문 통과", "원본 이동 시 보안 이벤트", "range", "sensor_pad.png", "team_leader_front.png"),
    Sheet(1, "sheet-04", "프린터 대소동", "A1:R12", "=COPY(PRINTER_G8) → PASTE(M8)", "copy_paste.png", "동료 TASK를 해제하고 탈출", "시설 업무를 미끼로 생성", "object", "mobile_filing_cabinet.png", "team_leader_front.png"),
    Sheet(1, "final", "수습 평가표", "A1:R12", "=HIDE(PENALTY_ROW) + PASTE(BONUS)", "hide.png", "평가 점수 75로 PASS 제출", "Manager VLOOKUP 재계산", "range", "evaluation_terminal.png", "manager_vlookup_front.png"),
    Sheet(1, "hidden", "ONBOARDING_RECOVERED.tmp", "A1:R12", "=HIDE(F) + PASTE(CABINET,K6)", "copy_paste.png", "ORIGINAL_ONBOARDING_ROW 복구", "F·J·N열 아코디언 압축", "columns", "copier_paper_box.png", "manager_vlookup_front.png"),

    Sheet(2, "sheet-01", "정렬되지 않은 출근줄", "A1:P10", "=SORT(F3:J3,RANK,ASC)", "sort.png", "직급 순서로 출근줄 정렬", "동급 직원 순서 유지", "range", "time_clock_terminal.png", "chief_countif_front.png"),
    Sheet(2, "sheet-02", "부서별 출입구", "A1:Q11", "=SORT(F3:H4,DEPARTMENT_CODE,ASC)", "sort.png", "HR 두 명을 그룹 센서에 배치", "부서별 앵커 이동", "range", "sensor_pad.png", "chief_countif_front.png"),
    Sheet(2, "sheet-03", "조건부 검문소", "A1:R11", "=FILTER(F3:J6,CLEARANCE>=2)", "filter.png", "허가된 직원만 남겨 통과", "LATE_STAFF 동적 필터", "range", "policy_scanner.png", "chief_countif_front.png"),
    Sheet(2, "sheet-04", "감사 대기열", "A1:R12", "=FILTER(TASK_QUEUE,TEAM_LEADER) → SORT", "filter.png", "DEPARTMENT_FIX를 최우선 처리", "DISPATCH 연결 20초", "range", "organization_chart.png", "chief_countif_front.png"),
    Sheet(2, "final", "표본 감사", "A1:R12", "=FILTER(DATE=TODAY) → SORT(STATUS)", "sort.png", "첫 5행을 COMPLIANT로 제출", "Chief COUNTIF 표본 재설정", "range", "approval_stamp.png", "chief_countif_front.png"),
    Sheet(2, "hidden", "SECURITY_POLICY_AUTOFILTER.tmp", "A1:R12", "=AUTOFILTER(DEPARTMENT)", "filter.png", "빈 부서 목표 행을 복구", "HR→OPS→SECURITY→ALL 순환", "columns", "security_turnstile.png", "chief_countif_front.png"),

    Sheet(3, "sheet-01", "문을 여는 직원", "A1:P10", "=IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN)", "if.png", "직원 이동으로 IF를 TRUE 전환", "FALSE → TRUE 단발 발동", "object", "sensor_pad.png", "director_iferror_front.png"),
    Sheet(3, "sheet-02", "지금 참, 나중에 참", "A1:R11", "=IF(PRINTER_F4.JAMMED,DOOR_H5.OPEN)", "if.png", "두 조건문으로 연속 문 개방", "즉시 TRUE와 지연 TRUE", "objects", "calc_recharge_node.png", "director_iferror_front.png"),
    Sheet(3, "sheet-03", "숨겨진 조건", "A1:Q11", "=HIDE(ROW_4) · IF PAUSED", "hide.png", "복원 직후 3초 문을 통과", "컨베이어와 IF 시간 정지", "row4", "copier_paper_box.png", "director_iferror_front.png"),
    Sheet(3, "sheet-04", "회의 소집.xlsm", "A1:S12", "=MACRO(MEETING_CALL) + IF(COUNT>=4)", "macro.png", "직원 네 명을 회의실에 소집", "우선순위 90 업무 생성", "range", "meeting_projector.png", "director_iferror_front.png"),
    Sheet(3, "final", "무한 업무 루프", "A1:T13", "=IF(AUTOMATION_ENABLED=FALSE)", "if.png", "LOOP_DEPTH를 0으로 종료", "Director IFERROR 업무 복구", "range", "server_rack.png", "director_iferror_front.png"),
    Sheet(3, "hidden", "AUTOMATION_AUTOFILL.tmp", "A1:S12", "=AUTOFILL(HIDE · SORT · IF)", "macro.png", "RECORDED_MASTER_ACTION 회수", "성공 함수가 4행 아래 재생", "mirror-v", "meeting_projector.png", "director_iferror_front.png"),

    Sheet(4, "sheet-01", "취소되지 않은 문", "A1:P10", "=PASTE(CART,G5) → UNDO", "undo.png", "복제만 취소하고 열린 문 유지", "장치 사건은 UNDO 밖에 유지", "object", "mobile_filing_cabinet.png", "auditor_ctrl_front.png"),
    Sheet(4, "sheet-02", "마지막 수정자", "A1:R11", "=IF(DOOR.OPEN) → PASTE(DECOY)", "if.png", "감사 대상을 미끼 상자로 전환", "6초 뒤 마지막 변경 복구", "objects", "copier_paper_box.png", "auditor_ctrl_front.png"),
    Sheet(4, "sheet-03", "겹쳐진 자리", "A1:S12", "=IF(REVIEW,RESTORE(CABINET_07))", "undo.png", "과거 위치로 복구해 엄폐 생성", "CURRENT와 PREVIOUS 고스트", "ghost", "mobile_filing_cabinet.png", "auditor_ctrl_front.png"),
    Sheet(4, "sheet-04", "내 행을 숨겨라", "A1:T12", "=HIDE(PLAYER_ROW)", "hide.png", "FULL ROW REVIEW를 세 번 회피", "자기 HIDE 중 월드 판정 제외", "player-row", "policy_scanner.png", "auditor_ctrl_front.png"),
    Sheet(4, "final", "승인되지 않은 수정", "A1:V14", "=PASTE(FORGED_APPROVAL)+IF+UNDO", "undo.png", "REVISION_ACCEPTED=FALSE 제출", "Auditor 최종 행 검토", "range", "approval_stamp.png", "auditor_ctrl_front.png"),
    Sheet(4, "hidden", "CONFLICTING_AUTOSAVE.tmp", "A1:T13", "=VERSION_A ↔ VERSION_B", "undo.png", "CONFLICT_MASTER_RECORD 복구", "8초마다 두 버전 교대", "mirror-h", "local_save_slot.png", "auditor_ctrl_front.png"),

    Sheet(5, "sheet-01", "이름 없는 해고 대상", "A1:P10", "=#NAME?(PLAYER)", "error_name.png", "인사 검색에서 10초간 제외", "손상도 +15 · 신원 복원 대기", "player", "policy_scanner.png", "vp_drop_front.png"),
    Sheet(5, "sheet-02", "멈춘 해고 작업", "A1:R11", "=#DIV/0!(DELETION_RANGE)", "error_div_zero.png", "셔터가 열린 순간 장치 정지", "손상도 +20 · 시간 5초 정지", "range", "approval_stamp.png", "vp_drop_front.png"),
    Sheet(5, "sheet-03", "잘못된 자료형", "A1:S12", "=#VALUE!(ARCHIVE_BOX_07,EMPLOYEE)", "error_value.png", "상자를 직원으로 오인시켜 문 개방", "손상도 +20 · 삭제 표적 변경", "object", "copier_paper_box.png", "vp_drop_front.png"),
    Sheet(5, "sheet-04", "삭제할 수 있는 것", "A1:T12", "=#REF!(ROW_LOCK_RELAY)", "error_ref.png", "참조를 끊어 세 문 FAIL OPEN", "손상도 +25 · 영구 삭제", "object", "root_lock.png", "vp_drop_front.png"),
    Sheet(5, "final", "해고 명령의 참조", "A1:W14", "=FILTER(CANONICAL_MATCH=TRUE) + #REF!", "error_ref.png", "TERMINATION_TARGET=#REF! 제출", "VP DROP 삭제 심사", "range", "evaluation_terminal.png", "vp_drop_front.png"),
    Sheet(5, "hidden", "RECOVERED_FROM_CRASH.tmp", "A1:U13", "=#NAME? → #DIV/0! → #VALUE! → #REF!", "error_div_zero.png", "CONTROLLED CRASH 서명 복구", "손상도 100에서 복구본 전환", "glitch", "server_rack.png", "vp_drop_front.png"),

    Sheet(6, "sheet-01", "선택된 셀만", "A1:R11", "=PASTE → SORT → HIDE", "select_cell.png", "SELECT_PERMISSION_KEY 회수", "세 LOCAL EXCEPTION RANGE", "zones", "permission_key.png", "manager_vlookup_front.png"),
    Sheet(6, "sheet-02", "수식은 여기서만", "A1:T12", "=IF(COUNT>=2,DOOR.OPEN) + SORT", "if.png", "FORMULA_PERMISSION_KEY 회수", "샌드박스와 원격 LINKED RANGE", "linked", "permission_key.png", "chief_countif_front.png"),
    Sheet(6, "sheet-03", "미리보기일 뿐", "A1:U13", "=DRAFT HIDE → DRAFT SORT → PASTE", "select_row.png", "첫 영구 WRITE_PERMISSION 생성", "버퍼 밖 결과 3초 뒤 복원", "draft", "local_save_slot.png", "director_iferror_front.png"),
    Sheet(6, "sheet-04", "저장되지 않은 변경", "A1:V13", "=HIDE + PASTE + IF(SAVE_REQUEST)", "save.png", "LOAD_LAST_FINAL 주기 중단", "12초마다 미저장 상태 복원", "save", "local_save_slot.png", "auditor_ctrl_front.png"),
    Sheet(6, "final", "통합 문서 보호 해제", "A1:X15", "=HIDE·PASTE·SORT·FILTER·MACRO·IF·UNDO·#REF!", "locked.png", "네 ROOT LOCK 해제 후 결말 선택", "관리자 다섯 규칙 통합", "root", "root_write_token.png", "vp_drop_front.png"),
    Sheet(6, "hidden", "UNKNOWN_COAUTHOR.tmp", "A1:W15", "=MIRROR(HIDE · IF · SORT · #REF!)", "error_ref.png", "BLUE·RED SIGNATURE 동시 제출", "L열 대칭 공동 작성자", "mirror-h", "root_lock.png", "auditor_ctrl_front.png"),
]


SESSION_COLORS = {
    1: ("#146b45", "#39d998", "#61767d"),
    2: ("#185b77", "#4cc4ef", "#667987"),
    3: ("#7a5419", "#f3b84c", "#706f68"),
    4: ("#68467c", "#d993ff", "#6d6b79"),
    5: ("#7d3039", "#ff6977", "#6f6668"),
    6: ("#333f75", "#7f98ff", "#626b86"),
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "malgunbd.ttf" if bold else "malgun.ttf"
    return ImageFont.truetype(Path("C:/Windows/Fonts") / name, size=size)


def put(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int, color: str, bold: bool = False) -> None:
    draw.text(xy, value, font=font(size, bold), fill=color)


def asset(canvas: Image.Image, base: Path, relative: str, center: tuple[int, int], box: tuple[int, int], opacity: int = 255) -> None:
    image = Image.open(base / relative).convert("RGBA")
    crop = image.getchannel("A").getbbox()
    if crop:
        image = image.crop(crop)
    scale = min(box[0] / image.width, box[1] / image.height)
    image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.NEAREST)
    if opacity < 255:
        image.putalpha(image.getchannel("A").point(lambda value: value * opacity // 255))
    canvas.alpha_composite(image, (center[0] - image.width // 2, center[1] - image.height // 2))


def furniture(canvas: Image.Image, relative: str, center: tuple[int, int], box: tuple[int, int], opacity: int = 255) -> None:
    asset(canvas, KEEPER / "furniture", relative, center, box, opacity)


def ref(canvas: Image.Image, relative: str, center: tuple[int, int], box: tuple[int, int], opacity: int = 255) -> None:
    asset(canvas, REF, relative, center, box, opacity)


def draw_panel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], title: str, color: str) -> None:
    draw.rounded_rectangle(box, radius=7, fill="#fafcfb", outline="#91a099", width=1)
    draw.rounded_rectangle((box[0], box[1], box[2], box[1] + 31), radius=7, fill=color)
    draw.rectangle((box[0], box[1] + 24, box[2], box[1] + 31), fill=color)
    put(draw, (box[0] + 11, box[1] + 6), title, 13, "#ffffff", True)


def draw_floorplan(
    draw: ImageDraw.ImageDraw,
    spec: Sheet,
    gx: int,
    gy: int,
    cw: int,
    ch: int,
    accent: str,
    wall_areas: list[tuple[int, int, int, int]],
) -> None:
    """Draw a different room graph for each sheet slot, with explicit door gaps."""
    wall_light = "#d9e1dc"
    wall_dark = "#66756e"
    partition = "#aab7b0"
    door_floor = "#26342e"
    session_shift = (spec.session - 1) % 3
    security_orientation, security_column, security_row, _ = door_anchors(spec)

    def door_marker_vertical(column: int, row: int) -> None:
        x = gx + cw * column
        y = gy + ch * row
        draw.rectangle((x - 5, y + 8, x + 9, y + ch - 8), fill=door_floor)
        draw.line((x - 5, y + 8, x + 9, y + 8), fill=wall_dark, width=2)
        draw.line((x - 5, y + ch - 8, x + 9, y + ch - 8), fill=wall_dark, width=2)

    def door_marker_horizontal(row: int, column: int) -> None:
        x = gx + cw * column
        y = gy + ch * row
        draw.rectangle((x + 9, y - 5, x + cw - 9, y + 9), fill=door_floor)
        draw.line((x + 9, y - 5, x + 9, y + 9), fill=wall_dark, width=2)
        draw.line((x + cw - 9, y - 5, x + cw - 9, y + 9), fill=wall_dark, width=2)

    def wall_v(column: int, door_rows: set[int], start: int = 0, end: int = 10, thin: bool = False) -> None:
        x = gx + cw * column
        width = 3 if thin else 7
        color = partition if thin else wall_light
        for row in range(start, end):
            if row in door_rows:
                if security_orientation == "vertical" and column == security_column and row == security_row:
                    # The locked door sprite is rendered later; leave only one dark
                    # wall opening here so it does not look like two stacked doors.
                    y = gy + ch * row
                    draw.rectangle((x - 5, y + 8, x + 9, y + ch - 8), fill=door_floor)
                else:
                    door_marker_vertical(column, row)
                continue
            y = gy + ch * row
            draw.rectangle((x, y, x + width, y + ch), fill=color)
            draw.line((x + width, y, x + width, y + ch), fill=wall_dark, width=1)
            wall_areas.append((x, y, x + width + 1, y + ch))

    def wall_h(row: int, door_columns: set[int], start: int = 0, end: int = 14, thin: bool = False) -> None:
        y = gy + ch * row
        height = 3 if thin else 7
        color = partition if thin else wall_light
        for column in range(start, end):
            if column in door_columns:
                if security_orientation == "horizontal" and column == security_column and row == security_row:
                    x = gx + cw * column
                    draw.rectangle((x + 9, y - 5, x + cw - 9, y + 9), fill=door_floor)
                else:
                    door_marker_horizontal(row, column)
                continue
            x = gx + cw * column
            draw.rectangle((x, y, x + cw, y + height), fill=color)
            draw.line((x, y + height, x + cw, y + height), fill=wall_dark, width=1)
            wall_areas.append((x, y, x + cw, y + height + 1))

    meeting_table_center: tuple[int, int] | None = None
    if spec.slot == "sheet-01":
        # Three departments connected by two staggered controlled doors.
        wall_v(5 + session_shift, {6 + session_shift % 2})
        wall_v(10, {2 + session_shift})
        wall_h(4, {11 + session_shift % 2}, start=10, end=14, thin=True)
    elif spec.slot == "sheet-02":
        # A central corridor with offices above and service rooms below.
        wall_h(4, {2 + session_shift, 9 + session_shift})
        wall_h(7, {5 + session_shift, 12})
        wall_v(8 + session_shift % 2, {5}, start=4, end=10, thin=True)
    elif spec.slot == "sheet-03":
        # Nested records room: only one security-door approach.
        wall_v(7 + session_shift, {5})
        wall_v(12, {4 + session_shift % 2}, start=1, end=8)
        wall_h(2, {9 + session_shift}, start=7 + session_shift, end=13)
        wall_h(8, {10}, start=7 + session_shift, end=13)
    elif spec.slot == "sheet-04":
        # Meeting suite, copier room and a narrow cross-corridor.
        wall_v(6, {5 + session_shift % 2})
        wall_h(6, {2 + session_shift, 10 + session_shift % 2})
        wall_v(11, {3 + session_shift}, start=0, end=6, thin=True)
        wall_h(3, {8}, start=6, end=11, thin=True)
    elif spec.slot == "final":
        # Sequential manager chambers; each lock has one distinct doorway.
        wall_v(4, {2 + session_shift})
        wall_v(7, {7 - session_shift})
        wall_v(10, {3 + session_shift})
        wall_h(5, {1 + session_shift, 8, 12}, thin=True)
    else:
        # Hidden sheets use mirrored/staggered rooms with deliberately odd routes.
        wall_v(4, {2 + session_shift, 8 - session_shift})
        wall_v(7, {5})
        wall_v(10, {2 + session_shift, 8 - session_shift})
        wall_h(3 + session_shift % 2, {2, 6, 11}, thin=True)
        wall_h(7 - session_shift % 2, {3, 8, 12}, thin=True)

    # EXIT is always attached to the outside wall. Its cell is an alcove connected
    # to the nearest room, rather than a door sprite floating in open floor space.
    _, _, _, exit_row = door_anchors(spec)
    right = gx + cw * 14
    exit_y = gy + ch * exit_row
    draw.rectangle((right - 7, exit_y + 5, right + 1, exit_y + ch - 5), fill=door_floor)
    draw.line((right - cw, exit_y, right - cw, exit_y + 12), fill=wall_light, width=5)
    draw.line((right - cw, exit_y + ch - 12, right - cw, exit_y + ch), fill=wall_light, width=5)
    draw.rectangle((right - cw + 5, exit_y + 5, right - 8, exit_y + ch - 5), outline=accent, width=2)


def door_anchors(spec: Sheet) -> tuple[str, int, int, int]:
    """Return a real wall opening for the security door and a clear outer EXIT row."""
    shift = (spec.session - 1) % 3
    if spec.slot == "sheet-01":
        security = ("vertical", 10, 2 + shift)
        exit_row = 8
    elif spec.slot == "sheet-02":
        # Use the vertical corridor wall so the front-facing door sprite has a
        # believable frame instead of lying across a horizontal partition.
        security = ("vertical", 8 + shift % 2, 5)
        exit_row = 5
    elif spec.slot == "sheet-03":
        security = ("vertical", 7 + shift, 5)
        exit_row = 4 + shift % 2
    elif spec.slot == "sheet-04":
        security = ("vertical", 6, 5 + shift % 2)
        exit_row = 4 + shift % 2
    elif spec.slot == "final":
        security = ("vertical", 10, 3 + shift)
        exit_row = 4 + shift % 2
    else:
        security = ("vertical", 10, 2 + shift)
        exit_row = 4 + shift % 2
    orientation, column, row = security
    return orientation, column, row, exit_row


def selection_rect(spec: Sheet, gx: int, gy: int, cw: int, ch: int) -> tuple[int, int, int, int]:
    kind = spec.selection
    if kind in {"row", "player-row"}:
        return gx, gy + ch * 5, gx + cw * 14, gy + ch * 6
    if kind == "row4":
        return gx, gy + ch * 3, gx + cw * 14, gy + ch * 4
    if kind in {"column", "columns"}:
        return gx + cw * 7, gy, gx + cw * 8, gy + ch * 10
    if kind in {"object", "objects", "player"}:
        return gx + cw * 5, gy + ch * 5, gx + cw * 7, gy + ch * 7
    if kind in {"mirror-h", "mirror-v", "glitch", "root"}:
        return gx + cw * 4, gy + ch * 2, gx + cw * 10, gy + ch * 8
    if kind in {"zones", "linked", "draft", "save"}:
        return gx + cw * 2, gy + ch * 6, gx + cw * 7, gy + ch * 9
    return gx + cw * 4, gy + ch * 2, gx + cw * 9, gy + ch * 6


def draw_layout(
    canvas: Image.Image,
    spec: Sheet,
    gx: int,
    gy: int,
    cw: int,
    ch: int,
    wall_areas: list[tuple[int, int, int, int]],
) -> None:
    shift = (spec.session - 1) % 3
    orientation, door_column, door_row, exit_row = door_anchors(spec)
    if orientation == "vertical":
        security_center = (gx + cw * door_column, gy + ch * door_row + ch // 2)
        security_box = (40, ch - 4)
    else:
        security_center = (gx + cw * door_column + cw // 2, gy + ch * door_row)
        security_box = (cw - 10, 42)
    exit_center = (gx + cw * 14 - 31, gy + ch * exit_row + ch // 2)
    exit_box = (58, 84)
    solid_areas: list[tuple[int, int, int, int]] = []
    actor_areas: list[tuple[int, int, int, int]] = []
    meeting_macro_active = spec.session == 3 and spec.slot == "sheet-04"
    desk_occupants = [
        "coworker_back.png",
        "team_leader_back.png",
        "coworker_back.png",
        "junior_employee_back.png",
        "coworker_back.png",
        "coworker_back.png",
    ]
    desk_occupant_index = 0

    def rect(center: tuple[int, int], box: tuple[int, int], padding: int = 0) -> tuple[int, int, int, int]:
        return (
            center[0] - box[0] // 2 - padding,
            center[1] - box[1] // 2 - padding,
            center[0] + box[0] // 2 + padding,
            center[1] + box[1] // 2 + padding,
        )

    door_clearance = [rect(security_center, security_box, 8), rect(exit_center, exit_box, 8)]
    entrance_zone = (
        gx + cw * 11,
        max(gy + 7, gy + ch * (exit_row - 1)),
        gx + cw * 14 - 7,
        min(gy + ch * 10 - 7, gy + ch * (exit_row + 2)),
    )
    furniture_reserved = [entrance_zone]
    if spec.slot == "sheet-02":
        # Keep the main office circulation corridor clear between the two room rows.
        furniture_reserved.append((gx + 7, gy + ch * 4 + 8, gx + cw * 14 - 7, gy + ch * 7 - 8))

    def overlaps(left: tuple[int, int, int, int], right: tuple[int, int, int, int]) -> bool:
        return left[0] < right[2] and left[2] > right[0] and left[1] < right[3] and left[3] > right[1]

    def clear_center(
        center: tuple[int, int],
        box: tuple[int, int],
        extra_reserved: list[tuple[int, int, int, int]] | None = None,
    ) -> tuple[int, int]:
        """Move scenery and actors away from door leaves and approach cells."""
        x, y = center
        # Layout declarations use logical cell coordinates. Convert any grid-line
        # coordinate to the center of that cell before testing against wall edges.
        if (x - gx) % cw == 0:
            x += cw // 2
        if (y - gy) % ch == 0:
            y += ch // 2
        offsets = [(0, 0)]
        for radius in range(1, 6):
            offsets.extend(
                (dx, dy)
                for dx, dy in [
                    (-radius, 0),
                    (0, radius),
                    (0, -radius),
                    (radius, 0),
                    (-radius, radius),
                    (-radius, -radius),
                    (radius, radius),
                    (radius, -radius),
                ]
            )
        candidates = [(x + dx * cw, y + dy * ch) for dx, dy in offsets]
        fallback_cells = [
            (gx + column * cw + cw // 2, gy + row * ch + ch // 2)
            for row in range(10)
            for column in range(14)
        ]
        fallback_cells.sort(key=lambda candidate: abs(candidate[0] - x) + abs(candidate[1] - y))
        candidates.extend(candidate for candidate in fallback_cells if candidate not in candidates)
        reserved_areas = door_clearance + wall_areas + (extra_reserved or [])
        for candidate in candidates:
            candidate_rect = rect(candidate, box)
            inside = (
                candidate_rect[0] >= gx + 7
                and candidate_rect[1] >= gy + 7
                and candidate_rect[2] <= gx + cw * 14 - 7
                and candidate_rect[3] <= gy + ch * 10 - 7
            )
            if inside and not any(overlaps(candidate_rect, reserved) for reserved in reserved_areas):
                return candidate
        raise ValueError(f"No door-safe placement for Session {spec.session} {spec.slot}: {center} {box}")

    def place_furniture(relative: str, center: tuple[int, int], box: tuple[int, int], opacity: int = 255) -> tuple[int, int]:
        chosen = clear_center(center, box, solid_areas + furniture_reserved)
        furniture(canvas, relative, chosen, box, opacity)
        solid_areas.append(rect(chosen, box, 2))
        return chosen

    def place_ref(relative: str, center: tuple[int, int], box: tuple[int, int], opacity: int = 255) -> tuple[int, int]:
        is_character = relative.startswith("characters/")
        is_wall_fixture = relative.startswith("devices/cctv_")
        avoidance_box = (box[0] + 8, box[1] + 8) if is_character else box
        reserved = solid_areas + actor_areas if is_character else ([] if is_wall_fixture else solid_areas)
        chosen = clear_center(center, avoidance_box, reserved)
        ref(canvas, relative, chosen, box, opacity)
        if is_character:
            actor_areas.append(rect(chosen, avoidance_box, 2))
        elif not is_wall_fixture:
            solid_areas.append(rect(chosen, box, 2))
        return chosen

    def workstation(column: int, row: int, chair_down: bool = True) -> None:
        nonlocal desk_occupant_index
        group_box = (cw * 2 - 4, ch * 2 - 4)
        x, y = clear_center((gx + cw * column, gy + ch * row), group_box, solid_areas + furniture_reserved)
        chair_y = y + 34 if chair_down else y - 34
        furniture(canvas, "office_chair_green.png", (x, chair_y), (38, 38))
        if not meeting_macro_active:
            occupant = desk_occupants[desk_occupant_index % len(desk_occupants)]
            desk_occupant_index += 1
            # Chair → seated employee → desk produces a compact seated pose while
            # preserving the existing directional character art.
            ref(canvas, f"characters/{occupant}", (x, y - 10), (38, 58))
        furniture(canvas, "office_desk.png", (x, y), (cw * 2 - 10, ch - 4))
        furniture(canvas, "computer_monitor.png", (x + 20, y - 12), (32, 24))
        solid_areas.append(rect((x, y), group_box, 2))

    if spec.slot == "sheet-01":
        for column, row in [(2, 2), (4, 2), (2, 5), (4, 5 + shift % 2)]:
            workstation(column, row)
        place_furniture("executive_desk.png", (gx + cw * 8, gy + ch * 2), (cw * 2, ch + 8))
        place_furniture("conference_table_set.png", (gx + cw * 12, gy + ch * 6), (cw * 3, ch * 2))
    elif spec.slot == "sheet-02":
        for column, row in [(2, 2), (5, 2), (9, 2), (12, 2), (3 + shift, 6), (10, 8)]:
            workstation(column, row, row < 5)
        place_furniture("office_sofa.png", (gx + cw * 12, gy + ch * 6), (cw * 2, ch))
    elif spec.slot == "sheet-03":
        for column, row in [(2, 2), (4, 2), (2, 6), (5, 8)]:
            workstation(column, row)
        place_furniture("executive_desk.png", (gx + cw * 10, gy + ch * 3), (cw * 2, ch + 8))
        place_furniture("bookshelf.png", (gx + cw * 11, gy + ch * 6), (52, 66))
        place_furniture("filing_cabinet.png", (gx + cw * 9, gy + ch * 6), (38, 70))
    elif spec.slot == "sheet-04":
        workstation(2, 2)
        workstation(4, 2)
        workstation(3 + shift, 8, False)
        meeting_table_center = place_furniture("conference_table_set.png", (gx + cw * 9, gy + ch * 4), (cw * 4, ch * 2))
        place_furniture("copier_printer.png", (gx + cw * 2, gy + ch * 7), (60, 66))
        place_furniture("filing_cabinet.png", (gx + cw * 5, gy + ch * 7), (38, 70))
    elif spec.slot == "final":
        workstation(2, 2)
        workstation(5, 7, False)
        place_furniture("executive_desk.png", (gx + cw * 8, gy + ch * 2), (cw * 2, ch + 8))
        place_furniture("conference_table_set.png", (gx + cw * 12, gy + ch * 7), (cw * 3, ch * 2))
        place_furniture("bookshelf.png", (gx + cw * 11, gy + ch * 2), (48, 62))
    else:
        # Hidden sheets intentionally mirror or alternate workstations.
        for column, row in [(2, 2), (5, 2 + shift), (9, 7 - shift), (12, 7)]:
            workstation(column, row, row < 5)
        place_furniture("conference_table_set.png", (gx + cw * 7, gy + ch * 5), (cw * 3, ch * 2), 185)

    # Service furniture shifts with every session so even matching room templates differ.
    place_furniture("copier_printer.png", (gx + cw * (1 + shift), gy + ch * 8), (58, 64))
    place_furniture("filing_cabinet.png", (gx + cw * (3 + shift), gy + ch * 8), (36, 68))
    place_furniture("bookshelf.png", (gx + cw * 13, gy + ch * (1 + shift)), (46, 60))
    place_furniture("potted_plant.png", (gx + cw * (12 - shift), gy + ch * 8), (38, 52))

    # Core props use believable office zones instead of arbitrary cells.
    if spec.prop in {"security_turnstile.png", "office_elevator.png", "time_clock_terminal.png", "policy_scanner.png"}:
        prop_column, prop_row = 11, exit_row
    elif spec.prop in {"meeting_projector.png"}:
        prop_column, prop_row = 9, 3
    elif spec.prop in {"copier_paper_box.png", "mobile_filing_cabinet.png"}:
        prop_column, prop_row = 2 + shift, 7
    elif spec.prop in {"server_rack.png", "root_lock.png", "root_write_token.png", "local_save_slot.png", "permission_key.png"}:
        prop_column, prop_row = 11, 6
    elif spec.prop in {"evaluation_terminal.png", "approval_stamp.png", "organization_chart.png"}:
        prop_column, prop_row = 11, 2
    elif spec.prop in {"sensor_pad.png", "calc_recharge_node.png"}:
        prop_column, prop_row = max(1, door_column - 1), door_row
    else:
        prop_column, prop_row = 9, 7
    place_ref(f"props/{spec.prop}", (gx + cw * prop_column, gy + ch * prop_row), (58, 70))

    # Doors are derived from the floorplan's actual openings. The large locked
    # security door can no longer land on a desk, chair or loose prop.
    ref(canvas, "devices/security_door_locked.png", security_center, security_box)

    # The EXIT uses the established Office Keeper front-facing asset, but is
    # recessed into the right exterior wall and shown locked in mid-Sheet mocks.
    furniture(canvas, "exit_door.png", exit_center, exit_box)
    draw = ImageDraw.Draw(canvas)
    label_box = (exit_center[0] - 54, exit_center[1] - 47, exit_center[0] + 25, exit_center[1] - 30)
    draw.rounded_rectangle(label_box, radius=3, fill="#52272b", outline="#ff7a82", width=1)
    put(draw, (label_box[0] + 7, label_box[1] + 2), "EXIT · LOCKED", 8, "#ffffff", True)
    if spec.session >= 2:
        place_ref("devices/cctv_camera_active.png", (gx + cw * 8, gy + ch * 1), (48, 42))
    if spec.session >= 5:
        place_ref("devices/computer_terminal_ref_error.png", (gx + cw * 3, gy + ch * 8), (52, 50))

    # Cast and manager for the session.
    player_column = 2 + (spec.session + len(spec.slot)) % 5
    place_ref("characters/junior_employee_right.png", (gx + cw * player_column, gy + ch * 8), (48, 70))
    guard_column = 7 + (spec.session + len(spec.title)) % 3
    guard_row = 3 + (spec.session + len(spec.slot)) % 3
    guard_x, guard_y = place_ref("characters/security_left.png", (gx + cw * guard_column, gy + ch * guard_row), (48, 70))
    if spec.slot in {"final", "hidden"}:
        place_ref(f"characters/{spec.boss}", (gx + cw * (10 + shift), gy + ch * (3 + shift)), (48, 70))
    elif meeting_macro_active:
        # The MEETING_CALL macro replaces normal seated work with four employees
        # travelling to or waiting around the meeting room.
        meeting_staff = [
            ("coworker_right.png", 6, 4),
            ("team_leader_front.png", 8, 3),
            ("coworker_left.png", 11, 4),
            ("junior_employee_back.png", 8, 7),
        ]
        moving_staff: list[tuple[int, int]] = []
        for relative, column, row in meeting_staff:
            moving_staff.append(place_ref(f"characters/{relative}", (gx + cw * column, gy + ch * row), (42, 62)))
        if meeting_table_center:
            task_overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            td = ImageDraw.Draw(task_overlay)
            target_x, target_y = meeting_table_center
            for index, (staff_x, staff_y) in enumerate(moving_staff):
                destination = (target_x - 70 + index * 46, target_y + (58 if index % 2 == 0 else -58))
                td.line((staff_x, staff_y, destination[0], destination[1]), fill=(255, 204, 82, 145), width=2)
                td.polygon(
                    [
                        destination,
                        (destination[0] - 7, destination[1] - 4),
                        (destination[0] - 7, destination[1] + 4),
                    ],
                    fill=(255, 204, 82, 190),
                )
            canvas.alpha_composite(task_overlay)
            draw = ImageDraw.Draw(canvas)
            draw.rounded_rectangle((gx + cw * 6, gy + ch * 1, gx + cw * 9, gy + ch * 1 + 22), radius=4, fill="#5a4318")
            put(draw, (gx + cw * 6 + 10, gy + ch * 1 + 4), "MEETING TASK · MOVING", 9, "#ffe4a1", True)

    # Guard sight cone.
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.polygon([(guard_x, guard_y), (guard_x - cw * 2, guard_y - ch), (guard_x - cw * 2, guard_y + ch)], fill=(255, 210, 80, 42), outline=(255, 223, 116, 125))
    canvas.alpha_composite(overlay)

    # A few layout-specific visual cues.
    draw = ImageDraw.Draw(canvas)
    if spec.selection in {"mirror-h", "root"}:
        axis_x = gx + cw * 7
        draw.line((axis_x, gy, axis_x, gy + ch * 10), fill="#ff7e9f", width=3)
    if spec.selection == "mirror-v":
        axis_y = gy + ch * 5
        draw.line((gx, axis_y, gx + cw * 14, axis_y), fill="#ffb35e", width=3)
    if spec.selection == "ghost":
        place_furniture("filing_cabinet.png", (gx + cw * 9, gy + ch * 5), (46, 80), 90)
    if spec.selection == "root":
        for x_offset in (7, 9, 11, 13):
            place_ref("props/root_lock.png", (gx + cw * x_offset, gy + ch * 6), (42, 42))
    if spec.selection in {"zones", "linked", "draft", "save"}:
        draw.rounded_rectangle((gx + cw * 2, gy + ch * 6, gx + cw * 7, gy + ch * 9), radius=5, outline="#79f2e1", width=3)
        if spec.selection == "linked":
            draw.line((gx + cw * 7, gy + ch * 7, gx + cw * 11, gy + ch * 3), fill="#79f2e1", width=2)


def build_sheet(spec: Sheet, edit_mode: bool = True) -> Image.Image:
    deep, accent, floor = SESSION_COLORS[spec.session]
    if spec.slot == "hidden":
        deep, accent, floor = "#33243d", "#ff6ed1", "#5c5262"
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), "#e8eeea")
    draw = ImageDraw.Draw(canvas)

    # App and formula bars.
    draw.rectangle((0, 0, WIDTH, 30), fill="#0d5935")
    put(draw, (15, 5), "CELL WORLD", 12, "#ffffff", True)
    put(draw, (106, 6), f"Cell Office: #REF! · SESSION_{spec.session}.xlsx", 10, "#d9eee3")
    draw.rectangle((0, 30, WIDTH, 70), fill="#f7f9f8", outline="#bcc7c1")
    draw.rectangle((16, 39, 58, 62), fill="#eef3f0", outline="#aab7b0")
    put(draw, (28, 42), "fx", 12, "#355a47", True)
    draw.rectangle((66, 39, 954, 62), fill="#ffffff", outline="#aab7b0")
    shown_formula = spec.formula if len(spec.formula) <= 52 else spec.formula[:49] + "…"
    if not edit_mode:
        shown_formula = "이동 모드 · WASD 이동 · SPACE 편집 모드"
    put(draw, (78, 42), shown_formula, 12, "#173e2b", True)
    draw.rounded_rectangle((966, 38, 1068, 63), radius=4, fill="#e7f4ec", outline=deep)
    put(draw, (985, 42), "미리보기", 11, deep, True)
    draw.rounded_rectangle((1076, 38, 1262, 63), radius=4, fill=deep)
    put(draw, (1115, 42), "ENTER · 실행", 11, "#ffffff", True)

    # Stage and grid.
    draw.rectangle((20, 70, 975, 680), fill="#16221c")
    draw.rectangle((975, 70, WIDTH, 680), fill="#eef2f0")
    gx, gy, cw, ch = 53, 105, 63, 46
    grid_w, grid_h = cw * 14, ch * 10
    for col in range(14):
        x = gx + col * cw
        if edit_mode:
            draw.rectangle((x, gy - 23, x + cw, gy), fill="#dce4df", outline="#a6b2ac")
            put(draw, (x + 26, gy - 20), chr(65 + col), 10, "#40564b", True)
    for row in range(10):
        y = gy + row * ch
        if edit_mode:
            draw.rectangle((gx - 26, y, gx, y + ch), fill="#dce4df", outline="#a6b2ac")
            put(draw, (gx - 19, y + 14), str(row + 1), 10, "#40564b", True)
        for col in range(14):
            x = gx + col * cw
            shade = floor if (row + col) % 2 == 0 else tuple(max(0, int(floor[i:i+2], 16) - 5) for i in (1, 3, 5))
            if isinstance(shade, tuple):
                shade = "#" + "".join(f"{v:02x}" for v in shade)
            draw.rectangle((x, y, x + cw, y + ch), fill=shade, outline="#819096")

    # Outer walls and a sheet-specific network of rooms, corridors and doors.
    draw.rectangle((gx, gy, gx + grid_w, gy + 5), fill="#d6ded9")
    draw.rectangle((gx, gy + grid_h - 5, gx + grid_w, gy + grid_h), fill="#6f7d76")
    draw.rectangle((gx, gy, gx + 5, gy + grid_h), fill="#d6ded9")
    draw.rectangle((gx + grid_w - 5, gy, gx + grid_w, gy + grid_h), fill="#6f7d76")
    _, _, _, exit_row = door_anchors(spec)
    right = gx + grid_w
    bottom = gy + grid_h
    exit_y = gy + ch * exit_row
    wall_areas: list[tuple[int, int, int, int]] = [
        (gx, gy, right, gy + 6),
        (gx, bottom - 6, right, bottom),
        (gx, gy, gx + 6, bottom),
        (right - 6, gy, right, exit_y + 5),
        (right - 6, exit_y + ch - 5, right, bottom),
    ]
    draw_floorplan(draw, spec, gx, gy, cw, ch, accent, wall_areas)

    draw_layout(canvas, spec, gx, gy, cw, ch, wall_areas)
    draw = ImageDraw.Draw(canvas)

    # Function target overlay exists only while the player is in edit mode.
    if edit_mode:
        rect = selection_rect(spec, gx, gy, cw, ch)
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rectangle(rect, fill=(*ImageColor_getrgb(accent), 38), outline=accent, width=3)
        canvas.alpha_composite(overlay)
        draw = ImageDraw.Draw(canvas)
        draw.rounded_rectangle((rect[0] + 7, rect[1] + 7, min(rect[0] + 151, rect[2] - 5), rect[1] + 31), radius=4, fill=deep)
        put(draw, (rect[0] + 16, rect[1] + 10), "FUNCTION TARGET", 9, "#ffffff", True)

    # Stage chips.
    draw.rounded_rectangle((35, 77, 244, 101), radius=4, fill=deep, outline=accent)
    slot_label = "HIDDEN" if spec.slot == "hidden" else ("FINAL" if spec.slot == "final" else spec.slot.replace("sheet-", "SHEET "))
    put(draw, (47, 81), f"SESSION {spec.session} · {slot_label}", 10, "#ffffff", True)
    draw.rounded_rectangle((714, 77, 958, 101), radius=4, fill=deep, outline=accent)
    mode_label = f"{spec.grid} · EDIT MODE 20% · 선택 표시는 편집 중에만" if edit_mode else "MOVEMENT MODE · 격자와 선택 범위 숨김"
    put(draw, (728, 81), mode_label, 9, "#ffffff", True)

    # Compact function dock, replaced by simple controls during movement.
    draw.rounded_rectangle((125, 582, 865, 667), radius=8, fill="#101914", outline="#506259")
    if edit_mode:
        put(draw, (140, 592), "FUNCTION", 9, "#91aa9e", True)
        dock_icons = [(spec.icon, "ACTIVE"), ("copy_paste.png", "COPY"), ("sort.png", "SORT"), ("if.png", "IF"), ("undo.png", "UNDO")]
        for index, (icon, label) in enumerate(dock_icons):
            left = 220 + index * 122
            selected = index == 0
            draw.rounded_rectangle((left, 590, left + 108, 654), radius=6, fill=deep if selected else "#202c26", outline=accent if selected else "#56685f", width=2)
            icon_path = f"ui/functions/{icon}" if (REF / "ui/functions" / icon).exists() else f"ui/status/{icon}"
            ref(canvas, icon_path, (left + 29, 622), (36, 36))
            put(draw, (left + 53, 606), str(index + 1) if index < 4 else "Z", 9, "#a8bdb3", True)
            put(draw, (left + 53, 624), label, 9, "#ffffff", True)
    else:
        put(draw, (151, 600), "MOVEMENT", 10, "#91aa9e", True)
        put(draw, (262, 601), "WASD", 14, "#ffffff", True)
        put(draw, (325, 603), "이동", 11, "#c5d8ce")
        put(draw, (437, 601), "E", 14, "#ffffff", True)
        put(draw, (460, 603), "상호작용", 11, "#c5d8ce")
        put(draw, (600, 601), "SPACE", 14, accent, True)
        put(draw, (660, 603), "편집 모드", 11, "#c5d8ce")
        put(draw, (262, 630), "격자·좌표·함수 선택 범위는 편집 모드에서만 표시", 10, "#91aa9e")

    # Right HUD.
    draw_panel(draw, (992, 86, 1263, 206), "SHEET BRIEF", deep)
    put(draw, (1005, 126), spec.title, 17 if len(spec.title) < 19 else 14, "#173e2b", True)
    put(draw, (1005, 153), spec.goal, 10, "#53655b")
    draw.rectangle((1005, 180, 1248, 188), fill="#d9e2dd")
    draw.rectangle((1005, 180, 1090 + spec.session * 12, 188), fill=accent)
    put(draw, (1005, 191), "목표 진행 · 1 / 3", 9, "#5c6d64", True)

    draw_panel(draw, (992, 218, 1263, 345), "STATUS", deep)
    ref(canvas, "ui/functions/calc.png", (1028, 270), (38, 38))
    put(draw, (1056, 242), "CALC", 9, "#697a71", True)
    put(draw, (1056, 258), "5", 24, deep, True)
    ref(canvas, "ui/status/compliant.png", (1021, 313), (24, 24))
    put(draw, (1040, 304), "COMPLIANT", 10, "#226644", True)
    if spec.session >= 5:
        ref(canvas, "ui/status/damage.png", (1153, 313), (24, 24))
        put(draw, (1172, 304), f"손상 {15 + (spec.session - 5) * 10}", 9, "#9b3943", True)
    else:
        ref(canvas, "ui/status/alert_1.png", (1153, 313), (24, 24))
        put(draw, (1172, 304), "ALERT 0", 9, "#7c5a1f", True)

    draw_panel(draw, (992, 357, 1263, 482), "SHEET RULE", deep)
    ref(canvas, f"ui/functions/{spec.icon}" if (REF / "ui/functions" / spec.icon).exists() else f"ui/status/{spec.icon}", (1028, 414), (42, 42))
    put(draw, (1057, 389), spec.gimmick, 10 if len(spec.gimmick) < 23 else 9, deep, True)
    put(draw, (1057, 416), f"범위 {spec.grid}", 9, "#617269")
    put(draw, (1007, 452), "실행 전에 대상·비용·복원 결과 표시", 9, "#617269")

    preview_title = "EXECUTION PREVIEW" if edit_mode else "MOVEMENT INFO"
    draw_panel(draw, (992, 494, 1263, 657), preview_title, "#574282" if spec.slot != "hidden" else "#76296a")
    preview = shown_formula if len(shown_formula) <= 34 else shown_formula[:31] + "…"
    put(draw, (1005, 531), preview, 10, "#34265a", True)
    if edit_mode:
        put(draw, (1005, 558), "✓ 목표 경로 생성", 10, "#29744e", True)
        put(draw, (1005, 582), "✓ 감시 판정 변화 미리보기", 10, "#29744e", True)
        put(draw, (1005, 606), "! 실행 후 복원 위치 확인", 10, "#a26022", True)
        put(draw, (1005, 631), "ENTER · 실행 확정", 9, "#6d5c8a", True)
    else:
        put(draw, (1005, 558), "✓ 벽과 파티션은 충돌 처리", 10, "#29744e", True)
        put(draw, (1005, 582), "✓ 초록 문턱으로만 방 이동", 10, "#29744e", True)
        put(draw, (1005, 606), "SPACE · 편집 모드 진입", 10, "#6d5c8a", True)

    # Persistent global sheet tabs remain outside the game stage.
    draw.rectangle((0, 680, WIDTH, 710), fill="#f5f8f6", outline="#b8c3bd")
    labels = [(55, "Game Select", False), (165, "RPG Map", False), (265, "Office", True), (365, "Defence", False)]
    for left, label, active in labels:
        draw.rectangle((left, 680, left + 100, 710), fill="#ffffff" if active else "#f5f8f6", outline="#d5ded9")
        if active:
            draw.rectangle((left, 680, left + 100, 683), fill="#16804d")
        put(draw, (left + 14, 689), label, 9, "#155d39" if active else "#56645c", active)
    draw.rectangle((0, 710, WIDTH, 720), fill="#fbfcfb")
    return canvas.convert("RGB")


def ImageColor_getrgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))  # type: ignore[return-value]


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    generated: dict[int, list[tuple[Sheet, Path]]] = {session: [] for session in range(1, 7)}
    for spec in SHEETS:
        folder = OUTPUT / f"session-{spec.session:02d}"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{spec.slot}.png"
        build_sheet(spec).save(path, quality=94)
        generated[spec.session].append((spec, path))

    build_sheet(SHEETS[0], edit_mode=False).save(OUTPUT / "movement-mode-example.png", quality=94)

    # Six-up session boards for fast visual review.
    for session, items in generated.items():
        deep, accent, _ = SESSION_COLORS[session]
        board = Image.new("RGB", (1920, 790), "#101813")
        board_draw = ImageDraw.Draw(board)
        board_draw.rectangle((0, 0, 1920, 70), fill=deep)
        put(board_draw, (28, 16), f"CELL OFFICE: #REF! · SESSION {session} SHEET MOCKUPS", 25, "#ffffff", True)
        put(board_draw, (1450, 22), "4 SHEETS · FINAL · HIDDEN", 15, accent, True)
        for index, (spec, path) in enumerate(items):
            image = Image.open(path).convert("RGB").resize((640, 360), Image.Resampling.LANCZOS)
            x = (index % 3) * 640
            y = 70 + (index // 3) * 360
            board.paste(image, (x, y))
            board_draw.rectangle((x + 8, y + 8, x + 245, y + 34), fill="#101813")
            put(board_draw, (x + 16, y + 12), f"{spec.slot.upper()} · {spec.title}", 10, "#ffffff", True)
        board.save(OUTPUT / f"session-{session:02d}-board.png", quality=94)

    print(f"Generated {len(SHEETS)} sheet mockups and 6 session boards in {OUTPUT}")


if __name__ == "__main__":
    main()
