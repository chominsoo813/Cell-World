from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Split a regular office-ref sprite sheet into normalized PNG files.")
    parser.add_argument("sheet", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--columns", type=int, required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--names", nargs="+", required=True)
    parser.add_argument("--size", type=int, default=256)
    parser.add_argument("--padding", type=int, default=16)
    parser.add_argument("--alpha-threshold", type=int, default=24)
    return parser.parse_args()


def clean_components(cell: Image.Image, alpha_threshold: int) -> Image.Image:
    """Remove distant fragments leaked from neighboring grid cells."""
    alpha = np.asarray(cell.getchannel("A"))
    mask = alpha >= alpha_threshold
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    components: list[tuple[int, tuple[int, int, int, int], list[tuple[int, int]]]] = []

    for y in range(height):
        for x in range(width):
            if not mask[y, x] or visited[y, x]:
                continue
            queue = deque([(x, y)])
            visited[y, x] = True
            pixels: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                current_x, current_y = queue.popleft()
                pixels.append((current_x, current_y))
                min_x = min(min_x, current_x)
                max_x = max(max_x, current_x)
                min_y = min(min_y, current_y)
                max_y = max(max_y, current_y)
                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if (
                        0 <= next_x < width
                        and 0 <= next_y < height
                        and mask[next_y, next_x]
                        and not visited[next_y, next_x]
                    ):
                        visited[next_y, next_x] = True
                        queue.append((next_x, next_y))

            components.append((len(pixels), (min_x, min_y, max_x + 1, max_y + 1), pixels))

    if not components:
        return cell

    components.sort(key=lambda item: item[0], reverse=True)
    primary_area, primary_box, _ = components[0]
    primary_width = primary_box[2] - primary_box[0]
    primary_height = primary_box[3] - primary_box[1]
    margin = max(5, round(max(primary_width, primary_height) * 0.16))
    expanded = (
        max(0, primary_box[0] - margin),
        max(0, primary_box[1] - margin),
        min(width, primary_box[2] + margin),
        min(height, primary_box[3] + margin),
    )

    def intersects(box: tuple[int, int, int, int]) -> bool:
        return not (
            box[2] <= expanded[0]
            or box[0] >= expanded[2]
            or box[3] <= expanded[1]
            or box[1] >= expanded[3]
        )

    keep = np.zeros_like(mask, dtype=bool)
    for area, box, pixels in components:
        touches_cell_edge = box[0] <= 2 or box[1] <= 2 or box[2] >= width - 2 or box[3] >= height - 2
        # Large disconnected halves are valid for icons such as broken references.
        # Tiny pieces are retained only when they sit close to the primary silhouette.
        should_keep = area >= primary_area * 0.35 or (area >= 4 and intersects(box))
        if touches_cell_edge and area < primary_area * 0.75:
            should_keep = False
        if should_keep:
            for x, y in pixels:
                keep[y, x] = True

    result = cell.copy()
    result_alpha = np.asarray(result.getchannel("A")).copy()
    result_alpha[~keep] = 0
    result.putalpha(Image.fromarray(result_alpha, mode="L"))
    return result


def main() -> None:
    args = parse_args()
    expected = args.columns * args.rows
    if len(args.names) != expected:
        raise SystemExit(f"expected {expected} names, received {len(args.names)}")

    sheet = Image.open(args.sheet).convert("RGBA")
    args.output_dir.mkdir(parents=True, exist_ok=True)

    x_edges = [round(sheet.width * index / args.columns) for index in range(args.columns + 1)]
    y_edges = [round(sheet.height * index / args.rows) for index in range(args.rows + 1)]
    usable = args.size - args.padding * 2

    for index, name in enumerate(args.names):
        row, column = divmod(index, args.columns)
        cell = sheet.crop((x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1]))
        cell = clean_components(cell, args.alpha_threshold)
        alpha_box = cell.getchannel("A").getbbox()
        if alpha_box is None:
            raise SystemExit(f"cell {index} ({name}) has no visible pixels")
        sprite = cell.crop(alpha_box)

        scale = min(usable / sprite.width, usable / sprite.height, 1.0)
        if scale < 1.0:
            sprite = sprite.resize(
                (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
                Image.Resampling.NEAREST,
            )

        canvas = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
        position = ((args.size - sprite.width) // 2, (args.size - sprite.height) // 2)
        canvas.alpha_composite(sprite, position)
        canvas.save(args.output_dir / f"{name}.png")


if __name__ == "__main__":
    main()
