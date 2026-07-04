"""Rectangular room partitions via guillotine (BSP) splitting.

Real homes are made of rectangular rooms of sensible sizes, so we recursively
slice the grid with straight cuts: every room is an axis-aligned rectangle.
Small rooms (down to 1 cell — a closet/pantry) are supported and, at the low
difficulty tiers, guaranteed so an ``in_room`` clue can pin a cat outright.
"""

from __future__ import annotations

import random


def _weighted_pick(items, weights, rng):
    total = sum(weights)
    x = rng.random() * total
    acc = 0.0
    for it, w in zip(items, weights):
        acc += w
        if x <= acc:
            return it
    return items[-1]


def _cut_point(length, rng):
    """A cut in [1, length-1], biased toward the middle so rooms stay squarish
    (uniform cuts spawn thin one-cell slivers, which balloon the room count)."""
    mid = length / 2
    c = round(mid + rng.uniform(-length / 4.0, length / 4.0))
    return max(1, min(length - 1, c))


def _split(rect, rng):
    """Split one rectangle [r, c, h, w] into two with a straight cut.

    Cut the longer side so rooms stay reasonably proportioned rather than
    degenerating into long thin strips."""
    r, c, h, w = rect
    can_v = w >= 2
    can_h = h >= 2
    if can_v and can_h:
        vertical = w > h or (w == h and rng.random() < 0.5)
    elif can_v:
        vertical = True
    elif can_h:
        vertical = False
    else:
        return None
    if vertical:
        cut = _cut_point(w, rng)
        return [r, c, h, cut], [r, c + cut, h, w - cut]
    cut = _cut_point(h, rng)
    return [r, c, cut, w], [r + cut, c, h - cut, w]


def _peel_one_cell(rects, rng):
    """Produce 1x1 room(s), keeping every room rectangular and adding as few
    rooms as possible. Returns how many 1x1 rooms were created this call.

    Cheapest source is a 2-cell room: split it into two 1x1 rooms (+1 room,
    +2 singles). Otherwise peel a single cell off the smallest strip (+1 room,
    +1 single), first carving a strip out of a 2-D rectangle if none exists."""
    twos = [i for i, (r, c, h, w) in enumerate(rects) if h * w == 2]
    if twos:
        i = min(twos)
        r, c, h, w = rects.pop(i)
        if w == 2:
            rects += [[r, c, 1, 1], [r, c + 1, 1, 1]]
        else:
            rects += [[r, c, 1, 1], [r + 1, c, 1, 1]]
        return 2
    strips = [
        i for i, (r, c, h, w) in enumerate(rects)
        if (h == 1 and w >= 3) or (w == 1 and h >= 3)
    ]
    if strips:
        i = min(strips, key=lambda i: rects[i][2] * rects[i][3])
        r, c, h, w = rects.pop(i)
        if w >= 3:
            rects += [[r, c, 1, 1], [r, c + 1, 1, w - 1]]
        else:
            rects += [[r, c, 1, 1], [r + 1, c, h - 1, 1]]
        return 1
    twod = [i for i, (r, c, h, w) in enumerate(rects) if h >= 2 and w >= 2]
    if not twod:
        return 0
    i = min(twod, key=lambda i: rects[i][2] * rects[i][3])
    r, c, h, w = rects.pop(i)
    if w >= h:
        rects += [[r, c, h, 1], [r, c + 1, h, w - 1]]
    else:
        rects += [[r, c, 1, w], [r + 1, c, h - 1, w]]
    return 0


def _guillotine(n: int, k: int, tiny: int, rng: random.Random, max_room: int | None):
    rects = [[0, 0, n, n]]
    # Cap the biggest room. This is the main difficulty knob: small rooms make
    # an ``in_room`` clue decisive (easy), large rooms force cross-referencing
    # of spatial clues (hard). Fall back to a size proportional to the average.
    cap = max_room if max_room else max(4, round(1.8 * n * n / max(k, 1)))
    cap = max(2, cap)
    area = lambda i: rects[i][2] * rects[i][3]
    guard = 0
    while True:
        guard += 1
        if guard > 4000:
            return None
        splittable = [i for i in range(len(rects)) if area(i) >= 2]
        if not splittable:
            break
        biggest = max(splittable, key=area)
        need_more = len(rects) < k
        over_cap = area(biggest) > cap
        if not need_more and not over_cap:
            break
        if over_cap and not need_more:
            idx = biggest  # force the oversized room to split
        else:
            # split bigger rooms first, so sizes spread out (a couple large
            # rooms, several medium, some small) like a real floor plan
            weights = [area(i) ** 1.5 for i in splittable]
            idx = _weighted_pick(splittable, weights, rng)
        parts = _split(rects.pop(idx), rng)
        if parts is None:
            return None
        rects.extend(parts)

    ones = sum(1 for r, c, h, w in rects if h * w == 1)
    base = len(rects)
    guard = 0
    while ones < tiny and guard < 60:
        guard += 1
        made = _peel_one_cell(rects, rng)
        ones += made
        # peeling adds at most ~1 room per 1-cell produced; give it that budget
        if len(rects) > base + tiny + 2:
            break

    if ones < tiny:
        return None

    grid = [[-1] * n for _ in range(n)]
    for rid, (r, c, h, w) in enumerate(rects):
        for rr in range(r, r + h):
            for cc in range(c, c + w):
                grid[rr][cc] = rid
    return grid


def generate_rooms(
    n: int,
    rng: random.Random,
    k: int,
    tiny: int = 0,
    max_room: int | None = None,
    max_tries: int = 400,
) -> list[list[int]]:
    for _ in range(max_tries):
        grid = _guillotine(n, k, tiny, rng, max_room)
        if grid is not None:
            return grid
    raise RuntimeError(
        f"room generation failed for n={n} k={k} tiny={tiny} max_room={max_room}"
    )


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


def rooms_are_rectangular(rooms: list[list[int]]) -> bool:
    """Every room's cells fill its bounding box exactly (used by tests)."""
    n = len(rooms)
    ids = {rooms[r][c] for r in range(n) for c in range(n)}
    for k in ids:
        cells = [(r, c) for r in range(n) for c in range(n) if rooms[r][c] == k]
        rs = [r for r, _ in cells]
        cs = [c for _, c in cells]
        h = max(rs) - min(rs) + 1
        w = max(cs) - min(cs) + 1
        if h * w != len(cells):
            return False
    return True
