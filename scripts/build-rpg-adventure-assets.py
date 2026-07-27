"""Build deterministic 8-frame RPG monster sheets from the licensed prototype assets.

The source sheets contain three to five 48px poses per animation row.  Phaser
expects a consistent eight-frame row, so this tool samples the original poses
forward and backward without interpolation.  Snow variants are recolored from
the same pixel-perfect source and keep the original alpha channel.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "pixel-art" / "rpg" / "adventure"
SOURCE_ROOT = ASSET_ROOT / "monster-sources"
OUTPUT_ROOT = ASSET_ROOT / "monsters"
FRAME_SIZE = 48
TARGET_COLUMNS = 8


MONSTERS = {
    "bat": "bat.png",
    "dark-mage": "dark_mage.png",
    "goblin": "goblin.png",
    "mimic": "mimic.png",
    "orc": "orc_warrior.png",
    "skeleton": "skeleton.png",
    "skeleton-archer": "skeleton_archer.png",
    "slime": "slime.png",
    "wolf": "wolf.png",
    "zombie": "zombie.png",
}


def ping_pong_indices(source_columns: int) -> list[int]:
    if source_columns <= 1:
        return [0] * TARGET_COLUMNS
    cycle = list(range(source_columns)) + list(range(source_columns - 2, 0, -1))
    return [cycle[index % len(cycle)] for index in range(TARGET_COLUMNS)]


def to_frost_variant(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    red, green, blue, alpha = rgba.split()
    frozen = Image.merge(
        "RGBA",
        (
            red.point(lambda value: int(value * 0.62)),
            green.point(lambda value: min(255, int(value * 0.92 + 24))),
            blue.point(lambda value: min(255, int(value * 1.18 + 36))),
            alpha,
        ),
    )
    return ImageEnhance.Contrast(frozen).enhance(1.08)


def build_sheet(source_path: Path, output_path: Path, frost: bool = False) -> None:
    source = Image.open(source_path).convert("RGBA")
    columns = source.width // FRAME_SIZE
    rows = source.height // FRAME_SIZE
    indices = ping_pong_indices(columns)
    output = Image.new(
        "RGBA",
        (TARGET_COLUMNS * FRAME_SIZE, rows * FRAME_SIZE),
        (0, 0, 0, 0),
    )

    for row in range(rows):
        for target_column, source_column in enumerate(indices):
            left = source_column * FRAME_SIZE
            top = row * FRAME_SIZE
            frame = source.crop(
                (left, top, left + FRAME_SIZE, top + FRAME_SIZE),
            )
            if frost:
                frame = to_frost_variant(frame)
            output.alpha_composite(
                frame,
                (target_column * FRAME_SIZE, row * FRAME_SIZE),
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_path, optimize=True)


def main() -> None:
    for monster_id, filename in MONSTERS.items():
        build_sheet(SOURCE_ROOT / filename, OUTPUT_ROOT / f"{monster_id}-8.png")

    frost_sources = {
        "frost-bat": "bat.png",
        "frost-goblin": "goblin.png",
        "frost-orc": "orc_warrior.png",
        "frost-slime": "slime.png",
        "frost-wolf": "wolf.png",
    }
    for monster_id, filename in frost_sources.items():
        build_sheet(
            SOURCE_ROOT / filename,
            OUTPUT_ROOT / f"{monster_id}-8.png",
            frost=True,
        )


if __name__ == "__main__":
    main()
