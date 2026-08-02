from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/pixel-art/office-ref"
KEEPER_ASSETS = ROOT / "public/assets/pixel-art/office-escape"
OUTPUT = ROOT / "docs/mockups/cell-office-ref-prototype-screen-v2.png"

WIDTH = 1600
HEIGHT = 900


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = Path("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf")
    return ImageFont.truetype(path, size=size)


def text(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    value: str,
    size: int,
    fill: str,
    bold: bool = False,
) -> None:
    draw.text(position, value, font=font(size, bold), fill=fill)


def paste_asset(
    canvas: Image.Image,
    relative: str,
    center: tuple[int, int],
    box: tuple[int, int],
    opacity: int = 255,
) -> None:
    sprite = Image.open(ASSETS / relative).convert("RGBA")
    alpha_box = sprite.getchannel("A").getbbox()
    if alpha_box:
        sprite = sprite.crop(alpha_box)
    scale = min(box[0] / sprite.width, box[1] / sprite.height)
    sprite = sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.NEAREST,
    )
    if opacity != 255:
        alpha = sprite.getchannel("A").point(lambda value: value * opacity // 255)
        sprite.putalpha(alpha)
    canvas.alpha_composite(
        sprite,
        (center[0] - sprite.width // 2, center[1] - sprite.height // 2),
    )


def paste_keeper(
    canvas: Image.Image,
    relative: str,
    center: tuple[int, int],
    box: tuple[int, int],
    opacity: int = 255,
) -> None:
    sprite = Image.open(KEEPER_ASSETS / relative).convert("RGBA")
    alpha_box = sprite.getchannel("A").getbbox()
    if alpha_box:
        sprite = sprite.crop(alpha_box)
    scale = min(box[0] / sprite.width, box[1] / sprite.height)
    sprite = sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.NEAREST,
    )
    if opacity != 255:
        alpha = sprite.getchannel("A").point(lambda value: value * opacity // 255)
        sprite.putalpha(alpha)
    canvas.alpha_composite(
        sprite,
        (center[0] - sprite.width // 2, center[1] - sprite.height // 2),
    )


def panel(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title_value: str,
    accent: str = "#16663f",
) -> None:
    draw.rounded_rectangle(box, radius=8, fill="#f9fbfa", outline="#8da097", width=2)
    draw.rounded_rectangle(
        (box[0], box[1], box[2], box[1] + 38),
        radius=8,
        fill=accent,
    )
    draw.rectangle((box[0], box[1] + 30, box[2], box[1] + 38), fill=accent)
    text(draw, (box[0] + 13, box[1] + 8), title_value, 17, "#ffffff", True)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), "#e9eeeb")
    draw = ImageDraw.Draw(canvas)

    # Spreadsheet application chrome.
    draw.rectangle((0, 0, WIDTH, 34), fill="#0f5d38")
    text(draw, (18, 6), "CELL WORLD", 15, "#ffffff", True)
    text(draw, (132, 7), "Cell Office: #REF!  ·  OFFICE_INDEX.xlsx", 13, "#d9eee3")
    text(draw, (1450, 7), "—   □   ×", 14, "#d9eee3")

    draw.rectangle((0, 34, WIDTH, 80), fill="#f7f9f8", outline="#bdc8c2")
    draw.rectangle((18, 44, 72, 70), fill="#eef3f0", outline="#aab7b0")
    text(draw, (34, 48), "fx", 15, "#355a47", True)
    draw.rectangle((82, 44, 1188, 70), fill="#ffffff", outline="#aab7b0")
    text(draw, (96, 47), "=HIDE(ROW_6)", 16, "#173e2b", True)
    draw.rounded_rectangle((1202, 42, 1350, 72), radius=5, fill="#e7f4ec", outline="#2f875b")
    text(draw, (1230, 47), "미리보기", 14, "#155d39", True)
    draw.rounded_rectangle((1360, 42, 1578, 72), radius=5, fill="#16663f")
    text(draw, (1406, 47), "ENTER · 실행", 14, "#ffffff", True)

    # Main stage and right HUD, kept above the persistent sheet tabs.
    stage = (32, 80, 1228, 828)
    draw.rectangle(stage, fill="#17221d")
    draw.rectangle((1228, 80, 1600, 828), fill="#edf2ef")
    draw.line((1228, 80, 1228, 828), fill="#aab7b0", width=2)

    # Map grid: A1:N10.
    grid_x, grid_y = 82, 121
    tile_w, tile_h = 78, 58
    grid_w, grid_h = tile_w * 14, tile_h * 10
    draw.rectangle((grid_x - 30, grid_y - 28, grid_x + grid_w, grid_y + grid_h), fill="#24332c")
    for column in range(14):
        x0 = grid_x + column * tile_w
        draw.rectangle((x0, grid_y - 28, x0 + tile_w, grid_y), fill="#dae3de", outline="#9fafA6")
        text(draw, (x0 + 33, grid_y - 24), chr(65 + column), 13, "#3e5549", True)
    for row in range(10):
        y0 = grid_y + row * tile_h
        draw.rectangle((grid_x - 30, y0, grid_x, y0 + tile_h), fill="#dae3de", outline="#9fafa6")
        label_x = grid_x - 22 if row < 9 else grid_x - 27
        text(draw, (label_x, y0 + 18), str(row + 1), 13, "#3e5549", True)

    for row in range(10):
        for column in range(14):
            x0 = grid_x + column * tile_w
            y0 = grid_y + row * tile_h
            base = "#687a82" if (row + column) % 2 == 0 else "#64767e"
            if 2 <= column <= 5 and 2 <= row <= 4:
                base = "#71838b" if (row + column) % 2 == 0 else "#6d7f87"
            if 9 <= column <= 13 and 0 <= row <= 4:
                base = "#5d7182" if (row + column) % 2 == 0 else "#586d7d"
            draw.rectangle((x0, y0, x0 + tile_w, y0 + tile_h), fill=base, outline="#62756b")

    # Rooms and corridors.
    wall = "#b7c2bc"
    wall_dark = "#718179"
    draw.rectangle((grid_x, grid_y, grid_x + grid_w, grid_y + 7), fill=wall)
    draw.rectangle((grid_x, grid_y + grid_h - 7, grid_x + grid_w, grid_y + grid_h), fill=wall_dark)
    draw.rectangle((grid_x, grid_y, grid_x + 7, grid_y + grid_h), fill=wall)
    draw.rectangle((grid_x + grid_w - 7, grid_y, grid_x + grid_w, grid_y + grid_h), fill=wall_dark)
    draw.rectangle((grid_x + tile_w * 6, grid_y, grid_x + tile_w * 6 + 7, grid_y + tile_h * 4), fill=wall)
    draw.rectangle((grid_x + tile_w * 9, grid_y + tile_h * 6, grid_x + tile_w * 9 + 7, grid_y + grid_h), fill=wall)
    draw.rectangle((grid_x + tile_w * 2, grid_y + tile_h * 5, grid_x + tile_w * 6, grid_y + tile_h * 5 + 7), fill=wall)
    draw.rectangle((grid_x + tile_w * 9, grid_y + tile_h * 5, grid_x + grid_w, grid_y + tile_h * 5 + 7), fill=wall)

    # Selected row and HIDE preview treatment.
    selection = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    selection_draw = ImageDraw.Draw(selection)
    row6_y = grid_y + tile_h * 5
    selection_draw.rectangle(
        (grid_x, row6_y, grid_x + grid_w, row6_y + tile_h),
        fill=(31, 214, 171, 52),
        outline=(52, 244, 195, 255),
        width=4,
    )
    for x in range(grid_x + 10, grid_x + grid_w - 10, 26):
        selection_draw.line((x, row6_y + 8, x + 12, row6_y + 8), fill=(189, 255, 231, 220), width=2)
        selection_draw.line((x, row6_y + tile_h - 8, x + 12, row6_y + tile_h - 8), fill=(189, 255, 231, 220), width=2)
    canvas.alpha_composite(selection)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((grid_x + 10, row6_y + 13, grid_x + 138, row6_y + 44), radius=5, fill="#113d31")
    text(draw, (grid_x + 24, row6_y + 17), "ROW 6 선택", 13, "#9effdc", True)

    # Guard sight cones underneath actors.
    cones = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    cone_draw = ImageDraw.Draw(cones)
    cone_draw.polygon([(777, 292), (610, 228), (610, 356)], fill=(255, 202, 64, 48), outline=(255, 213, 92, 135))
    cone_draw.polygon([(987, 582), (820, 514), (820, 650)], fill=(255, 117, 76, 42), outline=(255, 137, 88, 120))
    canvas.alpha_composite(cones)

    # Straight-on Office Keeper furniture creates a readable orthogonal office.
    # Two cubicle rows on the left.
    for desk_x in (205, 365, 525):
        paste_keeper(canvas, "furniture/office_desk.png", (desk_x, 214), (130, 66))
        paste_keeper(canvas, "furniture/computer_monitor.png", (desk_x, 193), (44, 36))
        paste_keeper(canvas, "furniture/office_chair_green.png", (desk_x, 272), (54, 54))
        paste_keeper(canvas, "furniture/office_desk.png", (desk_x, 383), (130, 66))
        paste_keeper(canvas, "furniture/computer_monitor.png", (desk_x, 362), (44, 36))
        paste_keeper(canvas, "furniture/office_chair_green.png", (desk_x, 441), (54, 54))
    paste_keeper(canvas, "furniture/partition_wall.png", (365, 302), (450, 24))

    # Meeting room and manager office on the right.
    paste_keeper(canvas, "furniture/conference_table_set.png", (950, 252), (284, 108))
    paste_keeper(canvas, "furniture/executive_desk.png", (1050, 425), (154, 82))
    paste_keeper(canvas, "furniture/bookshelf.png", (1150, 196), (72, 94))
    paste_keeper(canvas, "furniture/potted_plant.png", (1133, 382), (58, 76))

    # Shared office equipment along the bottom service corridor.
    paste_keeper(canvas, "furniture/copier_printer.png", (212, 624), (82, 88))
    paste_keeper(canvas, "furniture/filing_cabinet.png", (318, 624), (48, 94))
    paste_keeper(canvas, "furniture/water_dispenser.png", (1080, 646), (56, 94))
    paste_keeper(canvas, "furniture/exit_door.png", (1150, 620), (68, 104))

    # Office REF characters remain the gameplay cast.
    paste_asset(canvas, "characters/junior_employee_right.png", (510, 622), (72, 100))
    paste_asset(canvas, "characters/coworker_front.png", (365, 476), (60, 88))
    paste_asset(canvas, "characters/security_left.png", (777, 292), (70, 100))
    paste_asset(canvas, "characters/security_left.png", (987, 582), (70, 100))
    paste_asset(canvas, "characters/team_leader_front.png", (1040, 343), (64, 92))

    # In-stage top chips.
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((60, 93, 275, 119), radius=5, fill="#102f25", outline="#3ea578")
    text(draw, (72, 96), "SESSION 1 · SHEET 1/5", 13, "#c8f4df", True)
    draw.rounded_rectangle((908, 93, 1208, 119), radius=5, fill="#102f25", outline="#3ea578")
    text(draw, (927, 96), "숨겨진 복도 · EDIT MODE 20%", 13, "#c8f4df", True)

    # Function dock floats above, never over the global sheet tabs.
    dock = (174, 724, 1110, 814)
    draw.rounded_rectangle(dock, radius=10, fill="#101915", outline="#4b6357", width=2)
    text(draw, (190, 735), "FUNCTION", 12, "#89a79a", True)
    functions = [
        ("1", "hide.png", "HIDE", True),
        ("2", "copy_paste.png", "COPY", False),
        ("3", "sort.png", "SORT", False),
        ("4", "if.png", "IF", False),
        ("Z", "undo.png", "UNDO", False),
    ]
    for index, (key, file_name, label, selected) in enumerate(functions):
        left = 282 + index * 130
        fill = "#174b3b" if selected else "#202c26"
        outline = "#46efb7" if selected else "#4c6156"
        draw.rounded_rectangle((left, 733, left + 116, 803), radius=7, fill=fill, outline=outline, width=2)
        paste_asset(canvas, f"ui/functions/{file_name}", (left + 32, 768), (42, 42))
        text(draw, (left + 58, 745), key, 11, "#9fc3b2", True)
        text(draw, (left + 58, 765), label, 12, "#ffffff", True)
        if selected:
            text(draw, (left + 58, 783), "CALC 1", 9, "#8ff7cf", True)

    # Right-side Office REF HUD.
    panel(draw, (1248, 98, 1578, 244), "SHEET BRIEF")
    text(draw, (1264, 148), "숨겨진 복도", 22, "#173e2b", True)
    text(draw, (1264, 181), "경비 시야를 피해 OUTBOX로 이동", 13, "#4d6257")
    draw.rectangle((1264, 212, 1560, 222), fill="#d9e2dd")
    draw.rectangle((1264, 212, 1355, 222), fill="#2e9b68")
    text(draw, (1264, 226), "목표 진행 1 / 3", 11, "#5c6d64", True)

    panel(draw, (1248, 258, 1578, 416), "STATUS")
    paste_asset(canvas, "ui/functions/calc.png", (1292, 316), (48, 48))
    text(draw, (1326, 284), "CALC", 12, "#66766e", True)
    text(draw, (1326, 302), "3", 30, "#155d39", True)
    draw.rounded_rectangle((1264, 346, 1408, 385), radius=5, fill="#e5f5ed", outline="#74aa8d")
    paste_asset(canvas, "ui/status/compliant.png", (1284, 365), (28, 28))
    text(draw, (1303, 355), "COMPLIANT", 12, "#226644", True)
    draw.rounded_rectangle((1418, 346, 1560, 385), radius=5, fill="#fff4df", outline="#dab267")
    paste_asset(canvas, "ui/status/alert_1.png", (1438, 365), (28, 28))
    text(draw, (1458, 355), "ALERT 0", 12, "#7c5a1f", True)
    text(draw, (1264, 392), "손상도 0  ·  자동 복구 1", 12, "#64756c")

    panel(draw, (1248, 430, 1578, 590), "SELECTION", "#155b67")
    paste_asset(canvas, "ui/status/select_row.png", (1288, 491), (48, 48))
    text(draw, (1324, 462), "ROW 6", 23, "#174653", True)
    text(draw, (1324, 493), "경비 시야 판정에서 제외", 12, "#526b72")
    draw.rounded_rectangle((1264, 530, 1560, 570), radius=5, fill="#e8f6f5", outline="#58a8a5")
    text(draw, (1279, 540), "복원 예정", 11, "#54716f", True)
    text(draw, (1479, 535), "00:05", 18, "#155b67", True)

    panel(draw, (1248, 604, 1578, 808), "EXECUTION PREVIEW", "#533f82")
    paste_asset(canvas, "ui/functions/hide.png", (1295, 666), (58, 58))
    text(draw, (1334, 633), "=HIDE(ROW_6)", 18, "#322657", True)
    text(draw, (1334, 663), "CALC  -1", 13, "#6b578e", True)
    text(draw, (1264, 708), "✓ 통로 5초 접힘", 13, "#29744e", True)
    text(draw, (1264, 734), "✓ SECURITY 시야선 차단", 13, "#29744e", True)
    text(draw, (1264, 760), "! 복원 위치를 벗어나세요", 13, "#a26022", True)

    # Persistent sheet navigation: unchanged and outside the game HUD.
    draw.rectangle((0, 828, WIDTH, 872), fill="#f5f8f6", outline="#b8c3bd")
    text(draw, (18, 840), "‹    ›", 15, "#6e7c74")
    tabs = [
        (82, 210, "Game Select", False),
        (210, 338, "RPG Map", False),
        (338, 466, "Office", True),
        (466, 594, "Defence", False),
    ]
    for left, right, label, active in tabs:
        draw.rectangle((left, 828, right, 872), fill="#ffffff" if active else "#f5f8f6", outline="#d5ded9")
        if active:
            draw.rectangle((left, 828, right, 832), fill="#16804d")
        text(draw, (left + 18, 842), label, 12, "#155d39" if active else "#56645c", active)
    draw.rectangle((594, 828, 638, 872), fill="#f5f8f6", outline="#d5ded9")
    text(draw, (609, 837), "+", 19, "#56645c")

    draw.rectangle((0, 872, WIDTH, 900), fill="#fbfcfb", outline="#d9e0dc")
    text(draw, (14, 878), "READY   ·   EDIT RANGE A1:N10   ·   WORLD SPEED 20%", 10, "#5a6860")
    text(draw, (1420, 878), "100%   ▬▬▬", 10, "#5a6860")

    canvas.convert("RGB").save(OUTPUT, quality=95)
    print(OUTPUT)


if __name__ == "__main__":
    main()
