import { useState } from "react";
import { SIZE_SCALE } from "../theme/catdoku.js";

// Renders a cat's photo (web/public/cats/<name>.png). Whole illustration shown
// (object-fit: contain), scaled by the cat's body size so big cats read bigger.
// Falls back to the roster emoji if the image is missing; remembers broken
// sources process-wide so a missing photo only 404s once.
const broken = new Set();

export default function CatIcon({ cat, className = "" }) {
  const [failed, setFailed] = useState(() => broken.has(cat.img));
  const showImg = cat.img && !failed;
  const scale = SIZE_SCALE[cat.size] ?? 1;
  return (
    <span
      className={`caticon ${className}`}
      style={{ "--cat-color": cat.color, "--cat-scale": scale }}
    >
      {showImg ? (
        <img
          className="cat-photo"
          src={cat.img}
          alt={cat.name}
          draggable={false}
          onError={() => {
            broken.add(cat.img);
            setFailed(true);
          }}
        />
      ) : (
        <span className="cat-emoji" aria-hidden>
          {cat.emoji}
        </span>
      )}
    </span>
  );
}
