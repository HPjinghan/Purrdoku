// Front-end solve check (spec §6 web/src/solver-check). Mirrors the generator's
// clue semantics so the client can validate placements without a server.

export function roomCount(rooms) {
  let m = 0;
  for (const row of rooms) for (const k of row) if (k > m) m = k;
  return m + 1;
}

export function roomOf(rooms, cell, n) {
  return rooms[Math.floor(cell / n)][cell % n];
}

// placement: Array<cell|null> indexed by cat. Returns true iff the clue holds
// for the cats it references being placed; unresolved (unplaced) => null.
export function clueStatus(clue, placement, rooms, n, sizes) {
  if (clue.type === "cell_size") {
    // whichever cat sits on `cell` must be of the clue's size class
    const occupant = placement.findIndex((p) => p === clue.cell);
    if (occupant < 0) return null;
    return (sizes ? sizes[occupant] : "medium") === clue.size;
  }
  const pa = placement[clue.a];
  if (clue.type === "at_cell") {
    if (pa == null) return null;
    return pa === clue.cell;
  }
  if (clue.type === "in_room" || clue.type === "not_in_room") {
    if (pa == null) return null;
    const inRoom = roomOf(rooms, pa, n) === clue.room;
    return clue.type === "in_room" ? inRoom : !inRoom;
  }
  const pb = placement[clue.b];
  if (pa == null || pb == null) return null;
  const ra = Math.floor(pa / n), ca = pa % n;
  const rb = Math.floor(pb / n), cb = pb % n;
  switch (clue.type) {
    case "same_room":
      return roomOf(rooms, pa, n) === roomOf(rooms, pb, n);
    case "diff_room":
      return roomOf(rooms, pa, n) !== roomOf(rooms, pb, n);
    case "diag_adj":
      return Math.abs(ra - rb) === 1 && Math.abs(ca - cb) === 1;
    case "relpos":
      if (clue.dir === "left") return ca < cb;
      if (clue.dir === "right") return ca > cb;
      if (clue.dir === "above") return ra < rb;
      if (clue.dir === "below") return ra > rb;
      return null;
    default:
      return null;
  }
}

// Row/column conflicts: cells sharing a line with 2+ cats (permutation rule).
export function conflictCells(placement, n) {
  const bad = new Set();
  const byRow = new Map();
  const byCol = new Map();
  placement.forEach((cell, cat) => {
    if (cell == null) return;
    const r = Math.floor(cell / n), c = cell % n;
    (byRow.get(r) ?? byRow.set(r, []).get(r)).push(cell);
    (byCol.get(c) ?? byCol.set(c, []).get(c)).push(cell);
  });
  for (const cells of byRow.values())
    if (cells.length > 1) cells.forEach((x) => bad.add(x));
  for (const cells of byCol.values())
    if (cells.length > 1) cells.forEach((x) => bad.add(x));
  return bad;
}

export function isComplete(placement, n) {
  return placement.length === n && placement.every((c) => c != null);
}

// Full win: all cats placed, a valid permutation, and every clue satisfied.
export function evaluate(puzzle, placement) {
  const n = puzzle.size;
  const complete = isComplete(placement, n);
  const conflicts = conflictCells(placement, n);
  const clues = puzzle.clues.map((clue) =>
    clueStatus(clue, placement, puzzle.rooms, n, puzzle.sizes)
  );
  const violated = puzzle.clues.filter((_, i) => clues[i] === false).length;
  const won =
    complete &&
    conflicts.size === 0 &&
    clues.every((s) => s === true);
  return { complete, conflicts, clues, violated, won };
}

// solution [[r,c]...] indexed by cat -> flat cell array.
export function solutionCells(puzzle) {
  return puzzle.solution.map(([r, c]) => r * puzzle.size + c);
}
