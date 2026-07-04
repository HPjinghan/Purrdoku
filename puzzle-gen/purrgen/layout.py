"""Full-solution generation: uniform random permutation-matrix layouts."""

from __future__ import annotations

import random


def generate_solution(n: int, rng: random.Random) -> list[int]:
    """pos[cat] = cell index; rows and columns are both random bijections."""
    rows = list(range(n))
    cols = list(range(n))
    rng.shuffle(rows)
    rng.shuffle(cols)
    return [rows[i] * n + cols[i] for i in range(n)]


def force_cat_at(pos: list[int], n: int, cat: int, cell: int) -> None:
    """Relocate ``cat`` to ``cell`` by swapping row/column assignments, so the
    layout stays a permutation matrix. Used to seed bootstrap pins (a cat
    inside a 1-cell room) for the low difficulty tiers."""
    r, c = divmod(cell, n)
    other = next(i for i, p in enumerate(pos) if p // n == r)
    my_r = pos[cat] // n
    pos[other] = my_r * n + pos[other] % n
    pos[cat] = r * n + pos[cat] % n
    other = next(i for i, p in enumerate(pos) if p % n == c)
    my_c = pos[cat] % n
    pos[other] = (pos[other] // n) * n + my_c
    pos[cat] = r * n + c
