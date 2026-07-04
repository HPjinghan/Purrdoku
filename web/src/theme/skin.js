// Apply the theme pack to a logic-only puzzle. Deterministic in the puzzle's
// seed (spec §10.6): the same puzzle always renders the same cats/rooms/title,
// so a shared or daily puzzle looks identical for everyone.

import {
  CATS,
  CLUE_TEMPLATES,
  DIR_LABEL,
  MESS,
  QUIRKS,
  ROOM_TYPES,
  TITLE_TEMPLATES,
  catImage,
} from "./catdoku.js";

// mulberry32 — tiny reproducible PRNG.
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

export function skinPuzzle(puzzle) {
  const rng = makeRng((puzzle.seed ^ 0x9e3779b9) >>> 0);
  const n = puzzle.size;
  const kRooms = roomCount(puzzle.rooms);

  // Cats: sample N of the 9-cat roster. Fixed id↔photo, plus a quirk and a
  // favourite mess (cosmetic — logic never reads them).
  const cats = sampleWithoutReplacement(CATS, n, rng).map((c) => ({
    ...c,
    img: catImage(c.id),
    quirk: pick(QUIRKS, rng),
    mess: pick(MESS, rng),
  }));

  // Group cells by room; row-major order makes cells[0] the top-left anchor.
  const roomCells = Array.from({ length: kRooms }, () => []);
  for (let cell = 0; cell < n * n; cell++) {
    roomCells[puzzle.rooms[Math.floor(cell / n)][cell % n]].push(cell);
  }
  const roomAnchor = roomCells.map((cells) => cells[0]);

  // Name rooms by size rank: biggest room → 客厅, smallest → 储物间/衣帽间, so
  // the label is plausible for the shape. Ties broken by anchor for stability.
  const rankOrder = roomCells
    .map((cells, rid) => rid)
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

  // Furnish each room with a sensible number of DISTINCT pieces (~60% of its
  // cells, capped by the type's set), scattered across cells; rest stay empty.
  const furniture = Array(n * n).fill(null);
  roomCells.forEach((cells, rid) => {
    const set = roomType[rid].furniture;
    const count = Math.max(1, Math.min(set.length, Math.round(cells.length * 0.6)));
    const pieces = sampleWithoutReplacement(set, count, rng);
    const spots = sampleWithoutReplacement(cells, count, rng);
    spots.forEach((cell, i) => {
      furniture[cell] = pieces[i];
    });
  });

  // Signature knockable item per room (clue/title flavor).
  const roomMess = roomNames.map(() => pick(MESS, rng));

  const title = renderTitle(rng, cats, roomNames, roomMess);
  const clues = puzzle.clues.map((clue) => ({
    ...clue,
    text: renderClue(clue, rng, cats, roomNames, roomMess),
  }));

  return { cats, roomNames, roomMess, roomAnchor, furniture, title, clues };
}

function renderTitle(rng, cats, roomNames, roomMess) {
  const tmpl = pick(TITLE_TEMPLATES, rng);
  return tmpl({
    room: pick(roomNames, rng),
    mess: pick(roomMess, rng).name,
    cat: pick(cats, rng).nick,
  });
}

function renderClue(clue, rng, cats, roomNames, roomMess) {
  const pool = CLUE_TEMPLATES[clue.type];
  const tmpl = pool[Math.floor(rng() * pool.length)];
  const A = cats[clue.a]?.nick ?? `${clue.a + 1}号`;
  const B = clue.b != null ? cats[clue.b]?.nick ?? `${clue.b + 1}号` : undefined;
  const room = clue.room != null ? roomNames[clue.room] : undefined;
  const mess = clue.room != null ? roomMess[clue.room]?.name : pick(roomMess, rng).name;
  const dir = clue.dir ? DIR_LABEL[clue.dir] : undefined;
  return tmpl({ A, B, room, mess, dir });
}
