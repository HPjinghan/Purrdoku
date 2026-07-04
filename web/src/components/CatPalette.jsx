// Cat picker. Selected cat is what a cell click places. Shows which cats are
// still unplaced (dimmed once on the board).

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
            title={`${cat.name} · ${cat.quirk}`}
          >
            <span className="pal-emoji">{cat.emoji}</span>
            <span className="pal-name">{cat.name}</span>
            {placed && <span className="pal-check" aria-hidden>✓</span>}
          </button>
        );
      })}
    </div>
  );
}
