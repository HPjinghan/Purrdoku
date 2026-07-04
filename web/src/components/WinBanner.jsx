import CatIcon from "./CatIcon.jsx";

// Reveal moment (spec §10.1): every cat "认罪" with the mess it made.

export default function WinBanner({ skin, onNext }) {
  return (
    <div className="win-overlay" role="dialog" aria-label="破案">
      <div className="win-card">
        <h2>🎉 破案啦!</h2>
        <p className="win-sub">全部归位,案发现场复原:</p>
        <ul className="confess">
          {skin.cats.map((cat, i) => (
            <li key={i} style={{ "--cat-color": cat.color }}>
              <CatIcon cat={cat} className="confess-icon" />
              <span className="confess-body">
                <span className="confess-cat">{cat.name}</span>
                <span className="confess-mess">
                  {cat.quirk},闯的祸:{cat.mess.emoji} {cat.mess.name}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <button className="next-btn" onClick={onNext}>
          下一案 🐾
        </button>
      </div>
    </div>
  );
}
