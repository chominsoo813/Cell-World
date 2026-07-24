from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "pixel-art" / "office-defence"
ARCHIVE_PATH = ROOT / "Cell-Office-Defence-Pixel-Assets.zip"

SHEETS = [
    {
        "file": "office_defence_characters_sheet.png",
        "category": "characters",
        "names": [
            "player_front",
            "player_back",
            "player_left",
            "player_right",
            "zombie_employee_front",
            "zombie_employee_back",
            "zombie_employee_left",
            "zombie_employee_right",
            "zombie_manager_front",
            "zombie_manager_back",
            "zombie_manager_left",
            "zombie_manager_right",
            "paper_monster",
            "monitor_monster",
            "folder_monster",
            "printer_monster",
        ],
    },
    {
        "file": "office_defence_weapons_ui_sheet.png",
        "category": "weapons-ui",
        "names": [
            "paperclip_projectile",
            "stapler_weapon",
            "coffee_projectile",
            "keyboard_weapon",
            "mouse_weapon",
            "usb_weapon",
            "document_projectile",
            "health_heart",
            "xp_gem_small",
            "xp_gem_medium",
            "xp_gem_large",
            "rare_xp_coin",
            "upgrade_damage",
            "upgrade_attack_speed",
            "upgrade_health",
            "upgrade_magnet",
        ],
    },
    {
        "file": "office_defence_boss_environment_sheet.png",
        "category": "environment",
        "names": [
            "boss_front",
            "boss_back",
            "boss_left",
            "boss_right",
            "office_workstation",
            "copier_printer",
            "filing_cabinets",
            "water_cooler",
            "potted_plant",
            "bookshelf",
            "office_desk",
            "floor_tile",
            "boss_fist_projectile",
            "paperclip_swoosh",
            "hit_explosion",
            "alert_exclamation",
        ],
    },
]


def trim_alpha(image: Image.Image, padding: int = 8) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    left, top, right, bottom = bounds
    return image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )


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
    columns = 6
    tile_width = 190
    tile_height = 180
    rows = (len(entries) + columns - 1) // columns
    preview = Image.new(
        "RGB",
        (columns * tile_width, rows * tile_height),
        "#111d27",
    )
    draw = ImageDraw.Draw(preview)
    font = ImageFont.load_default()

    for index, entry in enumerate(entries):
        column = index % columns
        row = index // columns
        x = column * tile_width
        y = row * tile_height
        panel = checkerboard((tile_width - 14, tile_height - 36))
        asset = Image.open(ASSET_DIR / str(entry["path"])).convert("RGBA")
        asset.thumbnail((tile_width - 30, tile_height - 52), Image.Resampling.NEAREST)
        panel.alpha_composite(
            asset,
            (
                (panel.width - asset.width) // 2,
                (panel.height - asset.height) // 2,
            ),
        )
        preview.paste(panel.convert("RGB"), (x + 7, y + 7))
        draw.text(
            (x + 9, y + tile_height - 22),
            str(entry["name"]),
            fill="#f4f7f9",
            font=font,
        )

    preview.save(ASSET_DIR / "office_defence_assets_preview.png", optimize=True)


def main() -> None:
    manifest: list[dict[str, object]] = []

    for sheet in SHEETS:
        source = Image.open(ASSET_DIR / str(sheet["file"])).convert("RGBA")
        category = str(sheet["category"])
        category_dir = ASSET_DIR / category
        category_dir.mkdir(parents=True, exist_ok=True)

        cell_width = source.width / 4
        cell_height = source.height / 4
        names = list(sheet["names"])

        for index, name in enumerate(names):
            column = index % 4
            row = index // 4
            left = round(column * cell_width)
            top = round(row * cell_height)
            right = round((column + 1) * cell_width)
            bottom = round((row + 1) * cell_height)
            asset = trim_alpha(source.crop((left, top, right, bottom)))
            destination = category_dir / f"{name}.png"
            asset.save(destination, optimize=True)
            manifest.append(
                {
                    "name": name,
                    "category": category,
                    "path": destination.relative_to(ASSET_DIR).as_posix(),
                    "width": asset.width,
                    "height": asset.height,
                }
            )

    manifest_path = ASSET_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "collection": "CELL WORLD / Cell Office Defence",
                "assetCount": len(manifest),
                "source": "Generated from the supplied Excel Survivor concept image",
                "assets": manifest,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    create_preview(manifest)

    with ZipFile(ARCHIVE_PATH, "w", ZIP_DEFLATED) as archive:
        for path in sorted(ASSET_DIR.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(ROOT))

    print(f"Created {len(manifest)} transparent PNG assets in {ASSET_DIR}")
    print(f"Created archive at {ARCHIVE_PATH}")


if __name__ == "__main__":
    main()
