from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/pixel-art/office-ref"
OUTPUT = ASSETS / "office-ref-assets-preview.png"
CROP_REVIEW_OUTPUT = ASSETS / "office-ref-crop-review.png"
GROUPS = [
    ("FUNCTIONS", ASSETS / "ui/functions"),
    ("STATUS", ASSETS / "ui/status"),
    ("UTILITY", ASSETS / "ui/utility"),
    ("ENVIRONMENT", ASSETS / "environment"),
    ("NEW CHARACTERS", ASSETS / "characters"),
    ("NEW PROPS", ASSETS / "props"),
    ("SESSION COVERS", ASSETS / "ui/session-covers"),
    ("ENDING COVERS", ASSETS / "ui/endings"),
]
EXISTING_CHARACTER_PREFIXES = ("junior_", "coworker_", "team_leader_", "manager_vlookup_")
EXISTING_PROP_NAMES = {
    "approval_stamp.png",
    "calc_recharge_node.png",
    "copier_paper_box.png",
    "evaluation_terminal.png",
    "meeting_projector.png",
    "mobile_filing_cabinet.png",
    "office_elevator.png",
    "organization_chart.png",
    "paper_shredder.png",
    "security_turnstile.png",
    "server_rack.png",
    "time_clock_terminal.png",
}
CROP_REVIEW_PATHS = [
    "characters/manager_vlookup_front.png",
    "characters/manager_vlookup_back.png",
    "characters/manager_vlookup_left.png",
    "characters/manager_vlookup_right.png",
    "characters/vp_drop_front.png",
    "characters/vp_drop_back.png",
    "characters/vp_drop_left.png",
    "characters/vp_drop_right.png",
    "environment/bookshelf.png",
    "environment/office_chair.png",
    "environment/potted_plant.png",
    "environment/water_cooler.png",
    "props/office_elevator.png",
    "props/organization_chart.png",
    "props/root_lock.png",
]


def files_for(title: str, folder: Path) -> list[Path]:
    files = sorted(folder.glob("*.png")) if folder.exists() else []
    if title == "NEW CHARACTERS":
        files = [file for file in files if not file.stem.startswith(EXISTING_CHARACTER_PREFIXES)]
    if title == "NEW PROPS":
        files = [file for file in files if file.name not in EXISTING_PROP_NAMES]
    return files


def checker(draw: ImageDraw.ImageDraw, left: int, top: int, size: int) -> None:
    block = 8
    for y in range(top, top + size, block):
        for x in range(left, left + size, block):
            color = "#30343a" if ((x - left) // block + (y - top) // block) % 2 == 0 else "#24282e"
            draw.rectangle((x, y, min(x + block - 1, left + size - 1), min(y + block - 1, top + size - 1)), fill=color)


def main() -> None:
    columns = 8
    cell_width = 128
    image_size = 104
    label_height = 22
    header_height = 30
    sections = [(title, files_for(title, folder)) for title, folder in GROUPS]
    rows = sum((len(files) + columns - 1) // columns for _, files in sections)
    height = 18 + len(sections) * header_height + rows * (image_size + label_height + 8)
    preview = Image.new("RGB", (columns * cell_width + 16, height), "#15191e")
    draw = ImageDraw.Draw(preview)
    font = ImageFont.load_default()
    y = 10

    for title, files in sections:
        draw.rectangle((8, y, preview.width - 8, y + header_height - 4), fill="#203b3b")
        draw.text((16, y + 7), f"{title} ({len(files)})", fill="#dce7e3", font=font)
        y += header_height
        for index, path in enumerate(files):
            column = index % columns
            row = index // columns
            left = 12 + column * cell_width
            top = y + row * (image_size + label_height + 8)
            checker(draw, left, top, image_size)
            sprite = Image.open(path).convert("RGBA")
            scale = min((image_size - 8) / sprite.width, (image_size - 8) / sprite.height)
            sprite = sprite.resize(
                (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
                Image.Resampling.NEAREST,
            )
            position = (left + (image_size - sprite.width) // 2, top + (image_size - sprite.height) // 2)
            preview.paste(sprite, position, sprite)
            label = path.stem[:19]
            draw.text((left, top + image_size + 4), label, fill="#c8cdd2", font=font)
        y += ((len(files) + columns - 1) // columns) * (image_size + label_height + 8)

    preview.crop((0, 0, preview.width, y + 8)).save(OUTPUT)

    review_columns = 5
    review_cell_width = 176
    review_image_size = 144
    review_rows = (len(CROP_REVIEW_PATHS) + review_columns - 1) // review_columns
    review = Image.new(
        "RGB",
        (review_columns * review_cell_width + 16, review_rows * 178 + 20),
        "#15191e",
    )
    review_draw = ImageDraw.Draw(review)
    for index, relative in enumerate(CROP_REVIEW_PATHS):
        path = ASSETS / relative
        column = index % review_columns
        row = index // review_columns
        left = 12 + column * review_cell_width
        top = 10 + row * 178
        checker(review_draw, left, top, review_image_size)
        sprite = Image.open(path).convert("RGBA")
        scale = min((review_image_size - 12) / sprite.width, (review_image_size - 12) / sprite.height)
        sprite = sprite.resize(
            (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
            Image.Resampling.NEAREST,
        )
        position = (
            left + (review_image_size - sprite.width) // 2,
            top + (review_image_size - sprite.height) // 2,
        )
        review.paste(sprite, position, sprite)
        review_draw.text((left, top + review_image_size + 6), path.stem[:24], fill="#d4d9dd", font=font)
    review.save(CROP_REVIEW_OUTPUT)


if __name__ == "__main__":
    main()
