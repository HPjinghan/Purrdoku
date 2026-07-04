// Clue list in cat voice. After a check, each clue shows whether it currently
// holds (✅), is contradicted (❌), or is still undetermined (·).

export default function CluePanel({ clues, statuses, showStatus }) {
  return (
    <div className="clues">
      <h3>🐾 破坏现场线索</h3>
      <ol>
        {clues.map((clue, i) => {
          const s = statuses[i];
          const mark =
            !showStatus || s == null ? "" : s ? "ok" : "bad";
          return (
            <li key={i} className={`clue ${mark}`}>
              <span className="clue-icon" aria-hidden>
                {showStatus ? (s == null ? "·" : s ? "✅" : "❌") : "🔸"}
              </span>
              <span className="clue-text">{clue.text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
