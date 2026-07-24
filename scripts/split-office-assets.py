from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "pixel-art" / "office-escape"

SHEETS = [
    {
        "file": "office_characters_sheet.png",
        "category": "characters",
        "columns": 4,
        "rows": 2,
        "names": [
            "player_front",
            "player_back",
            "player_left",
            "player_right",
            "guard_front",
            "guard_back",
            "guard_left",
            "guard_right",
        ],
    },
    {
        "file": "office_furniture_sheet.png",
        "category": "furniture",
        "columns": 4,
        "rows": 4,
        "names": [
            "office_desk",
            "computer_monitor",
            "keyboard",
            "office_chair_green",
            "conference_table_set",
            "conference_chair_blue",
            "executive_desk",
            "copier_printer",
            "water_dispenser",
            "potted_plant",
            "bookshelf",
            "filing_cabinet",
            "office_sofa",
            "coffee_table",
            "exit_door",
            "partition_wall",
        ],
    },
    {
        "file": "office_mission_ui_sheet.png",
        "category": "mission-ui",
        "columns": 4,
        "rows": 4,
        "names": [
            "report_document",
            "budget_document",
            "id_list_document",
            "usb_drive",
            "keycard",
            "item_highlight",
            "exit_arrow",
            "office_clock",
            "cctv_camera",
            "alarm_siren",
            "guard_vision_cone",
            "alert_exclamation",
            "carpet_tile",
            "wall_straight",
            "wall_corner",
            "doorway_threshold",
        ],
    },
]


def trim_alpha(image: Image.Image, padding: int = 6) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    left, top, right, bottom = bounds
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def connected_runs(alpha: Image.Image) -> list[dict[str, object]]:
    mask = np.asarray(alpha) > 2
    parent: list[int] = []
    records: list[tuple[int, int, int, int]] = []
    previous: list[tuple[int, int, int]] = []

    def make_label() -> int:
        label = len(parent)
        parent.append(label)
        return label

    def find(label: int) -> int:
        while parent[label] != label:
            parent[label] = parent[parent[label]]
            label = parent[label]
        return label

    def union(first: int, second: int) -> None:
        first_root = find(first)
        second_root = find(second)
        if first_root != second_root:
            parent[second_root] = first_root

    for y, row in enumerate(mask):
        pixels = np.flatnonzero(row)
        current: list[tuple[int, int, int]] = []
        if pixels.size:
            breaks = np.flatnonzero(np.diff(pixels) > 1)
            starts = np.concatenate(([0], breaks + 1))
            ends = np.concatenate((breaks, [pixels.size - 1]))
            previous_index = 0

            for start_index, end_index in zip(starts, ends, strict=True):
                start = int(pixels[start_index])
                end = int(pixels[end_index])
                label = make_label()

                while (
                    previous_index < len(previous)
                    and previous[previous_index][1] < start - 1
                ):
                    previous_index += 1

                overlap_index = previous_index
                while (
                    overlap_index < len(previous)
                    and previous[overlap_index][0] <= end + 1
                ):
                    union(label, previous[overlap_index][2])
                    overlap_index += 1

                current.append((start, end, label))
                records.append((y, start, end, label))
        previous = current

    components: dict[int, dict[str, object]] = {}
    for y, start, end, label in records:
        root = find(label)
        length = end - start + 1
        component = components.setdefault(
            root,
            {
                "runs": [],
                "area": 0,
                "sum_x": 0.0,
                "sum_y": 0.0,
                "left": start,
                "top": y,
                "right": end + 1,
                "bottom": y + 1,
            },
        )
        component["runs"].append((y, start, end))
        component["area"] += length
        component["sum_x"] += (start + end) * length / 2
        component["sum_y"] += y * length
        component["left"] = min(int(component["left"]), start)
        component["top"] = min(int(component["top"]), y)
        component["right"] = max(int(component["right"]), end + 1)
        component["bottom"] = max(int(component["bottom"]), y + 1)

    return [component for component in components.values() if int(component["area"]) >= 12]


def component_asset_index(
    component: dict[str, object],
    width: int,
    height: int,
    columns: int,
    rows: int,
    category: str,
) -> int:
    area = int(component["area"])
    center_x = float(component["sum_x"]) / area
    center_y = float(component["sum_y"]) / area

    column = min(columns - 1, max(0, int(center_x * columns / width)))
    row = min(rows - 1, max(0, int(center_y * rows / height)))

    # The generated conference-table set intentionally includes chairs that
    # extend slightly into the next grid cell.
    if category == "furniture" and row == 1 and center_x < 500:
        return 4

    # The EXIT sign sits above the door and crosses the row boundary.
    if (
        category == "furniture"
        and column == 2
        and center_y > 700
        and center_x > 780
    ):
        return 14

    return row * columns + column


def split_by_components(
    source: Image.Image,
    columns: int,
    rows: int,
    names: list[str],
    category: str,
) -> list[Image.Image]:
    components = connected_runs(source.getchannel("A"))
    grouped_runs: list[list[tuple[int, int, int]]] = [[] for _ in names]

    for component in components:
        index = component_asset_index(
            component,
            source.width,
            source.height,
            columns,
            rows,
            category,
        )
        grouped_runs[index].extend(component["runs"])

    assets: list[Image.Image] = []
    source_alpha = source.getchannel("A")
    for runs in grouped_runs:
        if not runs:
            assets.append(Image.new("RGBA", (1, 1), (0, 0, 0, 0)))
            continue

        left = min(start for _, start, _ in runs)
        top = min(y for y, _, _ in runs)
        right = max(end for _, _, end in runs) + 1
        bottom = max(y for y, _, _ in runs) + 1
        padding = 6
        left = max(0, left - padding)
        top = max(0, top - padding)
        right = min(source.width, right + padding)
        bottom = min(source.height, bottom + padding)

        mask = Image.new("L", (right - left, bottom - top), 0)
        draw = ImageDraw.Draw(mask)
        for y, start, end in runs:
            draw.line((start - left, y - top, end - left, y - top), fill=255)

        asset = source.crop((left, top, right, bottom))
        original_alpha = source_alpha.crop((left, top, right, bottom))
        asset.putalpha(Image.composite(original_alpha, Image.new("L", mask.size), mask))
        assets.append(trim_alpha(asset))

    return assets


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    canvas = Image.new("RGBA", size, "#d9dde2")
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle(
                    (x, y, min(size[0], x + cell), min(size[1], y + cell)),
                    fill="#f4f6f8",
                )
    return canvas


def create_preview(entries: list[dict[str, object]]) -> None:
    columns = 5
    tile_width = 220
    tile_height = 190
    rows = (len(entries) + columns - 1) // columns
    preview = Image.new(
        "RGB",
        (columns * tile_width, rows * tile_height),
        "#172029",
    )
    draw = ImageDraw.Draw(preview)
    font = ImageFont.load_default()

    for index, entry in enumerate(entries):
        column = index % columns
        row = index // columns
        x = column * tile_width
        y = row * tile_height
        panel = checkerboard((tile_width - 16, tile_height - 38))

        asset = Image.open(ASSET_DIR / str(entry["path"])).convert("RGBA")
        asset.thumbnail((tile_width - 36, tile_height - 58), Image.Resampling.NEAREST)
        panel.alpha_composite(
            asset,
            (
                (panel.width - asset.width) // 2,
                (panel.height - asset.height) // 2,
            ),
        )
        preview.paste(panel.convert("RGB"), (x + 8, y + 8))
        draw.text(
            (x + 10, y + tile_height - 24),
            str(entry["name"]),
            fill="#f4f7f9",
            font=font,
        )

    preview.save(ASSET_DIR / "office_escape_assets_preview.png", optimize=True)


def main() -> None:
    manifest: list[dict[str, object]] = []

    for sheet in SHEETS:
        source = Image.open(ASSET_DIR / str(sheet["file"])).convert("RGBA")
        category_dir = ASSET_DIR / str(sheet["category"])
        category_dir.mkdir(parents=True, exist_ok=True)

        names = list(sheet["names"])
        assets = split_by_components(
            source,
            int(sheet["columns"]),
            int(sheet["rows"]),
            names,
            str(sheet["category"]),
        )
        for name, asset in zip(names, assets, strict=True):
            destination = category_dir / f"{name}.png"
            asset.save(destination, optimize=True)
            manifest.append(
                {
                    "name": name,
                    "category": sheet["category"],
                    "path": destination.relative_to(ASSET_DIR).as_posix(),
                    "width": asset.width,
                    "height": asset.height,
                }
            )

    (ASSET_DIR / "manifest.json").write_text(
        json.dumps(
            {
                "collection": "CELL WORLD / Cell Office Keeper",
                "assetCount": len(manifest),
                "assets": manifest,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    create_preview(manifest)
    print(f"Created {len(manifest)} transparent PNG assets in {ASSET_DIR}")


if __name__ == "__main__":
    main()
