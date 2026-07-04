import CatIcon from "./CatIcon.jsx";

const SIZE_TEXT = { large: "大", medium: "中", small: "小" };

// Cat picker. Selected cat is what a cell click places. Shows which cats are
// still unplaced (dimmed once on the board). Each cat is a photo (with emoji
// fallback) plus its name (its image filename).

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
            title={`${cat.name} · ${SIZE_TEXT[cat.size]}猫 · ${cat.quirk}`}
          >
            <CatIcon cat={cat} className="pal-icon" />
            <span className="pal-name">{cat.name}</span>
            {placed && <span className="pal-check" aria-hidden>✓</span>}
          </button>
        );
      })}
    </div>
  );
}
