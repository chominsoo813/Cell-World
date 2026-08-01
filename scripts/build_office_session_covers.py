from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/pixel-art/office-ref"
OUTPUT = ASSETS / "ui/session-covers"
SHEET = ASSETS / "sheets/office-ref-session-covers.png"
SIZE = 96
SCALE = 4


PALETTES = [
    ("session_1_onboarding", "#182724", "#24423a", "#56b88a"),
    ("session_2_inventory", "#28261f", "#4a3d2b", "#d49a4b"),
    ("session_3_policy", "#17232d", "#233b4b", "#68a7c7"),
    ("session_4_history", "#202330", "#393b54", "#9ca4d8"),
    ("session_5_corruption", "#261a2d", "#4b2859", "#c760d2"),
    ("session_6_root", "#111c27", "#1c3448", "#52c7dc"),
    ("hidden", "#1d1b28", "#303047", "#d96a78"),
    ("overtime", "#23252a", "#41454e", "#e0b45d"),
]


def load(relative: str) -> Image.Image:
    return Image.open(ASSETS / relative).convert("RGBA")


def fit(sprite: Image.Image, width: int, height: int) -> Image.Image:
    scale = min(width / sprite.width, height / sprite.height)
    return sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.NEAREST,
    )


def place(canvas: Image.Image, relative: str, box: tuple[int, int, int, int], opacity: int = 255) -> None:
    x, y, width, height = box
    sprite = fit(load(relative), width, height)
    if opacity != 255:
        alpha = sprite.getchannel("A").point(lambda value: value * opacity // 255)
        sprite.putalpha(alpha)
    canvas.alpha_composite(sprite, (x + (width - sprite.width) // 2, y + height - sprite.height))


def base(index: int) -> tuple[Image.Image, ImageDraw.ImageDraw, str]:
    _, background, panel, accent = PALETTES[index]
    image = Image.new("RGBA", (SIZE, SIZE), background)
    draw = ImageDraw.Draw(image)
    draw.rectangle((3, 3, 92, 92), fill=panel, outline="#0b1014", width=2)
    for coordinate in range(14, 92, 12):
        draw.line((5, coordinate, 90, coordinate), fill="#ffffff18", width=1)
        draw.line((coordinate, 5, coordinate, 90), fill="#ffffff12", width=1)
    draw.rectangle((5, 86, 90, 90), fill=accent)
    return image, draw, accent


def onboarding() -> Image.Image:
    image, draw, accent = base(0)
    draw.line((44, 15, 44, 82), fill=accent, width=2)
    draw.line((44, 49, 85, 49), fill=accent, width=2)
    place(image, "characters/junior_employee_right.png", (8, 28, 28, 52))
    place(image, "props/time_clock_terminal.png", (50, 22, 34, 58))
    return image


def inventory() -> Image.Image:
    image, draw, accent = base(1)
    place(image, "props/copier_paper_box.png", (8, 40, 35, 36))
    place(image, "props/security_turnstile.png", (55, 31, 30, 48))
    for x, color in ((37, "#5ab0d0"), (47, "#d2a24d"), (57, "#6cb77a")):
        draw.rectangle((x, 18, x + 8, 28), fill="#e8e7dc", outline="#11151a")
        draw.rectangle((x + 2, 20, x + 6, 23), fill=color)
    draw.line((24, 35, 70, 35), fill=accent, width=2)
    return image


def policy() -> Image.Image:
    image, draw, accent = base(2)
    place(image, "devices/security_door_locked.png", (32, 24, 34, 55))
    place(image, "devices/cctv_camera_active.png", (66, 8, 20, 20))
    draw.line((14, 20, 14, 70), fill=accent, width=2)
    draw.line((14, 45, 30, 45), fill=accent, width=2)
    draw.line((14, 70, 30, 70), fill="#d25555", width=2)
    draw.rectangle((9, 14, 19, 24), fill="#61b884", outline="#0d1418")
    draw.rectangle((9, 65, 19, 75), fill="#cf5555", outline="#0d1418")
    return image


def history() -> Image.Image:
    image, draw, accent = base(3)
    place(image, "props/mobile_filing_cabinet.png", (14, 29, 30, 51), opacity=90)
    place(image, "props/mobile_filing_cabinet.png", (33, 29, 30, 51), opacity=150)
    place(image, "props/mobile_filing_cabinet.png", (52, 29, 30, 51))
    for x in (22, 29, 36):
        draw.polygon(((x, 16), (x - 8, 21), (x, 26)), fill=accent)
    return image


def corruption() -> Image.Image:
    image, draw, accent = base(4)
    place(image, "devices/computer_terminal_ref_error.png", (28, 27, 42, 54))
    draw.line((12, 18, 26, 30, 18, 40, 31, 51), fill=accent, width=3)
    draw.line((72, 18, 63, 31, 78, 43, 68, 58, 84, 71), fill="#8f3cac", width=3)
    for x, y in ((14, 61), (20, 68), (78, 24), (83, 31), (12, 48)):
        draw.rectangle((x, y, x + 3, y + 3), fill=accent)
    return image


def root() -> Image.Image:
    image, draw, accent = base(5)
    place(image, "props/server_rack.png", (34, 21, 30, 60))
    for x, y in ((15, 20), (72, 20), (15, 61), (72, 61)):
        draw.rectangle((x, y, x + 10, y + 12), fill="#253746", outline="#0a1015")
        draw.rectangle((x + 3, y + 4, x + 7, y + 9), fill=accent)
        draw.line((x + 5, y + 12, 48, 48), fill=accent, width=1)
    draw.rectangle((43, 43, 53, 53), fill="#d8edf0", outline="#0a1015")
    return image


def hidden() -> Image.Image:
    image, draw, _ = base(6)
    draw.rectangle((5, 5, 47, 85), fill="#213b4d")
    draw.rectangle((48, 5, 90, 85), fill="#4a252d")
    draw.line((48, 7, 48, 84), fill="#d9d5ca", width=1)
    draw.rectangle((38, 34, 58, 58), fill="#242735", outline="#0a1015", width=2)
    draw.line((18, 45, 38, 45), fill="#49c8e3", width=2)
    draw.line((58, 45, 78, 45), fill="#eb6571", width=2)
    draw.polygon(((17, 39), (17, 51), (24, 45)), fill="#49c8e3")
    draw.polygon(((79, 39), (79, 51), (72, 45)), fill="#eb6571")
    return image


def overtime() -> Image.Image:
    image, draw, accent = base(7)
    for index, y in enumerate((61, 49, 37, 25, 13)):
        inset = 10 + index * 4
        draw.rectangle((inset, y, 95 - inset, y + 15), fill="#e3e1d8", outline="#0b1014", width=2)
        draw.line((inset + 5, y + 5, 90 - inset, y + 5), fill="#718b76")
        draw.line((inset + 5, y + 10, 84 - inset, y + 10), fill="#a7adb1")
    draw.ellipse((9, 11, 29, 31), fill="#e8e4d8", outline="#0b1014", width=2)
    draw.line((19, 21, 19, 15), fill="#2d3338", width=2)
    draw.line((19, 21, 24, 24), fill=accent, width=2)
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    makers = [onboarding, inventory, policy, history, corruption, root, hidden, overtime]
    covers: list[Image.Image] = []

    for (name, _, _, _), maker in zip(PALETTES, makers, strict=True):
        small = maker()
        cover = small.resize((SIZE * SCALE, SIZE * SCALE), Image.Resampling.NEAREST)
        cover.save(OUTPUT / f"{name}.png")
        covers.append(cover)

    contact = Image.new("RGBA", (SIZE * SCALE * 4, SIZE * SCALE * 2), "#080c10")
    for index, cover in enumerate(covers):
        contact.alpha_composite(cover, ((index % 4) * SIZE * SCALE, (index // 4) * SIZE * SCALE))
    contact.save(SHEET)


if __name__ == "__main__":
    main()
