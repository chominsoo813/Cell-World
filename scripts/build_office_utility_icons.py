from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/pixel-art/office-ref"
OUTPUT = ASSETS / "ui/utility"
SHEET = ASSETS / "sheets/office-ref-utility-icons.png"
BASE = 32
SCALE = 8
INK = "#11161b"
PAPER = "#e6e5dc"
CYAN = "#55c6c5"
BLUE = "#4e8fc7"
GREEN = "#63b47f"
AMBER = "#e3aa42"
RED = "#d55555"
VIOLET = "#9b62ba"
GRAY = "#6e7880"


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (BASE, BASE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def sheet_icon() -> Image.Image:
    image, draw = canvas()
    draw.rectangle((7, 4, 24, 27), fill=PAPER, outline=INK, width=2)
    draw.polygon(((19, 4), (24, 9), (19, 9)), fill="#bfc7c8", outline=INK)
    for y in (13, 18, 23):
        draw.line((10, y, 21, y), fill=CYAN if y == 18 else GRAY, width=2)
    return image


def book_icon() -> Image.Image:
    image, draw = canvas()
    draw.polygon(((4, 7), (15, 9), (15, 27), (4, 24)), fill=PAPER, outline=INK)
    draw.polygon(((28, 7), (17, 9), (17, 27), (28, 24)), fill=PAPER, outline=INK)
    draw.line((16, 9, 16, 27), fill=CYAN, width=2)
    return image


def function_help_icon() -> Image.Image:
    image, draw = canvas()
    draw.rectangle((4, 6, 28, 26), fill="#26333b", outline=INK, width=2)
    draw.line((8, 12, 15, 12), fill=CYAN, width=2)
    draw.line((8, 17, 19, 17), fill=BLUE, width=2)
    draw.line((8, 22, 13, 22), fill=AMBER, width=2)
    draw.rectangle((22, 10, 25, 22), fill=GREEN)
    return image


def hint_icon() -> Image.Image:
    image, draw = canvas()
    draw.ellipse((8, 3, 24, 20), fill=AMBER, outline=INK, width=2)
    draw.rectangle((13, 18, 19, 25), fill=PAPER, outline=INK)
    draw.line((12, 28, 20, 28), fill=INK, width=2)
    return image


def settings_icon() -> Image.Image:
    image, draw = canvas()
    for x, y in ((14, 2), (14, 26), (2, 14), (26, 14), (5, 5), (23, 5), (5, 23), (23, 23)):
        draw.rectangle((x, y, x + 4, y + 4), fill=GRAY, outline=INK)
    draw.ellipse((7, 7, 25, 25), fill=GRAY, outline=INK, width=2)
    draw.ellipse((12, 12, 20, 20), fill="#26333b", outline=INK)
    return image


def emotion(mouth: str, color: str, mark: str | None = None) -> Image.Image:
    image, draw = canvas()
    draw.ellipse((5, 5, 27, 27), fill=color, outline=INK, width=2)
    draw.rectangle((10, 12, 12, 15), fill=INK)
    draw.rectangle((20, 12, 22, 15), fill=INK)
    if mouth == "flat":
        draw.line((12, 21, 20, 21), fill=INK, width=2)
    elif mouth == "smile":
        draw.line((12, 19, 14, 22, 18, 22, 20, 19), fill=INK, width=2)
    elif mouth == "frown":
        draw.line((12, 23, 14, 20, 18, 20, 20, 23), fill=INK, width=2)
    elif mouth == "open":
        draw.rectangle((14, 19, 18, 23), fill=INK)
    if mark == "?":
        draw.line((24, 3, 27, 3, 28, 6, 25, 9, 25, 11), fill=VIOLET, width=2)
        draw.point((25, 14), fill=VIOLET)
    if mark == "!":
        draw.line((27, 3, 27, 10), fill=RED, width=2)
        draw.point((27, 13), fill=RED)
    return image


def result_icon(kind: str) -> Image.Image:
    image, draw = canvas()
    if kind == "captured":
        draw.rectangle((7, 12, 25, 27), fill="#4c5962", outline=INK, width=2)
        for x in (11, 16, 21):
            draw.line((x, 12, x, 27), fill=PAPER, width=2)
        draw.ellipse((12, 4, 20, 13), fill=AMBER, outline=INK)
    elif kind == "time_out":
        draw.ellipse((5, 5, 27, 27), fill=PAPER, outline=INK, width=2)
        draw.line((16, 16, 16, 9), fill=RED, width=2)
        draw.line((16, 16, 22, 20), fill=RED, width=2)
    elif kind == "file_collision":
        draw.rectangle((4, 7, 18, 25), fill=VIOLET, outline=INK, width=2)
        draw.rectangle((14, 7, 28, 25), fill=RED, outline=INK, width=2)
        draw.line((13, 9, 18, 14, 13, 19, 18, 24), fill=PAPER, width=2)
    else:
        draw.polygon(((16, 3), (29, 27), (3, 27)), fill=AMBER, outline=INK)
        draw.line((16, 10, 16, 19), fill=INK, width=3)
        draw.rectangle((15, 22, 17, 24), fill=INK)
    return image


def data_icon(kind: str) -> Image.Image:
    image, draw = canvas()
    draw.rectangle((6, 5, 25, 27), fill=PAPER, outline=INK, width=2)
    if kind == "delete":
        draw.line((10, 10, 22, 22), fill=RED, width=3)
        draw.line((22, 10, 10, 22), fill=RED, width=3)
    elif kind == "backup":
        draw.rectangle((10, 9, 21, 19), fill=BLUE, outline=INK)
        draw.line((16, 18, 16, 25), fill=GREEN, width=2)
        draw.polygon(((12, 22), (20, 22), (16, 27)), fill=GREEN)
    else:
        draw.arc((8, 8, 24, 24), 30, 310, fill=CYAN, width=3)
        draw.polygon(((20, 6), (27, 8), (22, 13)), fill=CYAN)
    return image


def select_column_icon() -> Image.Image:
    image, draw = canvas()
    draw.rectangle((8, 4, 24, 28), fill=PAPER, outline=INK, width=2)
    for y in (8, 14, 20):
        draw.rectangle((13, y, 19, y + 4), fill=CYAN, outline="#2c5a62")
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    icons = {
        "select_column": select_column_icon(),
        "help_current_sheet": sheet_icon(),
        "help_rules": book_icon(),
        "help_functions": function_help_icon(),
        "help_hint": hint_icon(),
        "help_settings": settings_icon(),
        "emotion_neutral": emotion("flat", "#d5b875"),
        "emotion_concern": emotion("frown", "#d5b875"),
        "emotion_alert": emotion("open", "#dc8666", "!"),
        "emotion_confused": emotion("flat", "#b998d0", "?"),
        "emotion_approved": emotion("smile", "#7ac394"),
        "emotion_error": emotion("open", "#cf6f86"),
        "result_captured": result_icon("captured"),
        "result_time_out": result_icon("time_out"),
        "result_file_collision": result_icon("file_collision"),
        "profile_delete": data_icon("delete"),
        "profile_backup": data_icon("backup"),
        "profile_restore": data_icon("restore"),
    }

    rendered: list[Image.Image] = []
    for name, small in icons.items():
        image = small.resize((BASE * SCALE, BASE * SCALE), Image.Resampling.NEAREST)
        image.save(OUTPUT / f"{name}.png")
        rendered.append(image)

    columns = 6
    rows = (len(rendered) + columns - 1) // columns
    contact = Image.new("RGBA", (BASE * SCALE * columns, BASE * SCALE * rows), (0, 0, 0, 0))
    for index, image in enumerate(rendered):
        contact.alpha_composite(image, ((index % columns) * BASE * SCALE, (index // columns) * BASE * SCALE))
    contact.save(SHEET)


if __name__ == "__main__":
    main()
