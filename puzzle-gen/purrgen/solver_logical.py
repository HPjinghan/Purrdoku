"""Tiered human-style reasoning solver — no blind guessing.

Every rule is a *sound elimination*: it only removes candidates that cannot
appear in any solution. Therefore if the solver reaches a full assignment,
that assignment is the puzzle's unique solution.

Rule tiers (mapping spec section 4.5):
  1  直接: unary clue restriction; binary clue propagation from a fixed
     endpoint; naked single (显式唯一格) + row/col elimination on fix.
  2  隐式唯一: hidden single on rows/columns (only one cat can occupy them).
  3  数对/区块排除: row/col confinement (pointing), naked/hidden pairs,
     per-clue support filtering ("if A sat here, B would have nowhere to go").
  4  链式排除: contradiction chain — assume a candidate, propagate with
     tiers <= 3, refute on contradiction. Sound elimination, never a guess.

单链 (hard) versus 深链/多步前瞻 (expert) is not a separate rule: the solve
result reports ``chain_depth`` — the deepest propagation any single chain
refutation required — and ``tiers[4]`` counts how many chain passes were
needed. The difficulty grader splits hard/expert on those.

The solve loop always applies the lowest tier that makes progress and
restarts from tier 1, so ``max_tier`` approximates the hardest technique a
careful human would actually need.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from .model import Clue, Geometry, iter_bits

CONTRADICTION = "contradiction"


class State:
    __slots__ = ("cand", "fixed", "nfixed")

    def __init__(self, cand: list[int], fixed: list, nfixed: int):
        self.cand = cand
        self.fixed = fixed
        self.nfixed = nfixed

    def clone(self) -> "State":
        return State(self.cand[:], self.fixed[:], self.nfixed)


@dataclass
class SolveResult:
    solved: bool
    contradiction: bool
    max_tier: int
    tiers: Counter = field(default_factory=Counter)
    steps: int = 0
    chain_depth: int = 0
    state: State | None = None

    @property
    def solution(self):
        return list(self.state.fixed) if self.solved else None

    @property
    def chain_passes(self) -> int:
        return self.tiers.get(4, 0)


class LogicalSolver:
    MAX_TIER = 4
    CHAIN_STEP_CAP = 60  # inner propagation length of one chain trial

    def __init__(self, geo: Geometry, clues: list[Clue]):
        self.geo = geo
        self.n = geo.n
        self.clues = list(clues)
        self.unary = [cl for cl in self.clues if cl.is_unary]
        self.binary = [cl for cl in self.clues if not cl.is_unary]
        self._last_chain_depth = 0

    def initial_state(self) -> State:
        return State([self.geo.full] * self.n, [None] * self.n, 0)

    def solve(self, max_tier: int, start: State | None = None) -> SolveResult:
        max_tier = min(max_tier, self.MAX_TIER)
        st = start.clone() if start is not None else self.initial_state()
        tiers: Counter = Counter()
        steps = 0
        max_used = 0
        chain_depth = 0  # deepest propagation any single chain refutation needed
        while st.nfixed < self.n:
            prog_tier = 0
            for tier in range(1, max_tier + 1):
                changed = self._apply(st, tier)
                if changed == CONTRADICTION:
                    return SolveResult(False, True, max_used, tiers, steps, chain_depth, st)
                if changed:
                    prog_tier = tier
                    if tier == 4 and self._last_chain_depth > chain_depth:
                        chain_depth = self._last_chain_depth
                    break
            if not prog_tier:
                return SolveResult(False, False, max_used, tiers, steps, chain_depth, st)
            tiers[prog_tier] += 1
            steps += 1
            if prog_tier > max_used:
                max_used = prog_tier
        return SolveResult(True, False, max_used, tiers, steps, chain_depth, st)

    # ---- rule dispatch -------------------------------------------------

    def _apply(self, st: State, tier: int):
        if tier == 1:
            return self._tier1(st)
        if tier == 2:
            return self._tier2(st)
        if tier == 3:
            return self._tier3(st)
        if tier == 4:
            return self._chain(st, prop_tier=3, step_cap=self.CHAIN_STEP_CAP)
        raise ValueError(tier)

    # ---- tier 1: direct ------------------------------------------------

    def _tier1(self, st: State):
        geo = self.geo
        changed = False
        for cl in self.unary:
            m = st.cand[cl.a] & geo.unary_mask(cl)
            if m != st.cand[cl.a]:
                st.cand[cl.a] = m
                changed = True
        for cl in self.binary:
            fa, fb = st.fixed[cl.a], st.fixed[cl.b]
            if fa is not None and fb is None:
                m = st.cand[cl.b] & geo.allowed_mask(cl, "a", fa)
                if m != st.cand[cl.b]:
                    st.cand[cl.b] = m
                    changed = True
            elif fb is not None and fa is None:
                m = st.cand[cl.a] & geo.allowed_mask(cl, "b", fb)
                if m != st.cand[cl.a]:
                    st.cand[cl.a] = m
                    changed = True
            elif fa is not None and fb is not None:
                if not ((1 << fb) & geo.allowed_mask(cl, "a", fa)):
                    return CONTRADICTION
        for c in range(self.n):
            if st.fixed[c] is None and st.cand[c].bit_count() == 1:
                cell = st.cand[c].bit_length() - 1
                st.fixed[c] = cell
                st.nfixed += 1
                elim = geo.rowcol_mask[cell] | (1 << cell)
                for o in range(self.n):
                    if o != c:
                        st.cand[o] &= ~elim
                changed = True
        if changed and not self._valid(st):
            return CONTRADICTION
        return changed

    # ---- tier 2: hidden singles -----------------------------------------

    def _tier2(self, st: State):
        changed = False
        for masks in (self.geo.row_mask, self.geo.col_mask):
            for line in masks:
                only = -1
                cnt = 0
                for c in range(self.n):
                    if st.cand[c] & line:
                        cnt += 1
                        only = c
                        if cnt > 1:
                            break
                if cnt == 0:
                    return CONTRADICTION
                if cnt == 1:
                    m = st.cand[only] & line
                    if m != st.cand[only]:
                        st.cand[only] = m
                        changed = True
        if changed and not self._valid(st):
            return CONTRADICTION
        return changed

    # ---- tier 3: confinement, pairs, clue support ------------------------

    def _tier3(self, st: State):
        geo = self.geo
        n = self.n
        changed = False

        for masks in (geo.row_mask, geo.col_mask):
            # line-bitset per cat: which lines does the cat still touch
            spans = []
            for c in range(n):
                s = 0
                for li, line in enumerate(masks):
                    if st.cand[c] & line:
                        s |= 1 << li
                spans.append(s)

            # confinement (pointing): cat locked to one line excludes others
            for c in range(n):
                if st.fixed[c] is None and spans[c].bit_count() == 1:
                    li = spans[c].bit_length() - 1
                    for o in range(n):
                        if o != c and st.cand[o] & masks[li]:
                            st.cand[o] &= ~masks[li]
                            changed = True

            # naked pairs: two cats jointly confined to two lines
            for c1 in range(n):
                if st.fixed[c1] is not None or spans[c1].bit_count() > 2:
                    continue
                for c2 in range(c1 + 1, n):
                    if st.fixed[c2] is not None:
                        continue
                    u = spans[c1] | spans[c2]
                    if u.bit_count() == 2:
                        pair_mask = 0
                        for li in iter_bits(u):
                            pair_mask |= masks[li]
                        for o in range(n):
                            if o != c1 and o != c2 and st.cand[o] & pair_mask:
                                st.cand[o] &= ~pair_mask
                                changed = True

            # hidden pairs: two lines only coverable by two cats
            line_cats = []
            for line in masks:
                s = 0
                for c in range(n):
                    if st.cand[c] & line:
                        s |= 1 << c
                line_cats.append(s)
            for l1 in range(n):
                if line_cats[l1].bit_count() > 2:
                    continue
                for l2 in range(l1 + 1, n):
                    u = line_cats[l1] | line_cats[l2]
                    if u.bit_count() == 2:
                        pair_mask = masks[l1] | masks[l2]
                        for c in iter_bits(u):
                            if st.cand[c] & ~pair_mask:
                                st.cand[c] &= pair_mask
                                changed = True

        # clue support filtering (arc consistency on each binary clue)
        for cl in self.binary:
            for subject, other, role_subject in (
                (cl.a, cl.b, "a"),
                (cl.b, cl.a, "b"),
            ):
                if st.fixed[subject] is not None:
                    continue
                new = 0
                for x in iter_bits(st.cand[subject]):
                    if st.cand[other] & geo.allowed_mask(cl, role_subject, x):
                        new |= 1 << x
                if new != st.cand[subject]:
                    st.cand[subject] = new
                    changed = True

        if changed and not self._valid(st):
            return CONTRADICTION
        return changed

    # ---- tiers 4/5: contradiction chains ---------------------------------

    def _chain(self, st: State, prop_tier: int, step_cap: int):
        # Commit the eliminations of the FIRST cell that yields any, then hand
        # back to the cheap rules (lowest-tier-first). This keeps the reported
        # difficulty honest: one chain per solve step, and _last_chain_depth
        # records the deepest propagation a refutation in this pass required
        # (单链 = shallow, 深链/多步前瞻 = deep). Returns eliminations count.
        order = sorted(
            (c for c in range(self.n) if st.fixed[c] is None),
            key=lambda c: st.cand[c].bit_count(),
        )
        self._last_chain_depth = 0
        for c in order:
            if st.cand[c].bit_count() <= 1:
                continue
            killed = 0
            depth = 0
            for x in iter_bits(st.cand[c]):
                trial = st.clone()
                trial.cand[c] = 1 << x
                d = self._trial_contradicts(trial, prop_tier, step_cap)
                if d >= 0:
                    st.cand[c] &= ~(1 << x)
                    killed += 1
                    depth = max(depth, d)
                    if st.cand[c] == 0:
                        return CONTRADICTION
            if killed:
                self._last_chain_depth = depth
                if not self._valid(st):
                    return CONTRADICTION
                return killed
        return 0

    def _trial_contradicts(self, st: State, max_tier: int, step_cap: int) -> int:
        """Propagate the hypothesis with rules <= max_tier. Returns the number
        of propagation steps taken to reach a contradiction, or -1 if none
        (i.e. the hypothesis survives — no elimination is licensed)."""
        if not self._valid(st):
            return 0
        steps = 0
        while steps < step_cap:
            prog = 0
            for tier in range(1, max_tier + 1):
                ch = self._apply(st, tier)
                if ch == CONTRADICTION:
                    return steps + 1
                if ch:
                    prog = tier
                    break
            if not prog or st.nfixed == self.n:
                return -1
            steps += 1
        return -1

    # ---- consistency check ----------------------------------------------

    def _valid(self, st: State) -> bool:
        n = self.n
        for c in range(n):
            if st.cand[c] == 0:
                return False
        for masks in (self.geo.row_mask, self.geo.col_mask):
            used = 0  # lines already claimed exclusively by one cat
            for li, line in enumerate(masks):
                if not any(st.cand[c] & line for c in range(n)):
                    return False
            for c in range(n):
                span = 0
                only = -1
                for li, line in enumerate(masks):
                    if st.cand[c] & line:
                        span += 1
                        only = li
                        if span > 1:
                            break
                if span == 1:
                    bit = 1 << only
                    if used & bit:
                        return False  # two cats confined to the same line
                    used |= bit
        return True
