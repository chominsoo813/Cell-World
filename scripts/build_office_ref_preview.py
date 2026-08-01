from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/pixel-art/office-ref"
OUTPUT = ASSETS / "office-ref-assets-preview.png"
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


if __name__ == "__main__":
    main()
