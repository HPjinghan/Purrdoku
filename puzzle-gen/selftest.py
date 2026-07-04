"""Fast invariant checks for the generator core. Run: python selftest.py"""

from __future__ import annotations

import random
import time

from purrgen.clues import enumerate_pool
from purrgen.difficulty import BY_ID, grade
from purrgen.layout import generate_solution
from purrgen.model import Clue, Geometry, clue_holds, iter_bits
from purrgen.pipeline import attempt_puzzle
from purrgen.rooms import (
    generate_rooms,
    rooms_are_contiguous,
    rooms_are_rectangular,
)
from purrgen.solver_complete import count_solutions
from purrgen.solver_logical import LogicalSolver


def check(name: str, ok: bool) -> None:
    print(f"  {'ok' if ok else 'FAIL'}  {name}")
    if not ok:
        raise SystemExit(1)


def test_room_generation() -> None:
    rng = random.Random(1)
    for n in (6, 7, 8, 9):
        for tiny in (0, 2):
            for max_room in (3, 5, None):
                rooms = generate_rooms(n, rng, k=min(9, n + 1), tiny=tiny,
                                       max_room=max_room)
                flat = [rooms[r][c] for r in range(n) for c in range(n)]
                k = max(flat) + 1
                sizes = [flat.count(i) for i in range(k)]
                assert rooms_are_contiguous(rooms), "contiguity"
                assert rooms_are_rectangular(rooms), "rectangular"
                assert sum(sizes) == n * n
                assert sizes.count(1) >= tiny
                if max_room:
                    assert max(sizes) <= max_room, (n, max_room, sizes)
    check("rooms: rectangular partitions, size cap, tiny quota", True)


def test_complete_solver_unconstrained() -> None:
    # With no clues the count must be n!^2 (any row/col bijection pair).
    rng = random.Random(2)
    n = 3
    rooms = generate_rooms(n, rng, k=3, tiny=0) if False else [[0] * n for _ in range(n)]
    geo = Geometry(n, rooms)
    total = count_solutions(geo, [], limit=10_000)
    check(f"complete solver: unconstrained 3x3 count == 36 (got {total})", total == 36)


def test_allowed_mask_matches_semantics() -> None:
    rng = random.Random(3)
    n = 6
    rooms = generate_rooms(n, rng, k=7, tiny=1)
    geo = Geometry(n, rooms)
    pos = generate_solution(n, rng)
    pool = enumerate_pool(geo, pos, rng)
    # every pooled fact must hold on the generating layout
    assert all(clue_holds(cl, pos, geo) for cl in pool)
    # allowed_mask membership must coincide with clue_holds on a 2-cat layout
    for cl in pool:
        if cl.is_unary:
            continue
        for xa in range(geo.nn):
            for xb in iter_bits(geo.allowed_mask(cl, "a", xa)):
                two = {cl.a: xa, cl.b: xb}
                fake = [two.get(c, 0) for c in range(n)]
                assert clue_holds(cl, fake, geo), (cl, xa, xb)
                assert xa // n != xb // n and xa % n != xb % n
    check("clue semantics == propagation masks (fuzz)", True)


def test_end_to_end_levels() -> None:
    for lid in ("very-easy", "easy", "medium", "hard"):
        level = BY_ID[lid]
        t0 = time.time()
        got = None
        for attempt in range(200):
            got = attempt_puzzle(level, seed=90_000 + attempt * 7 + level.tier)
            g = None if got is None else grade(got.max_tier, got.chain_depth, got.chain_passes)
            if g == level.tier:
                break
            got = None
        assert got is not None, f"could not build a {lid} puzzle in 200 attempts"
        geo = Geometry(got.n, got.rooms)
        assert count_solutions(geo, got.clues, limit=2) == 1
        res = LogicalSolver(geo, got.clues).solve(LogicalSolver.MAX_TIER)
        assert res.solved and res.solution == got.pos
        assert all(clue_holds(cl, got.pos, geo) for cl in got.clues)
        check(
            f"end-to-end {lid}: n={got.n} clues={len(got.clues)} "
            f"tier={got.max_tier} cdepth={got.chain_depth} "
            f"({time.time() - t0:.1f}s)",
            True,
        )


if __name__ == "__main__":
    print("purrgen selftest")
    test_room_generation()
    test_complete_solver_unconstrained()
    test_allowed_mask_matches_semantics()
    test_end_to_end_levels()
    print("all good")
