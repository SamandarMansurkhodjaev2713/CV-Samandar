#!/usr/bin/env python3
"""Normalize generated project covers into the production image contract.

The source art is intentionally kept outside version control. This script performs
only deterministic post-processing: centered 3:1 crop, high-quality resize and the
highest WebP quality that remains inside the site's 150 KB performance budget.
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

from PIL import Image, ImageOps


TARGET_SIZE = (1536, 512)
TARGET_RATIO = TARGET_SIZE[0] / TARGET_SIZE[1]
MAX_BYTES = 150_000
MIN_QUALITY = 52
MAX_QUALITY = 94
EXPECTED_COUNT = 24


def centered_ratio_crop(image: Image.Image) -> Image.Image:
    """Return a centered crop with the exact target aspect ratio."""
    width, height = image.size
    ratio = width / height
    if abs(ratio - TARGET_RATIO) < 1e-9:
        return image
    if ratio > TARGET_RATIO:
        crop_width = round(height * TARGET_RATIO)
        left = (width - crop_width) // 2
        return image.crop((left, 0, left + crop_width, height))
    crop_height = round(width / TARGET_RATIO)
    top = (height - crop_height) // 2
    return image.crop((0, top, width, top + crop_height))


def encode_webp(image: Image.Image, quality: int) -> bytes:
    buffer = io.BytesIO()
    image.save(
        buffer,
        format="WEBP",
        quality=quality,
        method=6,
        exact=True,
        exif=b"",
        xmp=b"",
    )
    return buffer.getvalue()


def best_bounded_webp(image: Image.Image) -> tuple[bytes, int]:
    """Choose the highest integer WebP quality that fits MAX_BYTES."""
    low = MIN_QUALITY
    high = MAX_QUALITY
    winner: tuple[bytes, int] | None = None
    while low <= high:
        quality = (low + high) // 2
        payload = encode_webp(image, quality)
        if len(payload) <= MAX_BYTES:
            winner = (payload, quality)
            low = quality + 1
        else:
            high = quality - 1
    if winner is None:
        payload = encode_webp(image, MIN_QUALITY)
        raise RuntimeError(
            f"cannot reach {MAX_BYTES} bytes at quality {MIN_QUALITY}: {len(payload)} bytes"
        )
    return winner


def process(source: Path, destination: Path) -> tuple[int, int, tuple[int, int]]:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        source_size = image.size
        image = centered_ratio_crop(image)
        image = image.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
        payload, quality = best_bounded_webp(image)

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".tmp.webp")
    temporary.write_bytes(payload)
    with Image.open(temporary) as check:
        if check.format != "WEBP" or check.size != TARGET_SIZE:
            temporary.unlink(missing_ok=True)
            raise RuntimeError(f"invalid output for {destination.name}")
    temporary.replace(destination)
    return len(payload), quality, source_size


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("tmp/project-image-sources"),
        help="directory containing one PNG source per project",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=Path("assets/proj"),
        help="production WebP output directory",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sources = sorted(args.source.glob("*.png"))
    if len(sources) != EXPECTED_COUNT:
        raise RuntimeError(
            f"expected {EXPECTED_COUNT} PNG sources in {args.source}, found {len(sources)}"
        )

    print("project cover                            source       q   bytes")
    print("-" * 70)
    for source in sources:
        destination = args.target / f"{source.stem}.webp"
        size, quality, source_size = process(source, destination)
        dimensions = f"{source_size[0]}x{source_size[1]}"
        print(f"{destination.name:<40} {dimensions:<11} {quality:>2} {size:>7}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # Fail closed: never silently ship a partial asset set.
        print(f"[project-images] {error}", file=sys.stderr)
        raise SystemExit(1)
