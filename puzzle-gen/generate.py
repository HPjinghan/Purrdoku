"""CLI: batch-generate graded puzzles into a static JSON pack.

Usage:
    python generate.py --plan "very-easy:6,easy:6,medium:6,hard:5,expert:3" \
                       --seed 20260704 --out ../web/public/puzzles/puzzles.json
"""

from __future__ import annotations

import argparse
import sys

from purrgen.difficulty import BY_ID, LEVELS
from purrgen.export import export_bundle
from purrgen.pipeline import generate_batch


def parse_plan(text: str) -> dict[str, int]:
    plan: dict[str, int] = {}
    for part in text.split(","):
        lid, _, cnt = part.strip().partition(":")
        if lid not in BY_ID:
            raise SystemExit(f"unknown level '{lid}' (valid: {', '.join(BY_ID)})")
        plan[lid] = int(cnt)
    return plan


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--plan",
        default="very-easy:6,easy:6,medium:6,hard:5,expert:3",
        help="comma list of level:count",
    )
    ap.add_argument("--seed", type=int, default=20260704)
    ap.add_argument("--out", default="../web/public/puzzles/puzzles.json")
    ap.add_argument("--max-attempts", type=int, default=60,
                    help="attempt budget per requested puzzle")
    args = ap.parse_args()

    plan = parse_plan(args.plan)
    print(f"generating plan={plan} seed={args.seed}")
    buckets, stats = generate_batch(plan, args.seed, args.max_attempts)

    print()
    print(f"done in {stats.seconds:.1f}s — attempts={stats.attempts} "
          f"accepted={stats.accepted} dead_end={stats.rejected_dead_end} "
          f"off_target={stats.rejected_off_target}")
    for level in LEVELS:
        if level.id in plan:
            got = buckets[level.id]
            avg_clues = sum(len(p.clues) for p in got) / len(got) if got else 0
            mark = "" if len(got) >= plan[level.id] else "  <-- SHORT"
            print(f"  {level.id:<10} {len(got)}/{plan[level.id]} "
                  f"avg_clues={avg_clues:.1f}{mark}")
    if stats.type_counts:
        total = sum(stats.type_counts.values())
        mix = ", ".join(f"{t}={c}" for t, c in sorted(stats.type_counts.items()))
        print(f"  clue mix ({total}): {mix}")

    missing = [lid for lid, want in plan.items() if len(buckets[lid]) < want]
    bundle = export_bundle(buckets, args.out)
    print(f"wrote {bundle['count']} puzzles -> {args.out}")
    if missing:
        print(f"WARNING: buckets not filled: {missing}")
        sys.exit(2)


if __name__ == "__main__":
    main()
