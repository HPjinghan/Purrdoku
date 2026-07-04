// Apply the theme pack to a logic-only puzzle. Deterministic in the puzzle's
// seed (spec §10.6): the same puzzle always renders the same cats/rooms/title,
// so a shared or daily puzzle looks identical for everyone.

import {
  CATS,
  CLUE_TEMPLATES,
  DIR_LABEL,
  MESS,
  QUIRKS,
  ROOMS,
  TITLE_TEMPLATES,
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

function pick(pool, rng) {
  return pool[Math.floor(rng() * pool.length)];
}

// roomCount from the room grid.
function roomCount(rooms) {
  let m = 0;
  for (const row of rooms) for (const k of row) if (k > m) m = k;
  return m + 1;
}

export function skinPuzzle(puzzle) {
  const rng = makeRng((puzzle.seed ^ 0x9e3779b9) >>> 0);
  const n = puzzle.size;
  const kRooms = roomCount(puzzle.rooms);

  // Cats: N distinct breeds; each gets a quirk + a favourite mess (biased,
  // but purely cosmetic — logic never reads it).
  const catBase = sampleWithoutReplacement(CATS, n, rng);
  const cats = catBase.map((c) => ({
    ...c,
    quirk: pick(QUIRKS, rng),
    mess: pick(MESS, rng),
  }));

  // Rooms: name each logic room. Pool has 9; if more are needed, cycle with a
  // numeric suffix so names stay unique.
  const roomNames = [];
  const shuffledRooms = sampleWithoutReplacement(ROOMS, Math.min(kRooms, ROOMS.length), rng);
  for (let k = 0; k < kRooms; k++) {
    if (k < shuffledRooms.length) roomNames.push(shuffledRooms[k]);
    else roomNames.push(`${ROOMS[k % ROOMS.length]}${Math.floor(k / ROOMS.length) + 1}`);
  }

  // Per-room decorative mess icon (helps read spatial clues, spec §10.3).
  const roomMess = roomNames.map(() => pick(MESS, rng));

  const title = renderTitle(rng, cats, roomNames, roomMess);
  const clues = puzzle.clues.map((clue) => ({
    ...clue,
    text: renderClue(clue, rng, cats, roomNames, roomMess),
  }));

  return { cats, roomNames, roomMess, title, clues };
}

function renderTitle(rng, cats, roomNames, roomMess) {
  const tmpl = pick(TITLE_TEMPLATES, rng);
  return tmpl({
    room: pick(roomNames, rng),
    mess: pick(roomMess, rng).name,
    cat: pick(cats, rng).name,
  });
}

function renderClue(clue, rng, cats, roomNames, roomMess) {
  const pool = CLUE_TEMPLATES[clue.type];
  const tmpl = pool[Math.floor(rng() * pool.length)];
  const A = cats[clue.a]?.name ?? `猫${clue.a}`;
  const B = clue.b != null ? cats[clue.b]?.name ?? `猫${clue.b}` : undefined;
  const room = clue.room != null ? roomNames[clue.room] : undefined;
  const mess = clue.room != null ? roomMess[clue.room]?.name : pick(roomMess, rng).name;
  const dir = clue.dir ? DIR_LABEL[clue.dir] : undefined;
  return tmpl({ A, B, room, mess, dir });
}
