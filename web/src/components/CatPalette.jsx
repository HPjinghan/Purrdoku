import CatIcon from "./CatIcon.jsx";

// Cat picker. Selected cat is what a cell click places. Shows which cats are
// still unplaced (dimmed once on the board). Each cat is a photo (with emoji
// fallback), its number badge, and its nickname.

export default function CatPalette({ skin, placement, selectedCat, onSelect }) {
  return (
    <div className="palette" role="listbox" aria-label="选择一只猫">
      {skin.cats.map((cat, i) => {
        const placed = placement[i] != null;
        return (
          <button
            key={i}
            role="option"
            aria-selected={selectedCat === i}
            className={`pal-cat ${selectedCat === i ? "sel" : ""} ${
              placed ? "placed" : ""
            }`}
            style={{ "--cat-color": cat.color }}
            onClick={() => onSelect(i)}
            title={`${cat.id}号 ${cat.nick} · ${cat.quirk}`}
          >
            <CatIcon cat={cat} className="pal-icon" badge />
            <span className="pal-name">{cat.nick}</span>
            {placed && <span className="pal-check" aria-hidden>✓</span>}
          </button>
        );
      })}
    </div>
  );
}
