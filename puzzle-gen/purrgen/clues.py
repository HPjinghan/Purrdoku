"""Candidate clue pool: every fact is read off the known solution, so it is
true by construction. Selection/trimming happens later in the pipeline."""

from __future__ import annotations

import random

from .model import (
    AT_CELL,
    CELL_SIZE,
    DIAG_ADJ,
    DIFF_ROOM,
    IN_ROOM,
    NOT_IN_ROOM,
    RELPOS,
    SAME_ROOM,
    Clue,
    Geometry,
)


def enumerate_pool(
    geo: Geometry,
    pos: list[int],
    rng: random.Random,
    sizes: list[str] | None = None,
    not_in_per_cat: int = 3,
) -> list[Clue]:
    n = geo.n
    pool: list[Clue] = []
    for a in range(n):
        for b in range(a + 1, n):
            pa, pb = pos[a], pos[b]
            same = geo.room_of[pa] == geo.room_of[pb]
            pool.append(Clue(SAME_ROOM if same else DIFF_ROOM, a, b=b))
            ra, ca = pa // n, pa % n
            rb, cb = pb // n, pb % n
            # Permutation model: ca != cb and ra != rb always hold.
            pool.append(Clue(RELPOS, a, b=b, dir="left" if ca < cb else "right"))
            pool.append(Clue(RELPOS, a, b=b, dir="above" if ra < rb else "below"))
            if abs(ra - rb) == 1 and abs(ca - cb) == 1:
                pool.append(Clue(DIAG_ADJ, a, b=b))
    for a in range(n):
        room_a = geo.room_of[pos[a]]
        pool.append(Clue(IN_ROOM, a, room=room_a))
        # Direct pin — "团子 就趴在客厅的沙发上". The decisive beginner clue.
        pool.append(Clue(AT_CELL, a, cell=pos[a]))
        others = [k for k in range(geo.room_count) if k != room_a]
        rng.shuffle(others)
        for k in others[:not_in_per_cat]:
            pool.append(Clue(NOT_IN_ROOM, a, room=k))

    # Size clues — "这一格是一只大猫". Generated only for singleton size classes
    # (the one large and the one small cat), where it uniquely pins that cat.
    if sizes is not None:
        by_size: dict[str, tuple] = {}
        for s in set(sizes):
            by_size[s] = tuple(sorted(x for x in range(n) if sizes[x] == s))
        for a in range(n):
            group = by_size[sizes[a]]
            if len(group) == 1:
                pool.append(Clue(CELL_SIZE, cell=pos[a], size=sizes[a], cats=group))
    return pool
