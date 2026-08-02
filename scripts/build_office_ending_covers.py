from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/pixel-art/office-ref"
OUTPUT = ASSETS / "ui/endings"
SHEET = ASSETS / "sheets/office-ref-ending-covers.png"
SIZE = 96
SCALE = 4


def load(relative: str) -> Image.Image:
    return Image.open(ASSETS / relative).convert("RGBA")


def fit(sprite: Image.Image, width: int, height: int) -> Image.Image:
    scale = min(width / sprite.width, height / sprite.height)
    return sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.NEAREST,
    )


def place(canvas: Image.Image, relative: str, box: tuple[int, int, int, int]) -> None:
    x, y, width, height = box
    sprite = fit(load(relative), width, height)
    canvas.alpha_composite(sprite, (x + (width - sprite.width) // 2, y + height - sprite.height))


def frame(background: str, panel: str, accent: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (SIZE, SIZE), background)
    draw = ImageDraw.Draw(image)
    draw.rectangle((3, 3, 92, 92), fill=panel, outline="#090e12", width=2)
    for coordinate in range(14, 92, 12):
        draw.line((5, coordinate, 90, coordinate), fill="#ffffff16")
        draw.line((coordinate, 5, coordinate, 90), fill="#ffffff10")
    draw.rectangle((5, 86, 90, 90), fill=accent)
    return image, draw


def shared_edit() -> Image.Image:
    image, draw = frame("#102529", "#183c40", "#59c7b0")
    center = (48, 47)
    for target in ((21, 21), (75, 21), (21, 69), (75, 69)):
        draw.line((center[0], center[1], target[0], target[1]), fill="#5dd4cf", width=2)
        draw.rectangle((target[0] - 6, target[1] - 6, target[0] + 6, target[1] + 6), fill="#e6e5d9", outline="#091014")
        draw.rectangle((target[0] - 2, target[1] - 3, target[0] + 2, target[1] + 1), fill="#56b89b")
        draw.line((target[0] - 3, target[1] + 4, target[0] + 3, target[1] + 4), fill="#32454c")
    place(image, "props/root_write_token.png", (36, 34, 24, 27))
    draw.ellipse((39, 38, 57, 56), outline="#a7fff2", width=2)
    return image


def local_copy() -> Image.Image:
    image, draw = frame("#25231e", "#403b31", "#d8ac58")
    place(image, "props/server_rack.png", (9, 24, 30, 58))
    place(image, "props/local_save_slot.png", (59, 38, 28, 42))
    draw.line((38, 49, 47, 49), fill="#7ec7d0", width=2)
    draw.line((53, 49, 60, 49), fill="#7ec7d0", width=2)
    draw.line((45, 42, 55, 56), fill="#e0655b", width=3)
    draw.line((55, 42, 45, 56), fill="#e0655b", width=3)
    draw.rectangle((48, 18, 76, 34), fill="#d7b46b", outline="#0b1014", width=2)
    draw.rectangle((51, 22, 73, 31), fill="#eee9d9")
    draw.line((54, 25, 70, 25), fill="#667477")
    draw.line((54, 28, 67, 28), fill="#667477")
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    covers = {
        "shared_edit": shared_edit(),
        "local_copy": local_copy(),
    }
    rendered: list[Image.Image] = []
    for name, small in covers.items():
        image = small.resize((SIZE * SCALE, SIZE * SCALE), Image.Resampling.NEAREST)
        image.save(OUTPUT / f"{name}.png")
        rendered.append(image)

    contact = Image.new("RGBA", (SIZE * SCALE * 2, SIZE * SCALE), "#080c10")
    for index, image in enumerate(rendered):
        contact.alpha_composite(image, (index * SIZE * SCALE, 0))
    contact.save(SHEET)


if __name__ == "__main__":
    main()
