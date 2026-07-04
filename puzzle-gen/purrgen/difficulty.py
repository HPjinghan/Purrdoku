"""Difficulty levels (spec 4.5): keyed by the hardest reasoning tier the
logical solver needed, with a grid-size band per level.

Rule tiers stop at 4 (chains). 困难 vs 专家 both need chains — they are
split by how hard the chain work was (单链 versus 深链/多步前瞻): a puzzle
is 专家 if any single chain refutation needed a deep propagation
(``chain_depth`` >= EXPERT_CHAIN_DEPTH) or several chain passes were
required (``chain_passes`` >= EXPERT_CHAIN_PASSES).
"""

from __future__ import annotations

from dataclasses import dataclass

EXPERT_CHAIN_DEPTH = 5  # a single refutation needing >= this many prop steps
EXPERT_CHAIN_PASSES = 4  # ... or this many separate chain passes


@dataclass(frozen=True)
class Level:
    id: str
    name_zh: str
    tier: int  # difficulty rank 1..5; solver rule cap is min(tier, 4)
    sizes: tuple[int, int]  # inclusive (min_n, max_n)

    @property
    def solve_cap(self) -> int:
        return min(self.tier, 4)


LEVELS: list[Level] = [
    Level("very-easy", "入门", 1, (6, 6)),
    Level("easy", "简单", 2, (6, 7)),
    Level("medium", "中等", 3, (7, 8)),
    Level("hard", "困难", 4, (8, 9)),
    Level("expert", "专家", 5, (9, 9)),
]

BY_ID = {lv.id: lv for lv in LEVELS}
BY_TIER = {lv.tier: lv for lv in LEVELS}


def grade(measured_tier: int, chain_depth: int, chain_passes: int) -> int:
    """Difficulty rank 1..5 from the measuring solve."""
    if measured_tier < 4:
        return measured_tier
    deep = chain_depth >= EXPERT_CHAIN_DEPTH or chain_passes >= EXPERT_CHAIN_PASSES
    return 5 if deep else 4


def level_for(measured_tier: int, chain_depth: int, chain_passes: int, n: int) -> Level | None:
    """Bucket a measured puzzle; None if the grid size falls outside the band."""
    lv = BY_TIER.get(grade(measured_tier, chain_depth, chain_passes))
    if lv is None:
        return None
    lo, hi = lv.sizes
    return lv if lo <= n <= hi else None
