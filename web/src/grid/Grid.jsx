import { cellBorders } from "./borders.js";
import { roomOf } from "../game/logic.js";
import CatIcon from "../components/CatIcon.jsx";

// DOM/SVG-free grid (spec §5: no game engine). A CSS grid of cells; rooms are
// drawn with thick borders, cats as emoji, pencil-notes as small breed dots.

export default function Grid({
  puzzle,
  skin,
  placement,
  notes,
  conflicts,
  selectedCat,
  onCellClick,
  onCellRightClick,
  showDressing,
}) {
  const n = puzzle.size;

  // Every placed cat rules out the rest of its row and column (permutation
  // rule), so mark those empty cells as "no cat can stand here".
  const blocked = new Set();
  placement.forEach((cell) => {
    if (cell == null) return;
    const r = Math.floor(cell / n);
    const c = cell % n;
    for (let i = 0; i < n; i++) {
      blocked.add(r * n + i);
      blocked.add(i * n + c);
    }
  });

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${n}, 1fr)`,
        "--n": n,
      }}
    >
      {Array.from({ length: n * n }, (_, cell) => {
        const r = Math.floor(cell / n);
        const c = cell % n;
        const b = cellBorders(puzzle.rooms, r, c, n);
        const catIdx = placement.findIndex((p) => p === cell);
        const cat = catIdx >= 0 ? skin.cats[catIdx] : null;
        const rid = roomOf(puzzle.rooms, cell, n);
        const cellNotes = notes[cell] || [];
        const conflict = conflicts.has(cell);
        const isObstacle = skin.obstacle?.set?.has(cell);
        const furniture = !isObstacle && showDressing ? skin.furniture?.[cell] : null;
        const isAnchor = !isObstacle && showDressing && skin.roomAnchor?.[rid] === cell;
        const isBlocked = !cat && !isObstacle && blocked.has(cell);
        const cls = [
          "cell",
          b.top ? "bt" : "",
          b.right ? "br" : "",
          b.bottom ? "bb" : "",
          b.left ? "bl" : "",
          conflict ? "conflict" : "",
          cat ? "filled" : "",
          isBlocked ? "blocked" : "",
          isObstacle ? "obstacle" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={cell}
            className={cls}
            style={{
              "--room-hue": `${(rid * 47) % 360}`,
              ...(cat ? { "--cat-color": cat.color } : null),
            }}
            onClick={() => onCellClick(cell)}
            onContextMenu={(e) => {
              e.preventDefault();
              onCellRightClick(cell);
            }}
            aria-label={`${isAnchor ? skin.roomNames[rid] + " " : ""}格子 ${
              r + 1
            },${c + 1}${furniture ? " · " + furniture.name : ""}`}
          >
            {isObstacle && (
              <span className="obstacle-mark" title={skin.obstacle.name}>
                {skin.obstacle.emoji}
              </span>
            )}
            {isAnchor && (
              <span className="room-label" aria-hidden>
                {skin.roomNames[rid]}
              </span>
            )}
            {furniture && (
              <span
                className={`furniture ${cat ? "perch" : ""}`}
                aria-hidden
                title={furniture.name}
              >
                {furniture.emoji}
              </span>
            )}
            {cat ? (
              <>
                <span
                  className={`cat size-${cat.size}`}
                  title={
                    furniture ? `${cat.name} 趴在${furniture.name}上` : cat.name
                  }
                >
                  <CatIcon cat={cat} />
                </span>
                <span className="cat-label" style={{ "--cat-color": cat.color }}>
                  {cat.name}
                </span>
              </>
            ) : cellNotes.length ? (
              <span className="notes">
                {cellNotes.map((ci) => (
                  <span
                    key={ci}
                    className="note-dot"
                    style={{ "--cat-color": skin.cats[ci]?.color }}
                    title={skin.cats[ci]?.name}
                  >
                    {skin.cats[ci]?.name}
                  </span>
                ))}
              </span>
            ) : isBlocked ? (
              <span className="blocked-mark" aria-hidden>
                ✕
              </span>
            ) : !isObstacle && selectedCat != null ? (
              <span className="ghost" aria-hidden>
                {skin.cats[selectedCat]?.emoji}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
