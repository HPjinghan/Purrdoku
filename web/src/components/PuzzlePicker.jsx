// Difficulty + puzzle selector. Groups puzzles by difficulty band.

const ORDER = ["very-easy", "easy", "medium", "hard", "expert"];
const LABEL = {
  "very-easy": "入门",
  easy: "简单",
  medium: "中等",
  hard: "困难",
  expert: "专家",
};

export default function PuzzlePicker({ pack, puzzleId, onPick }) {
  const groups = ORDER.map((d) => ({
    diff: d,
    items: pack.puzzles.filter((p) => p.difficulty === d),
  })).filter((g) => g.items.length);

  return (
    <div className="picker">
      <label htmlFor="puzsel">选题</label>
      <select
        id="puzsel"
        value={puzzleId ?? ""}
        onChange={(e) => onPick(e.target.value)}
      >
        {groups.map((g) => (
          <optgroup key={g.diff} label={LABEL[g.diff]}>
            {g.items.map((p, i) => (
              <option key={p.id} value={p.id}>
                {LABEL[p.diff]} #{i + 1} · {p.size}×{p.size}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
