from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import textwrap

from PIL import Image, ImageDraw, ImageFont

from build_office_ref_session_sheet_mockups import REF, ROOT, SESSION_COLORS, SHEETS


OUTPUT = ROOT / "docs/mockups/office-ref-patches"
RULES = ROOT / "docs/CELL_OFFICE_CORE_RULES.md"
SHEET_MOCKUPS = ROOT / "docs/mockups/office-ref-sheets"
WIDTH, HEIGHT = 1600, 900


@dataclass(frozen=True)
class PatchCard:
    category: str
    name: str
    effect: str


@dataclass(frozen=True)
class PatchScreen:
    session: int
    sheet: int
    completed_title: str
    next_title: str
    next_slot: str
    cards: tuple[PatchCard, ...]


CATEGORY_STYLE = {
    "FORMULA": ("#137f78", "#dff7f3", "ui/status/patch_formula.png"),
    "SYSTEM": ("#225f9b", "#e1effb", "ui/status/patch_system.png"),
    "RISK": ("#9d316f", "#f9e1f0", "ui/status/patch_risk.png"),
    "REPAIR": ("#397553", "#edf7f0", "ui/status/repair.png"),
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "malgunbd.ttf" if bold else "malgun.ttf"
    return ImageFont.truetype(Path("C:/Windows/Fonts") / name, size=size)


def put(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int, color: str, bold: bool = False) -> None:
    draw.text(xy, value, font=font(size, bold), fill=color)


def wrapped(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], value: str, size: int, color: str, bold: bool = False, spacing: int = 5) -> None:
    fnt = font(size, bold)
    words = list(value)
    lines: list[str] = []
    line = ""
    for char in words:
        candidate = line + char
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= box[2] - box[0]:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = char
    if line:
        lines.append(line)
    y = box[1]
    line_height = size + spacing
    for line in lines:
        if y + line_height > box[3]:
            break
        draw.text((box[0], y), line, font=fnt, fill=color)
        y += line_height


def paste_ref(canvas: Image.Image, relative: str, center: tuple[int, int], box: tuple[int, int]) -> None:
    image = Image.open(REF / relative).convert("RGBA")
    crop = image.getchannel("A").getbbox()
    if crop:
        image = image.crop(crop)
    scale = min(box[0] / image.width, box[1] / image.height)
    image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.NEAREST)
    canvas.alpha_composite(image, (center[0] - image.width // 2, center[1] - image.height // 2))


def parse_patch_screens() -> list[PatchScreen]:
    lines = RULES.read_text(encoding="utf-8").splitlines()
    heading = re.compile(r"^### CR-\d+ · Session ([1-6]) Sheet ([1-4]) 완료 (?:파일 패치|PATCH)$")
    parsed: dict[tuple[int, int], tuple[PatchCard, ...]] = {}
    index = 0
    while index < len(lines):
        match = heading.match(lines[index])
        if not match:
            index += 1
            continue
        session, sheet = int(match.group(1)), int(match.group(2))
        cards: list[PatchCard] = []
        cursor = index + 1
        while cursor < len(lines) and not lines[cursor].startswith("### CR-"):
            row = lines[cursor].strip()
            row_match = re.match(r"^\| (FORMULA|SYSTEM|RISK) \| `([^`]+)` \| (.+) \|$", row)
            if row_match:
                cards.append(PatchCard(row_match.group(1), row_match.group(2), row_match.group(3)))
            cursor += 1
        if len(cards) != 3:
            raise RuntimeError(f"Session {session} Sheet {sheet}: expected 3 patch cards, got {len(cards)}")
        parsed[(session, sheet)] = tuple(cards)
        index = cursor

    if len(parsed) != 24:
        raise RuntimeError(f"expected 24 patch tables, got {len(parsed)}")

    by_key = {(spec.session, int(spec.slot[-2:])): spec for spec in SHEETS if spec.slot.startswith("sheet-")}
    finals = {spec.session: spec for spec in SHEETS if spec.slot == "final"}
    screens: list[PatchScreen] = []
    for session in range(1, 7):
        for sheet in range(1, 5):
            completed = by_key[(session, sheet)]
            if sheet < 4:
                next_spec = by_key[(session, sheet + 1)]
            else:
                next_spec = finals[session]
            screens.append(
                PatchScreen(
                    session=session,
                    sheet=sheet,
                    completed_title=completed.title,
                    next_title=next_spec.title,
                    next_slot=next_spec.slot,
                    cards=parsed[(session, sheet)],
                )
            )
    return screens


def selected_category(screen: PatchScreen) -> str:
    return ("FORMULA", "SYSTEM", "RISK")[(screen.session + screen.sheet) % 3]


def prior_patches(screens: list[PatchScreen], target: PatchScreen) -> list[PatchCard]:
    result: list[PatchCard] = []
    for screen in screens:
        if screen.session != target.session or screen.sheet >= target.sheet:
            continue
        category = selected_category(screen)
        result.append(next(card for card in screen.cards if card.category == category))
    return result


def draw_card(
    canvas: Image.Image,
    card: PatchCard,
    box: tuple[int, int, int, int],
    selected: bool,
) -> None:
    draw = ImageDraw.Draw(canvas)
    color, pale, icon = CATEGORY_STYLE[card.category]
    shadow = (box[0] + 5, box[1] + 6, box[2] + 5, box[3] + 6)
    draw.rounded_rectangle(shadow, radius=10, fill="#c4cec8")
    draw.rounded_rectangle(box, radius=10, fill="#ffffff", outline=color if selected else "#9aa8a1", width=4 if selected else 2)
    draw.rounded_rectangle((box[0], box[1], box[2], box[1] + 48), radius=10, fill=color)
    draw.rectangle((box[0], box[1] + 39, box[2], box[1] + 48), fill=color)
    paste_ref(canvas, icon, (box[0] + 31, box[1] + 24), (31, 31))
    put(draw, (box[0] + 53, box[1] + 13), f"{card.category} PATCH", 13, "#ffffff", True)
    if selected:
        draw.rounded_rectangle((box[2] - 86, box[1] + 10, box[2] - 10, box[1] + 37), radius=4, fill="#ffffff")
        put(draw, (box[2] - 72, box[1] + 15), "선택 중", 10, color, True)
    put(draw, (box[0] + 16, box[1] + 65), card.name, 19, color, True)
    wrapped(draw, (box[0] + 16, box[1] + 101, box[2] - 16, box[1] + 177), card.effect, 12, "#35463d", False, 6)
    draw.rounded_rectangle((box[0] + 14, box[3] - 57, box[2] - 14, box[3] - 16), radius=5, fill=pale, outline=color)
    put(draw, (box[0] + 25, box[3] - 47), "이번 세션에만 적용", 10, color, True)


def draw_repair_card(canvas: Image.Image, box: tuple[int, int, int, int], visible: bool) -> None:
    draw = ImageDraw.Draw(canvas)
    color, pale, icon = CATEGORY_STYLE["REPAIR"]
    fill = "#ffffff" if visible else "#edf0ee"
    outline = color if visible else "#b8c1bc"
    draw.rounded_rectangle(box, radius=8, fill=fill, outline=outline, width=2)
    paste_ref(canvas, icon, (box[0] + 30, (box[1] + box[3]) // 2), (38, 38))
    put(draw, (box[0] + 58, box[1] + 13), "REPAIR WORKBOOK", 13, color if visible else "#87928c", True)
    detail = "손상도 25 감소 · 최신 이상 현상 제거 · 이번 패치 포기" if visible else "현재 손상도 0 · 선택 조건 미충족"
    put(draw, (box[0] + 58, box[1] + 38), detail, 10, "#506158" if visible else "#919a95")


def minimap_for(screen: PatchScreen) -> Image.Image:
    folder = SHEET_MOCKUPS / f"session-{screen.session:02d}"
    image = Image.open(folder / f"{screen.next_slot}.png").convert("RGB")
    crop = image.crop((20, 70, 975, 582))
    crop.thumbnail((380, 278), Image.Resampling.LANCZOS)
    return crop


def build_screen(screen: PatchScreen, all_screens: list[PatchScreen]) -> Image.Image:
    deep, accent, _ = SESSION_COLORS[screen.session]
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), "#e9eeeb")
    draw = ImageDraw.Draw(canvas)

    # Full-screen workbook chrome; the global game sheet tabs are deliberately absent.
    draw.rectangle((0, 0, WIDTH, 54), fill="#0f5d38")
    put(draw, (22, 12), "PATCH_NOTES.xlsx", 22, "#ffffff", True)
    put(draw, (1250, 17), f"SESSION {screen.session}", 14, "#cbeadd", True)
    draw.rectangle((0, 54, WIDTH, 104), fill="#f7faf8", outline="#b8c4bd")
    put(draw, (28, 69), f"Sheet {screen.sheet} 완료 · {screen.completed_title}", 15, "#193f2c", True)
    put(draw, (620, 69), "이번 세션에만 적용 · 무작위 아님 · 리롤 없음", 13, "#527064", True)
    draw.rounded_rectangle((1315, 65, 1570, 94), radius=5, fill=deep)
    put(draw, (1355, 70), f"다음 · {screen.next_title}", 12, "#ffffff", True)

    # Left: accumulated patches.
    draw.rounded_rectangle((24, 124, 302, 814), radius=10, fill="#f9fbfa", outline="#96a59e", width=2)
    draw.rectangle((24, 124, 302, 168), fill="#203f31")
    put(draw, (42, 135), "현재 파일 패치", 16, "#ffffff", True)
    put(draw, (42, 177), f"{screen.sheet - 1} / 4 누적", 12, "#5e7066", True)
    prior = prior_patches(all_screens, screen)
    if not prior:
        draw.rounded_rectangle((42, 212, 284, 295), radius=7, fill="#eef2f0", outline="#c4cec8")
        put(draw, (80, 232), "아직 적용된 패치 없음", 12, "#77857e", True)
        put(draw, (72, 258), "이번 선택부터 빌드가 시작됩니다", 10, "#8b9690")
    for index, card in enumerate(prior):
        color, pale, icon = CATEGORY_STYLE[card.category]
        top = 212 + index * 112
        draw.rounded_rectangle((42, top, 284, top + 94), radius=7, fill=pale, outline=color, width=2)
        paste_ref(canvas, icon, (69, top + 34), (34, 34))
        put(draw, (94, top + 16), card.name, 13, color, True)
        put(draw, (94, top + 42), card.category, 9, color, True)
        wrapped(draw, (54, top + 65, 272, top + 90), card.effect, 9, "#506158", False, 3)
    draw.rounded_rectangle((42, 700, 284, 784), radius=7, fill="#edf4f0", outline="#afbeb6")
    put(draw, (58, 716), "ACTIVE EFFECT", 10, "#50705e", True)
    put(draw, (58, 741), f"다음 Sheet까지 패치 {screen.sheet}개 적용", 10, "#2f5e46")
    put(draw, (58, 760), "Session 종료 시 초기화", 9, "#75837c")

    # Center: three fixed handmade choices.
    put(draw, (330, 124), "이번 선택", 19, "#193f2c", True)
    put(draw, (330, 152), "카드를 바꿔 보며 다음 Sheet 영향을 비교하세요", 11, "#617269")
    selected = selected_category(screen)
    for index, card in enumerate(screen.cards):
        left = 330 + index * 266
        draw_card(canvas, card, (left, 184, left + 248, 454), card.category == selected)

    repair_visible = screen.session >= 5
    draw_repair_card(canvas, (330, 474, 1110, 548), repair_visible)

    selected_card = next(card for card in screen.cards if card.category == selected)
    color, pale, _ = CATEGORY_STYLE[selected]
    draw.rounded_rectangle((330, 568, 1110, 814), radius=10, fill="#ffffff", outline=color, width=2)
    draw.rectangle((330, 568, 1110, 611), fill=color)
    put(draw, (348, 579), f"선택 미리보기 · {selected_card.name}", 15, "#ffffff", True)
    put(draw, (350, 630), "현재 값", 11, "#697970", True)
    put(draw, (510, 630), "→", 15, color, True)
    put(draw, (570, 630), "적용 후", 11, color, True)
    before_after = {
        "FORMULA": ("기본 지속시간 / 비용", "함수 효과 강화"),
        "SYSTEM": ("기본 슬롯 / 조작", "편의 기능 활성화"),
        "RISK": ("기본 비용 / 안전성", "저비용 + 부작용"),
    }
    before, after = before_after[selected]
    draw.rounded_rectangle((350, 657, 500, 702), radius=5, fill="#f0f3f1", outline="#c6d0ca")
    put(draw, (366, 671), before, 10, "#53645b")
    draw.rounded_rectangle((570, 657, 820, 702), radius=5, fill=pale, outline=color)
    put(draw, (587, 671), after, 10, color, True)
    wrapped(draw, (350, 728, 1085, 795), selected_card.effect, 12, "#35463d", True, 6)

    # Right: actual next-sheet minimap and affected entities.
    draw.rounded_rectangle((1132, 124, 1576, 814), radius=10, fill="#f9fbfa", outline="#96a59e", width=2)
    draw.rectangle((1132, 124, 1576, 168), fill="#203f31")
    put(draw, (1150, 135), "다음 SHEET 브리핑", 16, "#ffffff", True)
    put(draw, (1150, 180), screen.next_title, 20, deep, True)
    put(draw, (1150, 211), "영향 대상은 선택 카드 색으로 점멸", 10, "#617269")
    mini = minimap_for(screen)
    mini_x, mini_y = 1160, 240
    canvas.paste(mini, (mini_x, mini_y))
    # Pulse markers represent devices/NPCs affected by the selected card.
    for dx, dy in ((90, 80), (242, 142), (315, 205)):
        draw.ellipse((mini_x + dx - 11, mini_y + dy - 11, mini_x + dx + 11, mini_y + dy + 11), outline=color, width=4)
    draw.rounded_rectangle((1150, 536, 1558, 676), radius=7, fill=pale, outline=color)
    put(draw, (1166, 551), "영향받는 다음 Sheet 요소", 12, color, True)
    affected = {
        "FORMULA": ["함수 지속시간·대상", "문과 센서 판정", "대표 우회로"],
        "SYSTEM": ["슬롯과 조작 방식", "단말기·CLIPBOARD", "안전한 우회로"],
        "RISK": ["CALC 비용", "경비·관리자 반응", "고위험 단축 경로"],
    }[selected]
    for index, item in enumerate(affected):
        put(draw, (1170, 584 + index * 25), f"• {item}", 11, "#3d5147")
    draw.rounded_rectangle((1150, 697, 1558, 786), radius=7, fill="#fff5df", outline="#d3a956")
    put(draw, (1166, 712), "확정 전 안내", 11, "#805817", True)
    put(draw, (1166, 738), "카드 선택만으로는 저장되지 않습니다.", 10, "#674f29")
    put(draw, (1166, 760), "다음 Sheet를 열 때 선택이 확정됩니다.", 10, "#674f29", True)

    # Footer actions; no global game sheet tabs here.
    draw.rectangle((0, 836, WIDTH, 900), fill="#f7faf8", outline="#b8c4bd")
    draw.rounded_rectangle((32, 850, 250, 886), radius=5, fill="#ffffff", outline="#75877d")
    put(draw, (75, 858), "← 결과로 돌아가기", 12, "#40534a", True)
    put(draw, (620, 860), "← → 카드 이동   ENTER 상세 비교   ESC 뒤로", 10, "#687970")
    draw.rounded_rectangle((1315, 846, 1570, 890), radius=6, fill=deep)
    put(draw, (1368, 857), "다음 Sheet 열기 →", 14, "#ffffff", True)
    return canvas.convert("RGB")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    screens = parse_patch_screens()
    generated: dict[int, list[tuple[PatchScreen, Path]]] = {session: [] for session in range(1, 7)}
    for screen in screens:
        folder = OUTPUT / f"session-{screen.session:02d}"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"after-sheet-{screen.sheet:02d}.png"
        build_screen(screen, screens).save(path, quality=95)
        generated[screen.session].append((screen, path))

    for session, items in generated.items():
        deep, accent, _ = SESSION_COLORS[session]
        board = Image.new("RGB", (1920, 1150), "#101813")
        board_draw = ImageDraw.Draw(board)
        board_draw.rectangle((0, 0, 1920, 70), fill=deep)
        put(board_draw, (28, 16), f"SESSION {session} · PATCH_NOTES.xlsx", 25, "#ffffff", True)
        put(board_draw, (1510, 22), "AFTER SHEET 1—4", 15, accent, True)
        for index, (screen, path) in enumerate(items):
            image = Image.open(path).convert("RGB").resize((960, 540), Image.Resampling.LANCZOS)
            x = (index % 2) * 960
            y = 70 + (index // 2) * 540
            board.paste(image, (x, y))
            board_draw.rectangle((x + 12, y + 12, x + 370, y + 42), fill="#101813")
            put(board_draw, (x + 22, y + 18), f"SHEET {screen.sheet} 완료 · {screen.completed_title}", 11, "#ffffff", True)
        board.save(OUTPUT / f"session-{session:02d}-patch-board.png", quality=95)

    print(f"Generated {len(screens)} patch screens and 6 boards in {OUTPUT}")


if __name__ == "__main__":
    main()
