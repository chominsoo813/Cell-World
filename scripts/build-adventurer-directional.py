"""Normalize the approved four-direction adventurer sheet for Phaser."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME_SIZE = 64
ROWS = 4
SOURCE_COLUMNS = 7
OUTPUT_COLUMNS = 8


def find_column_spans(image: Image.Image, row: int) -> list[tuple[int, int]]:
    top = round(row * image.height / ROWS)
    bottom = round((row + 1) * image.height / ROWS)
    alpha = image.getchannel("A").crop((0, top, image.width, bottom))
    occupied = [
        alpha.crop((x, 0, x + 1, alpha.height)).getbbox() is not None
        for x in range(alpha.width)
    ]
    spans: list[tuple[int, int]] = []
    start: int | None = None
    for x, has_pixels in enumerate(occupied):
        if has_pixels and start is None:
            start = x
        elif not has_pixels and start is not None:
            spans.append((max(0, start - 8), min(image.width, x + 8)))
            start = None
    if start is not None:
        spans.append((max(0, start - 8), image.width))
    if len(spans) != SOURCE_COLUMNS:
        raise ValueError(
            f"Expected {SOURCE_COLUMNS} sprites in row {row}, found {len(spans)}",
        )
    return spans


def frame_from_cell(
    image: Image.Image,
    span: tuple[int, int],
    row: int,
) -> Image.Image:
    left, right = span
    top = round(row * image.height / ROWS)
    bottom = round((row + 1) * image.height / ROWS)
    cell = image.crop((left, top, right, bottom)).convert("RGBA")
    alpha_box = cell.getchannel("A").getbbox()
    return cell.crop(alpha_box) if alpha_box else Image.new("RGBA", (1, 1))


def fit_frame(source: Image.Image) -> Image.Image:
    frame = source.copy()
    frame.thumbnail((60, 61), Image.Resampling.NEAREST)
    output = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    output.alpha_composite(
        frame,
        ((FRAME_SIZE - frame.width) // 2, FRAME_SIZE - frame.height - 1),
    )
    return output


def build(source_path: Path, output_path: Path, preview_path: Path) -> None:
    source = Image.open(source_path).convert("RGBA")
    output = Image.new(
        "RGBA",
        (FRAME_SIZE * OUTPUT_COLUMNS, FRAME_SIZE * ROWS),
    )
    first_front: Image.Image | None = None

    for row in range(ROWS):
        spans = find_column_spans(source, row)
        source_frames = [
            fit_frame(frame_from_cell(source, span, row))
            for span in spans
        ]
        cycle = [*source_frames, source_frames[0]]
        for column, frame in enumerate(cycle):
            output.alpha_composite(
                frame,
                (column * FRAME_SIZE, row * FRAME_SIZE),
            )
        if row == 0:
            first_front = source_frames[0]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_path, optimize=True)
    if first_front is not None:
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        first_front.save(preview_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--preview", required=True, type=Path)
    arguments = parser.parse_args()
    build(arguments.source, arguments.output, arguments.preview)


if __name__ == "__main__":
    main()
