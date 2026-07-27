from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "pixel-art" / "rpg" / "characters_sheet.png"
OUTPUT = SOURCE.parent

DIRECTIONS = ("front", "back", "left", "right")
ROWS = {
    "goblin": 6,
    "goblin_boss": 7,
    "knight": 3,
}


def extract_sprite(sheet: Image.Image, row: int, column: int) -> Image.Image:
    cell_width = sheet.width / 4
    cell_height = sheet.height / 8
    left = round(column * cell_width)
    top = round(row * cell_height)
    right = round((column + 1) * cell_width)
    bottom = round((row + 1) * cell_height)
    cell = sheet.crop((left, top, right, bottom))

    alpha_bounds = cell.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise RuntimeError(f"No sprite found at row={row}, column={column}")

    sprite = cell.crop(alpha_bounds)
    max_size = 21
    scale = min(max_size / sprite.width, max_size / sprite.height)
    resized = sprite.resize(
        (
            max(1, round(sprite.width * scale)),
            max(1, round(sprite.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (24, 24))
    x = (24 - resized.width) // 2
    y = 23 - resized.height
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main() -> None:
    sheet = Image.open(SOURCE).convert("RGBA")
    for name, row in ROWS.items():
        for column, direction in enumerate(DIRECTIONS):
            output_path = OUTPUT / f"{name}_{direction}.png"
            extract_sprite(sheet, row, column).save(output_path)
            print(output_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
