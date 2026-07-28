"""Build transparent Phaser boss sprite sheets from the prototype art boards.

The generated files are committed to ``public``. Re-running this script is only
needed when the original prototype artwork changes.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from shutil import copy2

from PIL import Image


FRAME_SIZE = 192
BOARD_COLUMNS = (
    (20, 398),
    (422, 830),
    (854, 1245),
    (1292, 1696),
)
BOARD_ROWS = ((112, 534), (556, 989))


def remove_board_background(image: Image.Image) -> Image.Image:
    """Convert the dark navy presentation-board background to transparency."""

    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            brightest = max(red, green, blue)

            # Presentation backgrounds sit around RGB 5-30. Feather the edge
            # so dark outlines on the actual boss art are retained.
            alpha = max(0, min(255, (brightest - 31) * 12))

            # Remove the numbered gold marker in the upper-left of each cell.
            if x < 88 and y < 78:
                alpha = 0

            # Presentation cell borders can fall a few pixels inside uneven
            # source panels; they must not appear between Phaser frames.
            if x >= width - 12 or y >= height - 5:
                alpha = 0
            if (
                x >= width - 28
                and red > 130
                and green > 70
                and blue < 100
            ):
                alpha = 0

            pixels[x, y] = (red, green, blue, alpha)

    return rgba


def fit_frame(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    if not bbox:
        return frame

    content = image.crop(bbox)
    max_width = FRAME_SIZE - 12
    max_height = FRAME_SIZE - 10
    scale = min(max_width / content.width, max_height / content.height)
    resized = content.resize(
        (
            max(1, round(content.width * scale)),
            max(1, round(content.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    x = (FRAME_SIZE - resized.width) // 2
    y = FRAME_SIZE - resized.height - 5
    frame.alpha_composite(resized, (x, y))
    return frame


def build_board_sheet(source: Path, destination: Path) -> None:
    board = Image.open(source)
    frames: list[Image.Image] = []

    for y1, y2 in BOARD_ROWS:
        for x1, x2 in BOARD_COLUMNS:
            cell = board.crop((x1, y1, x2, y2))
            frames.append(fit_frame(remove_board_background(cell)))

    sheet = Image.new("RGBA", (FRAME_SIZE * len(frames), FRAME_SIZE))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))

    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dragon", required=True, type=Path)
    parser.add_argument("--giant", required=True, type=Path)
    parser.add_argument("--witch", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    copy2(args.dragon, args.output / "ancient-dragon.png")
    build_board_sheet(args.giant, args.output / "snow-giant-8.png")
    build_board_sheet(args.witch, args.output / "snow-witch-8.png")


if __name__ == "__main__":
    main()
