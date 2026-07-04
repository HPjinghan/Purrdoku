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
        const furniture = showDressing ? skin.furniture?.[cell] : null;
        const isAnchor = showDressing && skin.roomAnchor?.[rid] === cell;
        const cls = [
          "cell",
          b.top ? "bt" : "",
          b.right ? "br" : "",
          b.bottom ? "bb" : "",
          b.left ? "bl" : "",
          conflict ? "conflict" : "",
          cat ? "filled" : "",
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
              <span
                className="cat"
                title={
                  furniture ? `${cat.nick} 趴在${furniture.name}上` : cat.nick
                }
              >
                <CatIcon cat={cat} badge />
              </span>
            ) : cellNotes.length ? (
              <span className="notes">
                {cellNotes.map((ci) => (
                  <span
                    key={ci}
                    className="note-dot"
                    style={{ background: skin.cats[ci]?.color }}
                    title={skin.cats[ci]?.nick}
                  >
                    {skin.cats[ci]?.emoji}
                  </span>
                ))}
              </span>
            ) : selectedCat != null ? (
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
