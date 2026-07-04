import { useState } from "react";

// Renders a cat's photo (web/public/cats/cat{id}.png). If the file is missing
// or fails to load, falls back to the roster emoji. Remembers broken sources
// process-wide so a missing photo only 404s once, not on every render.
const broken = new Set();

export default function CatIcon({ cat, className = "", badge = false }) {
  const [failed, setFailed] = useState(() => broken.has(cat.img));
  const showImg = cat.img && !failed;
  return (
    <span className={`caticon ${className}`} style={{ "--cat-color": cat.color }}>
      {showImg ? (
        <img
          className="cat-photo"
          src={cat.img}
          alt={cat.nick}
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
      {badge && <span className="cat-badge">{cat.id}</span>}
    </span>
  );
}
