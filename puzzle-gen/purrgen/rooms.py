"""Random contiguous room partitions (multi-source growth to a size plan)."""

from __future__ import annotations

import random


def make_size_plan(n: int, k: int, tiny: int, rng: random.Random) -> list[int]:
    """Room sizes summing to n*n: ``tiny`` rooms of size 1, the rest >= 2."""
    nn = n * n
    m = k - tiny
    sizes = [2] * m
    extra = nn - tiny - 2 * m
    for _ in range(extra):
        sizes[rng.randrange(m)] += 1
    # Soften mega-rooms so clues about a room stay informative.
    cap = max(4, nn // k + 4)
    for _ in range(200):
        hi = max(range(m), key=lambda i: sizes[i])
        if sizes[hi] <= cap:
            break
        lo = min(range(m), key=lambda i: sizes[i])
        sizes[hi] -= 1
        sizes[lo] += 1
    sizes = [1] * tiny + sizes
    rng.shuffle(sizes)
    return sizes


def _try_grow(n: int, sizes: list[int], rng: random.Random):
    nn = n * n
    k = len(sizes)
    owner = [-1] * nn
    neighbors = []
    for i in range(nn):
        r, c = i // n, i % n
        adj = []
        if r > 0:
            adj.append(i - n)
        if r < n - 1:
            adj.append(i + n)
        if c > 0:
            adj.append(i - 1)
        if c < n - 1:
            adj.append(i + 1)
        neighbors.append(adj)

    seeds = rng.sample(range(nn), k)
    cells: list[list[int]] = [[] for _ in range(k)]
    for room, cell in enumerate(seeds):
        owner[cell] = room
        cells[room].append(cell)

    # size-1 rooms must stay size 1 (they bootstrap very-easy puzzles)
    protect = {room for room, s in enumerate(sizes) if s == 1}

    remaining = nn - k
    while remaining:
        growable = []
        overflow = []
        for room in range(k):
            opts = [
                j
                for cell in cells[room]
                for j in neighbors[cell]
                if owner[j] == -1
            ]
            if not opts:
                continue
            if len(cells[room]) < sizes[room]:
                growable.append((room, opts))
            elif room not in protect:
                # rooms at target may absorb sealed-off pockets so the
                # partition always completes; sizes stay approximate
                overflow.append((room, opts))
        pool = growable or overflow
        if not pool:
            return None  # only protected tiny rooms touch the rest; retry
        room, opts = pool[rng.randrange(len(pool))]
        cell = opts[rng.randrange(len(opts))]
        owner[cell] = room
        cells[room].append(cell)
        remaining -= 1

    # keep the tiny-room quota exact: no accidental extra 1-cell rooms
    ones = sum(1 for room in range(k) if len(cells[room]) == 1)
    if ones != len(protect):
        return None

    return [[owner[r * n + c] for c in range(n)] for r in range(n)]


def generate_rooms(
    n: int, rng: random.Random, k: int, tiny: int = 0, max_tries: int = 400
) -> list[list[int]]:
    for _ in range(max_tries):
        sizes = make_size_plan(n, k, tiny, rng)
        grid = _try_grow(n, sizes, rng)
        if grid is not None:
            return grid
    raise RuntimeError(f"room generation failed for n={n} k={k} tiny={tiny}")


def rooms_are_contiguous(rooms: list[list[int]]) -> bool:
    """Validation helper (used by tests only)."""
    n = len(rooms)
    ids = {rooms[r][c] for r in range(n) for c in range(n)}
    for k in ids:
        cells = [(r, c) for r in range(n) for c in range(n) if rooms[r][c] == k]
        seen = {cells[0]}
        stack = [cells[0]]
        while stack:
            r, c = stack.pop()
            for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                if (
                    0 <= rr < n
                    and 0 <= cc < n
                    and rooms[rr][cc] == k
                    and (rr, cc) not in seen
                ):
                    seen.add((rr, cc))
                    stack.append((rr, cc))
        if len(seen) != len(cells):
            return False
    return True
