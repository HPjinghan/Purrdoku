"""Static JSON puzzle-pack export (logic layer only — the theme skin is
applied by the frontend at render time, spec 10.7)."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from .difficulty import LEVELS
from .pipeline import Puzzle


def export_bundle(buckets: dict[str, list[Puzzle]], out_path: str) -> dict:
    puzzles = []
    for level in LEVELS:
        for puz in buckets.get(level.id, []):
            puzzles.append(puz.to_json())
    bundle = {
        "version": 1,
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(puzzles),
        "puzzles": puzzles,
    }
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return bundle
