"""Complete backtracking solver: exhaustively counts solutions (early stop).

Used to certify uniqueness — it only enumerates, it does not care whether a
human could follow the reasoning (that is solver_logical's job).
"""

from __future__ import annotations

from .model import Clue, Geometry, iter_bits


def count_solutions(geo: Geometry, clues: list[Clue], limit: int = 2) -> int:
    n = geo.n
    cand = [geo.full] * n
    for cl in clues:
        if cl.is_unary:
            cand[cl.a] &= geo.unary_mask(cl)
    by_cat: list[list[tuple[Clue, str]]] = [[] for _ in range(n)]
    for cl in clues:
        if not cl.is_unary:
            by_cat[cl.a].append((cl, "a"))
            by_cat[cl.b].append((cl, "b"))

    if any(c == 0 for c in cand):
        return 0

    count = 0

    def viable(cand: list[int]) -> bool:
        # Every row and column must still be reachable by some cat.
        for rm in geo.row_mask:
            for c in range(n):
                if cand[c] & rm:
                    break
            else:
                return False
        for cm in geo.col_mask:
            for c in range(n):
                if cand[c] & cm:
                    break
            else:
                return False
        return True

    def bt(cand: list[int], unassigned: list[int]) -> None:
        nonlocal count
        if not unassigned:
            count += 1
            return
        cat = min(unassigned, key=lambda x: cand[x].bit_count())
        rest = [x for x in unassigned if x != cat]
        rest_set = set(rest)
        for cell in iter_bits(cand[cat]):
            nc = cand[:]
            nc[cat] = 1 << cell
            elim = geo.rowcol_mask[cell] | (1 << cell)
            ok = True
            for o in rest:
                nc[o] &= ~elim
                if nc[o] == 0:
                    ok = False
                    break
            if ok:
                for cl, role in by_cat[cat]:
                    other = cl.b if role == "a" else cl.a
                    if other in rest_set:
                        nc[other] &= geo.allowed_mask(cl, role, cell)
                        if nc[other] == 0:
                            ok = False
                            break
            if ok and viable(nc):
                bt(nc, rest)
                if count >= limit:
                    return

    bt(cand, list(range(n)))
    return count
