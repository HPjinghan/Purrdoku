"""Rejection-sampling pipeline (spec 4.6).

Per attempt:
  1. random layout + rooms (proposal randomness: size, room shapes, ratios)
  2. constructive clue selection — add a clue only if it lets the tier-capped
     logical solver make new progress; stop when logically solved
  3. reductive polish — drop every clue whose removal keeps the puzzle
     logically solvable within the target tier (this is where difficulty
     concentrates)
  4. measure difficulty (lowest-tier-first policy, all tiers enabled)
  5. certify: complete solver must count exactly one solution and the logical
     solution must equal the generating layout
Buckets accept a candidate only if (measured tier, grid size) fall in the
requested level's band — anything else is rejected or re-bucketed.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass, field

from .clues import enumerate_pool
from .difficulty import BY_ID, LEVELS, Level, level_for
from .layout import generate_solution
from .model import (
    ADJ_FURN,
    AT_CELL,
    CELL_SIZE,
    DIAG_ADJ,
    DIFF_ROOM,
    IN_COL,
    IN_ROOM,
    IN_ROW,
    NOT_IN_ROOM,
    RELPOS,
    SAME_ROOM,
    Clue,
    Geometry,
)
from .rooms import generate_rooms
from .solver_complete import count_solutions
from .solver_logical import LogicalSolver

# Cat size classes. Each puzzle gets exactly one large and one small cat (the
# rest medium), so "the big cat is on X" / "the small cat is on X" uniquely
# identifies a cat — a decisive, beginner-friendly size clue. The theme pack
# ships enough photos of each class for the frontend to always match.

# Clue-type weight priors per tier; jittered per puzzle for variety
# (structure randomness, spec 10.6 B). AT_CELL (a direct pin) and CELL_SIZE
# make the low tiers easy WITHOUT resorting to many tiny rooms, so they are
# weighted high there and dropped from the pool at tier >= 3 (see ALLOWED).
TYPE_PRIORS: dict[int, dict[str, float]] = {
    1: {AT_CELL: 2.5, CELL_SIZE: 2.0, ADJ_FURN: 2.5, IN_ROW: 2.0, IN_COL: 2.0, IN_ROOM: 2.0, NOT_IN_ROOM: 0.8, SAME_ROOM: 1.2, DIAG_ADJ: 1.0, RELPOS: 1.0, DIFF_ROOM: 0.5},
    2: {AT_CELL: 1.5, ADJ_FURN: 2.5, IN_ROW: 2.0, IN_COL: 2.0, IN_ROOM: 2.0, NOT_IN_ROOM: 1.5, SAME_ROOM: 2.0, DIAG_ADJ: 1.5, RELPOS: 1.5, DIFF_ROOM: 1.0},
    3: {ADJ_FURN: 2.0, IN_ROW: 1.2, IN_COL: 1.2, IN_ROOM: 1.5, NOT_IN_ROOM: 1.5, SAME_ROOM: 2.0, DIAG_ADJ: 2.0, RELPOS: 2.5, DIFF_ROOM: 1.5},
    4: {ADJ_FURN: 1.0, IN_ROOM: 0.8, NOT_IN_ROOM: 1.2, SAME_ROOM: 1.5, DIAG_ADJ: 2.0, RELPOS: 3.0, DIFF_ROOM: 2.0},
    5: {IN_ROOM: 0.4, NOT_IN_ROOM: 1.0, SAME_ROOM: 1.2, DIAG_ADJ: 2.0, RELPOS: 3.0, DIFF_ROOM: 2.5},
}

# Which clue types may appear at each tier. The outright pins (AT_CELL, and for
# the singleton size classes CELL_SIZE) are reserved for the tutorial tiers so
# they cannot trivialise the harder puzzles; the low tiers now lean on varied,
# less-direct clues (line, furniture-adjacency) rather than pin spam.
ALLOWED: dict[int, set] = {t: set(pri) for t, pri in TYPE_PRIORS.items()}


CANDIDATE_SCAN = 12  # progressing candidates compared before committing one

# Trim priority during polish: drop the strongest clue kinds first so the
# surviving set leans on weak clues, which is what forces chain reasoning.
TRIM_RANK = {AT_CELL: 0, CELL_SIZE: 1, IN_ROW: 2, IN_COL: 2, ADJ_FURN: 3,
             IN_ROOM: 4, DIAG_ADJ: 5, SAME_ROOM: 6, NOT_IN_ROOM: 7,
             RELPOS: 8, DIFF_ROOM: 9}


def assign_sizes(n: int, rng: random.Random) -> list[str]:
    """Exactly one large + one small cat (rest medium), so each of those size
    classes is a singleton and "the big/small cat is on X" is a decisive pin."""
    sizes = ["medium"] * n
    idx = list(range(n))
    rng.shuffle(idx)
    if n >= 2:
        sizes[idx[0]] = "large"
    if n >= 3:
        sizes[idx[1]] = "small"
    return sizes


def place_obstacles(n: int, pos: list[int], rng: random.Random, tier: int) -> list[int]:
    """Cells no cat may occupy — scattered pillars or a small connected pond.
    Placed only on non-solution cells so the layout stays solvable; adds visual
    and logical variety."""
    prob = 0.3 if tier <= 2 else 0.5
    if rng.random() > prob:
        return []
    occupied = set(pos)
    free = [c for c in range(n * n) if c not in occupied]
    if not free:
        return []
    rng.shuffle(free)
    if rng.random() < 0.5:  # 1-2 scattered pillars
        return sorted(free[: rng.randint(1, 2)])
    freeset = set(free)  # a small connected pond
    blob = {free[0]}
    frontier = [free[0]]
    target = rng.randint(2, 4)
    while len(blob) < target and frontier:
        cur = frontier[rng.randrange(len(frontier))]
        r, c = divmod(cur, n)
        neigh = [
            rr * n + cc
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1))
            if 0 <= (rr := r + dr) < n and 0 <= (cc := c + dc) < n
            and (rr * n + cc) in freeset and (rr * n + cc) not in blob
        ]
        if neigh:
            z = neigh[rng.randrange(len(neigh))]
            blob.add(z)
            frontier.append(z)
        else:
            frontier.remove(cur)
    return sorted(blob)


def _solved_within(geo: Geometry, clues: list[Clue], cap: int) -> bool:
    """Layered solvability: run cheap tiers first and only escalate to chain
    tiers from the stuck state (equivalent result, far cheaper on average)."""
    caps = [c for c in (min(cap, 3), 4, cap) if c <= cap]
    caps = sorted(set(caps))
    st = None
    for c in caps:
        res = LogicalSolver(geo, clues).solve(c, start=st)
        if res.solved:
            return True
        if res.contradiction:
            return False
        st = res.state
    return False


@dataclass
class Puzzle:
    n: int
    rooms: list[list[int]]
    pos: list[int]  # solution: cell per cat
    clues: list[Clue]
    sizes: list[str]  # size class per cat (large/medium/small)
    obstacles: list[int]  # cells no cat may occupy (pillars / pond)
    level_id: str
    seed: int
    max_tier: int
    chain_depth: int
    chain_passes: int
    steps: int
    tiers: dict[int, int]
    id: str = ""

    def to_json(self) -> dict:
        n = self.n
        return {
            "id": self.id,
            "seed": self.seed,
            "size": n,
            "difficulty": self.level_id,
            "rooms": self.rooms,
            "sizes": self.sizes,
            "obstacles": [[o // n, o % n] for o in self.obstacles],
            "clues": [cl.to_json() for cl in self.clues],
            "solution": [[p // n, p % n] for p in self.pos],
            "stats": {
                "clues": len(self.clues),
                "max_tier": self.max_tier,
                "chain_depth": self.chain_depth,
                "chain_passes": self.chain_passes,
                "steps": self.steps,
                "tiers": {str(k): v for k, v in sorted(self.tiers.items())},
            },
        }


def _weighted_order(pool: list[Clue], weights: dict[str, float], rng: random.Random) -> list[Clue]:
    # weighted shuffle without replacement (exponential-keys trick)
    return sorted(
        pool,
        key=lambda cl: rng.random() ** (1.0 / weights[cl.type]),
        reverse=True,
    )


def attempt_puzzle(level: Level, seed: int, max_room=None) -> Puzzle | None:
    rng = random.Random(seed)
    n = rng.randint(*level.sizes)
    # Home-like floor plan for EVERY tier now: a sensible room count (~6-9) with
    # sizes varying naturally, and a loose cap so no room swallows the grid.
    # The low tiers stay easy via the AT_CELL pin + CELL_SIZE clues rather than
    # via many tiny rooms, so beginner boards can be clean too.
    k = max(5, min(9, round(n * 0.85))) + rng.randint(-1, 1)
    k = max(4, k)
    if max_room is None:
        max_room = max(6, round(0.42 * n * n))
    rooms = generate_rooms(n, rng, k, tiny=0, max_room=max_room)
    pos = generate_solution(n, rng)
    sizes = assign_sizes(n, rng)
    obstacles = place_obstacles(n, pos, rng, level.tier)
    geo = Geometry(n, rooms, obstacles)

    pool = enumerate_pool(geo, pos, rng, sizes)
    allowed = ALLOWED[level.tier]
    pool = [cl for cl in pool if cl.type in allowed]

    priors = TYPE_PRIORS[level.tier]
    weights = {t: w * rng.uniform(0.5, 1.6) for t, w in priors.items()}
    order = _weighted_order(pool, weights, rng)

    chosen: list[Clue] = []
    chosen_set: set[Clue] = set()
    st = None  # last stuck state, reused (deductions are monotonic)
    cap_full = level.solve_cap

    while True:
        solver = LogicalSolver(geo, chosen)
        res = solver.solve(cap_full, start=st)
        if res.contradiction:
            return None  # soundness guard; should not happen on true facts
        if res.solved:
            break
        st = res.state

        picked = None
        best_state = None
        base_bits = sum(m.bit_count() for m in st.cand)
        # cheap pass first (rules <= 3); the chain tier only if nothing moves
        for cap in (min(cap_full, 3), cap_full):
            best_score = 0.0
            scanned = 0
            for cl in order:
                if cl in chosen_set:
                    continue
                trial = LogicalSolver(geo, chosen + [cl])
                r2 = trial.solve(cap, start=st)
                if r2.contradiction:
                    return None
                if r2.state.cand == st.cand:
                    continue
                # convergence beats raw shrinkage: a clue that pins a cat is
                # worth far more than one that nibbles a few candidates
                fixes = r2.state.nfixed - st.nfixed
                elim = base_bits - sum(m.bit_count() for m in r2.state.cand)
                score = (fixes * 1000 + elim) * rng.uniform(0.8, 1.25)
                if r2.solved:
                    score += 10_000
                if score > best_score:
                    best_score = score
                    picked = cl
                    best_state = r2.state
                scanned += 1
                if scanned >= CANDIDATE_SCAN:
                    break
            if picked is not None or cap == cap_full:
                break
        if picked is None:
            return None  # pool exhausted without progress — reject attempt
        st = best_state
        chosen.append(picked)
        chosen_set.add(picked)

    # Reductive polish (strongest clues first, jittered):
    #   A. difficulty-forcing — drop a clue only if that makes cap-1 reasoning
    #      insufficient while cap still solves it. Iterated to a fixpoint:
    #      removing one clue can unlock another whose removal now breaks the
    #      lower tier, so we sweep until a pass removes nothing.
    #   B. economy — drop anything whose removal keeps cap solvable.
    # Clue removal is monotone (fewer clues never make a tier solvable that
    # was not), so the difficulty won by pass A survives pass B's removals.
    def trim_order(cls: list[Clue]) -> list[Clue]:
        return sorted(cls, key=lambda cl: TRIM_RANK[cl.type] + rng.uniform(0, 1.5))

    if cap_full > 1:
        while True:
            removed = False
            for cl in trim_order(chosen):
                subset = [c for c in chosen if c != cl]
                if _solved_within(geo, subset, cap_full - 1):
                    continue  # plain economy removal; leave it for pass B
                if _solved_within(geo, subset, cap_full):
                    chosen = subset
                    removed = True
            if not removed:
                break
    for cl in trim_order(chosen):
        subset = [c for c in chosen if c != cl]
        if _solved_within(geo, subset, cap_full):
            chosen = subset

    # measure with every tier available, lowest-first policy
    res = LogicalSolver(geo, chosen).solve(LogicalSolver.MAX_TIER)
    if not res.solved:
        return None

    # certify: unique solution and it matches the generating layout
    if res.solution != pos:
        print(f"  [warn] seed={seed}: logical solution mismatch — rejected")
        return None
    if count_solutions(geo, chosen, limit=2) != 1:
        print(f"  [warn] seed={seed}: non-unique solution — rejected")
        return None

    rng.shuffle(chosen)  # presentation order should not mirror construction
    return Puzzle(
        n=n,
        rooms=rooms,
        pos=pos,
        clues=chosen,
        sizes=sizes,
        obstacles=obstacles,
        level_id="",  # assigned at bucketing time
        seed=seed,
        max_tier=res.max_tier,
        chain_depth=res.chain_depth,
        chain_passes=res.chain_passes,
        steps=res.steps,
        tiers=dict(res.tiers),
    )


@dataclass
class BatchStats:
    attempts: int = 0
    accepted: int = 0
    rejected_dead_end: int = 0
    rejected_off_target: int = 0
    seconds: float = 0.0
    type_counts: dict = field(default_factory=dict)


def generate_batch(
    plan: dict[str, int],
    master_seed: int,
    max_attempts_per_puzzle: int = 60,
    verbose: bool = True,
) -> tuple[dict[str, list[Puzzle]], BatchStats]:
    buckets: dict[str, list[Puzzle]] = {lid: [] for lid in plan}
    stats = BatchStats()
    t0 = time.time()
    attempt_index = 0
    budget = sum(plan.values()) * max_attempts_per_puzzle

    def unfilled() -> list[str]:
        return [lid for lid, want in plan.items() if len(buckets[lid]) < want]

    while unfilled() and attempt_index < budget:
        # round-robin over levels that still need puzzles
        lid = unfilled()[attempt_index % len(unfilled())]
        level = BY_ID[lid]
        seed = master_seed * 1_000_003 + attempt_index
        attempt_index += 1
        stats.attempts += 1

        puz = attempt_puzzle(level, seed)
        if puz is None:
            stats.rejected_dead_end += 1
            continue
        target = level_for(puz.max_tier, puz.chain_depth, puz.chain_passes, puz.n)
        if target is None or target.id not in buckets or len(buckets[target.id]) >= plan[target.id]:
            stats.rejected_off_target += 1
            continue
        puz.level_id = target.id
        puz.id = f"{target.id}-{len(buckets[target.id]) + 1:02d}"
        buckets[target.id].append(puz)
        stats.accepted += 1
        for cl in puz.clues:
            stats.type_counts[cl.type] = stats.type_counts.get(cl.type, 0) + 1
        if verbose:
            print(
                f"  [{stats.accepted:3d}] {puz.id:<14} n={puz.n} "
                f"clues={len(puz.clues):2d} tier={puz.max_tier} "
                f"cdepth={puz.chain_depth} cpass={puz.chain_passes} "
                f"steps={puz.steps} (attempt {attempt_index})"
            )

    stats.seconds = time.time() - t0
    return buckets, stats
