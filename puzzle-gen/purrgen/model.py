"""Core data model: grid geometry, rooms, clues and their semantics.

Cells are flat indices ``i = r * n + c``. A solution is a list ``pos`` where
``pos[cat] = cell``; the cells form a permutation matrix (distinct rows and
distinct columns across cats).

All candidate sets are bitmasks over the n*n cells (Python big ints).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator, Optional

SAME_ROOM = "same_room"
DIFF_ROOM = "diff_room"
IN_ROOM = "in_room"
NOT_IN_ROOM = "not_in_room"
RELPOS = "relpos"
DIAG_ADJ = "diag_adj"
AT_CELL = "at_cell"      # cat A sits at exactly this cell (rendered as "on the X")
CELL_SIZE = "cell_size"  # the cat at this cell is of a given size class
IN_ROW = "in_row"        # cat A is in row `line`
IN_COL = "in_col"        # cat A is in column `line`
ADJ_FURN = "adj_furn"    # cat A is orthogonally next to landmark cell `cell`

# Unary = restricts a single cat's candidate cells.
UNARY_TYPES = (IN_ROOM, NOT_IN_ROOM, AT_CELL, IN_ROW, IN_COL, ADJ_FURN)
BINARY_TYPES = (SAME_ROOM, DIFF_ROOM, RELPOS, DIAG_ADJ)
CELL_TYPES = (CELL_SIZE,)  # restricts which cats may occupy a given cell
ALL_TYPES = UNARY_TYPES + BINARY_TYPES + CELL_TYPES

DIRS = ("left", "right", "above", "below")


@dataclass(frozen=True)
class Clue:
    type: str
    a: int = -1
    b: Optional[int] = None
    room: Optional[int] = None
    dir: Optional[str] = None
    cell: Optional[int] = None
    size: Optional[str] = None
    cats: Optional[tuple] = None  # for CELL_SIZE: cats allowed at `cell`
    line: Optional[int] = None  # for IN_ROW / IN_COL: the row / column index

    @property
    def is_unary(self) -> bool:
        return self.type in UNARY_TYPES

    @property
    def is_cell(self) -> bool:
        return self.type in CELL_TYPES

    def to_json(self) -> dict:
        d = {"type": self.type}
        if self.a >= 0:
            d["a"] = self.a
        if self.b is not None:
            d["b"] = self.b
        if self.room is not None:
            d["room"] = self.room
        if self.dir is not None:
            d["dir"] = self.dir
        if self.cell is not None:
            d["cell"] = self.cell
        if self.size is not None:
            d["size"] = self.size
        if self.line is not None:
            d["line"] = self.line
        return d


def iter_bits(mask: int) -> Iterator[int]:
    while mask:
        low = mask & -mask
        yield low.bit_length() - 1
        mask ^= low


class Geometry:
    """Precomputed bitmask tables for an n x n grid plus a room partition.

    ``obstacles`` are cells no cat may occupy (pillars / ponds). They are simply
    removed from ``full``, so every candidate set excludes them automatically.
    """

    def __init__(self, n: int, rooms: list[list[int]], obstacles=None):
        self.n = n
        nn = n * n
        self.nn = nn
        self.rooms = rooms
        self.obstacles = tuple(obstacles or ())
        obstacle_mask = 0
        for o in self.obstacles:
            obstacle_mask |= 1 << o
        self.obstacle_mask = obstacle_mask
        self.full = ((1 << nn) - 1) & ~obstacle_mask
        self.row_of = [i // n for i in range(nn)]
        self.col_of = [i % n for i in range(nn)]
        self.room_of = [rooms[i // n][i % n] for i in range(nn)]
        self.room_count = max(self.room_of) + 1

        self.row_mask = [((1 << n) - 1) << (r * n) for r in range(n)]
        col0 = 0
        for r in range(n):
            col0 |= 1 << (r * n)
        self.col_mask = [col0 << c for c in range(n)]

        self.room_mask = [0] * self.room_count
        for i, k in enumerate(self.room_of):
            self.room_mask[k] |= 1 << i

        # Cells strictly left of column c, etc. (for relpos propagation).
        self.cols_lt = [0] * n
        self.cols_gt = [0] * n
        self.rows_lt = [0] * n
        self.rows_gt = [0] * n
        acc = 0
        for c in range(n):
            self.cols_lt[c] = acc
            acc |= self.col_mask[c]
        for c in range(n):
            self.cols_gt[c] = self.full & ~self.cols_lt[c] & ~self.col_mask[c]
        acc = 0
        for r in range(n):
            self.rows_lt[r] = acc
            acc |= self.row_mask[r]
        for r in range(n):
            self.rows_gt[r] = self.full & ~self.rows_lt[r] & ~self.row_mask[r]

        self.diag_mask = [0] * nn
        self.orth_mask = [0] * nn  # up/down/left/right neighbours (for adj_furn)
        for i in range(nn):
            r, c = i // n, i % n
            dm = 0
            for dr in (-1, 1):
                for dc in (-1, 1):
                    rr, cc = r + dr, c + dc
                    if 0 <= rr < n and 0 <= cc < n:
                        dm |= 1 << (rr * n + cc)
            self.diag_mask[i] = dm
            om = 0
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                rr, cc = r + dr, c + dc
                if 0 <= rr < n and 0 <= cc < n:
                    om |= 1 << (rr * n + cc)
            self.orth_mask[i] = om

        self.rowcol_mask = [
            self.row_mask[i // n] | self.col_mask[i % n] for i in range(nn)
        ]
        self._allowed_cache: dict = {}

    def unary_mask(self, clue: Clue) -> int:
        if clue.type == IN_ROOM:
            return self.room_mask[clue.room]
        if clue.type == NOT_IN_ROOM:
            return self.full & ~self.room_mask[clue.room]
        if clue.type == AT_CELL:
            return 1 << clue.cell
        if clue.type == IN_ROW:
            return self.row_mask[clue.line]
        if clue.type == IN_COL:
            return self.col_mask[clue.line]
        if clue.type == ADJ_FURN:
            return self.orth_mask[clue.cell]
        raise ValueError(clue.type)

    def allowed_mask(self, clue: Clue, fixed_role: str, cell: int) -> int:
        """Cells allowed for a binary clue's other endpoint.

        ``fixed_role`` is ``"a"`` if ``clue.a`` sits at ``cell`` (the returned
        mask constrains ``clue.b``) and ``"b"`` for the converse. Cells sharing
        a row or column with ``cell`` are always excluded (permutation rule).
        """
        key = (clue.type, clue.dir, fixed_role, cell)
        m = self._allowed_cache.get(key)
        if m is not None:
            return m
        t = clue.type
        if t == SAME_ROOM:
            m = self.room_mask[self.room_of[cell]]
        elif t == DIFF_ROOM:
            m = self.full & ~self.room_mask[self.room_of[cell]]
        elif t == DIAG_ADJ:
            m = self.diag_mask[cell]
        elif t == RELPOS:
            r, c = cell // self.n, cell % self.n
            if fixed_role == "b":  # constrain a, given b's cell
                m = {
                    "left": self.cols_lt[c],
                    "right": self.cols_gt[c],
                    "above": self.rows_lt[r],
                    "below": self.rows_gt[r],
                }[clue.dir]
            else:  # a fixed; b lies on the opposite side
                m = {
                    "left": self.cols_gt[c],
                    "right": self.cols_lt[c],
                    "above": self.rows_gt[r],
                    "below": self.rows_lt[r],
                }[clue.dir]
        else:
            raise ValueError(t)
        m &= ~self.rowcol_mask[cell]
        self._allowed_cache[key] = m
        return m


def clue_holds(clue: Clue, pos: list[int], geo: Geometry) -> bool:
    n = geo.n
    if clue.type == CELL_SIZE:
        # the cat occupying `cell` must be one of the allowed (same-size) cats
        return any(pos[x] == clue.cell for x in clue.cats)
    pa = pos[clue.a]
    if clue.type == AT_CELL:
        return pa == clue.cell
    if clue.type == IN_ROW:
        return pa // n == clue.line
    if clue.type == IN_COL:
        return pa % n == clue.line
    if clue.type == ADJ_FURN:
        return bool((geo.orth_mask[clue.cell] >> pa) & 1)
    if clue.type == IN_ROOM:
        return geo.room_of[pa] == clue.room
    if clue.type == NOT_IN_ROOM:
        return geo.room_of[pa] != clue.room
    pb = pos[clue.b]
    ra, ca = pa // n, pa % n
    rb, cb = pb // n, pb % n
    if clue.type == SAME_ROOM:
        return geo.room_of[pa] == geo.room_of[pb]
    if clue.type == DIFF_ROOM:
        return geo.room_of[pa] != geo.room_of[pb]
    if clue.type == DIAG_ADJ:
        return abs(ra - rb) == 1 and abs(ca - cb) == 1
    if clue.type == RELPOS:
        return {
            "left": ca < cb,
            "right": ca > cb,
            "above": ra < rb,
            "below": ra > rb,
        }[clue.dir]
    raise ValueError(clue.type)
