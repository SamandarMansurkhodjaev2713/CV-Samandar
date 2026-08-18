"""Create the deterministic responsive Hero image set.

The source is an uncompressed image-generation master. The site ships only the
three WebP derivatives below; keeping this tiny helper makes the responsive
asset reproducible without introducing a runtime image dependency.

Install the pinned offline design dependency first:
    python -m pip install -r scripts/requirements-image-tools.txt
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps


SIZES = (1536, 1152, 768)


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: process-hero-image.py SOURCE DESTINATION_DIR")

    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    responsive = destination / "responsive"
    responsive.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as opened:
        master = ImageOps.exif_transpose(opened).convert("RGB")
        if master.size != (1536, 1024):
            master = ImageOps.fit(master, (1536, 1024), method=Image.Resampling.LANCZOS)

        for width in SIZES:
            height = width * 2 // 3
            resized = master if width == 1536 else master.resize(
                (width, height), Image.Resampling.LANCZOS
            )
            target = (
                destination / "release-gate.webp"
                if width == 1536
                else responsive / f"release-gate-{width}.webp"
            )
            resized.save(target, "WEBP", quality=84, method=6, exact=True)
            print(f"{target}: {width}x{height} ({target.stat().st_size} bytes)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
