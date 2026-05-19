"""Remove white background from golden record ASCII art image.
Usage: python remove_bg.py <input_path> [output_path]
Default output: ../public/golden-record.png
"""
import sys
from pathlib import Path
from PIL import Image


def remove_white_bg(input_path: str, output_path: str, threshold: int = 240) -> None:
    img = Image.open(input_path).convert("RGBA")
    pixels = list(img.getdata())

    new_pixels = []
    for r, g, b, a in pixels:
        if r >= threshold and g >= threshold and b >= threshold:
            new_pixels.append((r, g, b, 0))
        else:
            new_pixels.append((r, g, b, a))

    img.putdata(new_pixels)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Saved → {output_path}  ({img.width}×{img.height}px)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_bg.py <input_image> [output_path]")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else str(
        Path(__file__).parent.parent / "public" / "golden-record.png"
    )
    remove_white_bg(inp, out)
