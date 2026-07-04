// Apply the theme pack to a logic-only puzzle. Deterministic in the puzzle's
// seed (spec §10.6): the same puzzle always renders the same cats/rooms/title.

import {
  CAT_META,
  CAT_POOL,
  CLUE_TEMPLATES,
  DIR_LABEL,
  MESS,
  QUIRKS,
  ROOM_TYPES,
  SIZE_LABEL,
  TITLE_TEMPLATES,
  catImage,
} from "./catdoku.js";

function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWithoutReplacement(pool, count, rng) {
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, count).map((i) => pool[i]);
}

const pick = (pool, rng) => pool[Math.floor(rng() * pool.length)];

function roomCount(rooms) {
  let m = 0;
  for (const row of rooms) for (const k of row) if (k > m) m = k;
  return m + 1;
}

// Orthogonally-connected obstacle cells read as a pond; otherwise pillars.
function buildObstacle(cells, n) {
  if (!cells.length) return { set: new Set(), emoji: "", name: "" };
  const set = new Set(cells);
  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const cur = stack.pop();
    const r = Math.floor(cur / n);
    const c = cur % n;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const z = (r + dr) * n + (c + dc);
      if (r + dr >= 0 && r + dr < n && c + dc >= 0 && c + dc < n && set.has(z) && !seen.has(z)) {
        seen.add(z);
        stack.push(z);
      }
    }
  }
  const pond = cells.length >= 2 && seen.size === cells.length;
  return pond
    ? { set, emoji: "💧", name: "水池" }
    : { set, emoji: "🪵", name: "立柱" };
}

export function skinPuzzle(puzzle) {
  const rng = makeRng((puzzle.seed ^ 0x9e3779b9) >>> 0);
  const n = puzzle.size;
  const kRooms = roomCount(puzzle.rooms);
  const sizes = puzzle.sizes || Array(n).fill("medium");
  const roomOf = (cell) => puzzle.rooms[Math.floor(cell / n)][cell % n];

  // Assign each cat a photo matching its size class (so "big cat" clues are
  // truthful). The cat's NAME is its image filename, per the player's request.
  const picks = {};
  for (const cls of ["large", "medium", "small"]) {
    const need = sizes.filter((s) => s === cls).length;
    picks[cls] = sampleWithoutReplacement(CAT_POOL[cls], need, rng);
  }
  const cats = sizes.map((cls) => {
    const name = picks[cls].shift() ?? CAT_POOL.medium[0];
    const meta = CAT_META[name] || { color: "#ff9ec0", emoji: "🐱" };
    return {
      name,
      size: cls,
      img: catImage(name),
      color: meta.color,
      emoji: meta.emoji,
      quirk: pick(QUIRKS, rng),
      mess: pick(MESS, rng),
    };
  });

  // Obstacle cells (pillars / pond) — no cat, no furniture there.
  const obsCells = (puzzle.obstacles || []).map(([r, c]) => r * n + c);
  const obsSet = new Set(obsCells);
  const obstacle = buildObstacle(obsCells, n);

  // Group cells by room; row-major order makes cells[0] the top-left anchor
  // (skip obstacle cells so the room label doesn't sit on a pond/pillar).
  const roomCells = Array.from({ length: kRooms }, () => []);
  for (let cell = 0; cell < n * n; cell++) roomCells[roomOf(cell)].push(cell);
  const roomAnchor = roomCells.map(
    (cells) => cells.find((c) => !obsSet.has(c)) ?? cells[0]
  );

  // Name rooms by size rank: biggest → 客厅, smallest → 储物间/衣帽间.
  const rankOrder = roomCells
    .map((_, rid) => rid)
    .sort((a, b) =>
      roomCells[b].length - roomCells[a].length || roomAnchor[a] - roomAnchor[b]
    );
  const roomNames = Array(kRooms);
  const roomType = Array(kRooms);
  rankOrder.forEach((rid, rank) => {
    const t = ROOM_TYPES[rank % ROOM_TYPES.length];
    const suffix = rank >= ROOM_TYPES.length ? Math.floor(rank / ROOM_TYPES.length) + 1 : "";
    roomNames[rid] = `${t.name}${suffix}`;
    roomType[rid] = t;
  });

  // Cells a clue points at MUST be furnished, so "趴在客厅的沙发上" always has
  // a piece to name. Furnish those first, then fill ~60% of each room.
  const mustFurnish = new Set();
  for (const clue of puzzle.clues) if (clue.cell != null) mustFurnish.add(clue.cell);
  const furniture = Array(n * n).fill(null);
  roomCells.forEach((cells, rid) => {
    const set = roomType[rid].furniture;
    const usable = cells.filter((c) => !obsSet.has(c)); // no furniture on obstacles
    const forced = usable.filter((c) => mustFurnish.has(c));
    const rest = usable.filter((c) => !mustFurnish.has(c));
    const target = Math.max(forced.length, Math.min(set.length, Math.round(usable.length * 0.6)));
    const extra = sampleWithoutReplacement(rest, Math.max(0, target - forced.length), rng);
    const chosenCells = [...forced, ...extra];
    const pieces = sampleWithoutReplacement(set, Math.min(set.length, Math.max(1, chosenCells.length)), rng);
    chosenCells.forEach((cell, i) => {
      furniture[cell] = pieces[i % pieces.length];
    });
  });

  const roomMess = roomNames.map(() => pick(MESS, rng));

  const spotOf = (cell) => {
    const r = Math.floor(cell / n);
    const c = cell % n;
    const room = roomNames[roomOf(cell)];
    const f = furniture[cell];
    return f
      ? { room, furniture: f.name, spot: `${room}的${f.name}` }
      : { room, furniture: "角落", spot: `第${r + 1}行第${c + 1}列` };
  };

  const renderClue = (clue) => {
    const tmplPool = CLUE_TEMPLATES[clue.type];
    const tmpl = tmplPool[Math.floor(rng() * tmplPool.length)];
    const A = clue.a != null && clue.a >= 0 ? cats[clue.a]?.name : undefined;
    const B = clue.b != null ? cats[clue.b]?.name : undefined;
    const dir = clue.dir ? DIR_LABEL[clue.dir] : undefined;
    const s = clue.cell != null ? spotOf(clue.cell) : {};
    const room = clue.room != null ? roomNames[clue.room] : s.room;
    const mess = clue.room != null ? roomMess[clue.room]?.name : pick(roomMess, rng).name;
    const sizeLabel = clue.size ? SIZE_LABEL[clue.size] || "" : undefined;
    const line = clue.line != null ? clue.line + 1 : undefined; // 1-indexed
    return tmpl({ A, B, room, mess, dir, furniture: s.furniture, spot: s.spot, sizeLabel, line });
  };

  const title = pick(TITLE_TEMPLATES, rng)({
    room: pick(roomNames, rng),
    mess: pick(roomMess, rng).name,
    cat: pick(cats, rng).name,
  });
  const clues = puzzle.clues.map((clue) => ({ ...clue, text: renderClue(clue) }));

  return { cats, roomNames, roomMess, roomAnchor, furniture, title, clues, obstacle };
}
