"""Build the CELL WORLD adventurer sprites from the two approved concept sheets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter


FRAME_SIZE = 64
SHEET_SIZE = FRAME_SIZE * 8


def remove_dark_background(source: Image.Image) -> Image.Image:
    image = source.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    initial_mask = Image.new("L", image.size)
    mask_pixels = initial_mask.load()

    for y in range(height):
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            brightness = max(red, green, blue)
            chroma = max(red, green, blue) - min(red, green, blue)
            mask_pixels[x, y] = 255 if (
                (brightness >= 38 and chroma >= 9) or brightness >= 105
            ) else 0

    expanded = initial_mask.filter(ImageFilter.MaxFilter(5))
    expanded_pixels = expanded.load()
    alpha = Image.new("L", image.size)
    alpha_pixels = alpha.load()

    for y in range(height):
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            brightness = max(red, green, blue)
            alpha_pixels[x, y] = (
                255 if expanded_pixels[x, y] and brightness >= 12 else 0
            )

    image.putalpha(alpha)
    box = alpha.getbbox()
    return image.crop(box) if box else Image.new("RGBA", (1, 1))


def extract_cells(
    image: Image.Image,
    row_boxes: tuple[tuple[int, int], tuple[int, int]],
) -> list[Image.Image]:
    frames: list[Image.Image] = []
    column_width = image.width // 4
    for row_start, row_end in row_boxes:
        for column in range(4):
            left = column * column_width
            right = (column + 1) * column_width
            frames.append(
                remove_dark_background(
                    image.crop((left, row_start, right, row_end)),
                ),
            )
    return frames


def place_frame(
    sheet: Image.Image,
    source: Image.Image,
    column: int,
    row: int,
    *,
    rotation: float = 0,
    vertical_offset: int = 0,
) -> None:
    frame = source.copy()
    frame.thumbnail((56, 59), Image.Resampling.NEAREST)
    if rotation:
        frame = frame.rotate(
            rotation,
            expand=True,
            resample=Image.Resampling.NEAREST,
        )
        frame.thumbnail((58, 60), Image.Resampling.NEAREST)
    x = column * FRAME_SIZE + (FRAME_SIZE - frame.width) // 2
    y = (
        row * FRAME_SIZE
        + FRAME_SIZE
        - frame.height
        - 2
        + vertical_offset
    )
    sheet.alpha_composite(frame, (x, y))


def build_sheet(pose_path: Path, walk_path: Path, output: Path) -> None:
    pose_image = Image.open(pose_path)
    walk_image = Image.open(walk_path)
    poses = extract_cells(pose_image, ((48, 465), (510, 925)))
    walks = extract_cells(walk_image, ((42, 405), (510, 875)))

    idle_cycle = [walks[0], walks[0], walks[7], walks[7]] * 2
    walk_cycle = walks
    run_cycle = [walks[index] for index in (1, 2, 3, 4, 5, 6, 2, 6)]
    attack_cycle = [poses[index] for index in (4, 5, 6, 7, 4, 5, 6, 7)]
    followup_cycle = [poses[index] for index in (7, 4, 5, 6, 7, 4, 5, 6)]
    skill_cycle = [poses[index] for index in (4, 5, 6, 7, 4, 5, 6, 7)]
    hit_cycle = [poses[6], poses[6], poses[7], poses[7]] * 2
    death_cycle = [poses[6]] * 8

    sheet = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE))
    for row, cycle in enumerate(
        (
            idle_cycle,
            walk_cycle,
            run_cycle,
            attack_cycle,
            followup_cycle,
            skill_cycle,
            hit_cycle,
            death_cycle,
        ),
    ):
        for column, frame in enumerate(cycle):
            rotation = 0
            vertical_offset = 0
            if row == 0:
                vertical_offset = -1 if column in (2, 3, 6, 7) else 0
            if row == 7:
                rotation = min(82, column * 12)
                vertical_offset = min(10, column * 2)
            place_frame(
                sheet,
                frame,
                column,
                row,
                rotation=rotation,
                vertical_offset=vertical_offset,
            )

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, optimize=True)

    icon = Image.new("RGBA", (128, 128))
    portrait = poses[0].copy()
    portrait.thumbnail((108, 116), Image.Resampling.NEAREST)
    icon.alpha_composite(
        portrait,
        ((128 - portrait.width) // 2, 128 - portrait.height - 5),
    )
    icon_path = output.parent.parent / "skill-icons" / "adventurer.png"
    icon_path.parent.mkdir(parents=True, exist_ok=True)
    icon.save(icon_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pose", required=True, type=Path)
    parser.add_argument("--walk", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    arguments = parser.parse_args()
    build_sheet(arguments.pose, arguments.walk, arguments.output)


if __name__ == "__main__":
    main()
