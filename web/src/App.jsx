import { useEffect, useMemo, useState } from "react";
import Grid from "./grid/Grid.jsx";
import CluePanel from "./components/CluePanel.jsx";
import CatPalette from "./components/CatPalette.jsx";
import PuzzlePicker from "./components/PuzzlePicker.jsx";
import WinBanner from "./components/WinBanner.jsx";
import { skinPuzzle } from "./theme/skin.js";
import { evaluate } from "./game/logic.js";
import {
  loadProgress,
  saveProgress,
  clearProgress,
  loadSettings,
  saveSettings,
} from "./state/storage.js";

const PACK_URL = "./puzzles/puzzles.json";

export default function App() {
  const [pack, setPack] = useState(null);
  const [error, setError] = useState(null);
  const [puzzleId, setPuzzleId] = useState(null);

  const [placement, setPlacement] = useState([]);
  const [notes, setNotes] = useState({});
  const [selectedCat, setSelectedCat] = useState(0);
  const [notesMode, setNotesMode] = useState(false);
  const [checked, setChecked] = useState(false);
  const [revealRooms, setRevealRooms] = useState(true);

  // load pack
  useEffect(() => {
    fetch(PACK_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setPack(data);
        const settings = loadSettings();
        const first = settings.lastPuzzle &&
          data.puzzles.some((p) => p.id === settings.lastPuzzle)
          ? settings.lastPuzzle
          : data.puzzles[0]?.id;
        setPuzzleId(first);
        if (typeof settings.revealRooms === "boolean")
          setRevealRooms(settings.revealRooms);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const puzzle = useMemo(
    () => pack?.puzzles.find((p) => p.id === puzzleId) ?? null,
    [pack, puzzleId]
  );
  const skin = useMemo(() => (puzzle ? skinPuzzle(puzzle) : null), [puzzle]);

  // (re)load progress when the puzzle changes
  useEffect(() => {
    if (!puzzle) return;
    const saved = loadProgress(puzzle.id);
    if (saved && saved.placement?.length === puzzle.size) {
      setPlacement(saved.placement);
      setNotes(saved.notes || {});
    } else {
      setPlacement(Array(puzzle.size).fill(null));
      setNotes({});
    }
    setSelectedCat(0);
    setChecked(false);
    saveSettings({ ...loadSettings(), lastPuzzle: puzzle.id });
  }, [puzzle]);

  // persist progress
  useEffect(() => {
    if (puzzle && placement.length === puzzle.size)
      saveProgress(puzzle.id, { placement, notes });
  }, [puzzle, placement, notes]);

  const result = useMemo(
    () => (puzzle ? evaluate(puzzle, placement) : null),
    [puzzle, placement]
  );
  const won = result?.won ?? false;

  function placeCat(cell) {
    if (won) return;
    setChecked(false);
    if (notesMode) {
      toggleNote(cell);
      return;
    }
    setPlacement((prev) => {
      const next = prev.slice();
      const occupant = next.findIndex((p) => p === cell);
      if (occupant === selectedCat) {
        next[selectedCat] = null; // click own cat -> pick it up
      } else {
        next[selectedCat] = cell; // move selected cat here (vacates old spot)
      }
      return next;
    });
    // clear pencil notes on a filled cell
    setNotes((prev) => {
      if (!prev[cell]) return prev;
      const next = { ...prev };
      delete next[cell];
      return next;
    });
  }

  function toggleNote(cell) {
    if (placement[cell] != null) return;
    setNotes((prev) => {
      const cur = prev[cell] || [];
      const has = cur.includes(selectedCat);
      const next = {
        ...prev,
        [cell]: has ? cur.filter((x) => x !== selectedCat) : [...cur, selectedCat],
      };
      if (next[cell].length === 0) delete next[cell];
      return next;
    });
  }

  function resetPuzzle() {
    if (!puzzle) return;
    setPlacement(Array(puzzle.size).fill(null));
    setNotes({});
    setChecked(false);
    clearProgress(puzzle.id);
  }

  function toggleReveal() {
    setRevealRooms((v) => {
      saveSettings({ ...loadSettings(), revealRooms: !v });
      return !v;
    });
  }

  if (error)
    return (
      <div className="app error">
        <h1>拆家喵</h1>
        <p>谜题包加载失败:{error}</p>
        <p className="hint">
          先运行生成器产出 <code>web/public/puzzles/puzzles.json</code>。
        </p>
      </div>
    );
  if (!pack || !puzzle || !skin) return <div className="app loading">加载中…🐾</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>🐾</span>
          <div>
            <h1>拆家喵</h1>
            <p className="tag">Purrdoku · 纯逻辑推理</p>
          </div>
        </div>
        <PuzzlePicker
          pack={pack}
          puzzleId={puzzleId}
          onPick={setPuzzleId}
        />
      </header>

      <main className="board">
        <section className="left">
          <div className="case-title">
            <h2>{skin.title}</h2>
            <span className="diff-badge" data-diff={puzzle.difficulty}>
              {DIFF_LABEL[puzzle.difficulty] || puzzle.difficulty}
            </span>
          </div>
          <Grid
            puzzle={puzzle}
            skin={skin}
            placement={placement}
            notes={notes}
            conflicts={result.conflicts}
            selectedCat={notesMode ? null : selectedCat}
            onCellClick={placeCat}
            onCellRightClick={(cell) => {
              setChecked(false);
              toggleNote(cell);
            }}
            revealRooms={revealRooms}
          />
          <CatPalette
            skin={skin}
            placement={placement}
            selectedCat={selectedCat}
            onSelect={setSelectedCat}
          />
          <div className="toolbar">
            <button
              className={notesMode ? "on" : ""}
              onClick={() => setNotesMode((v) => !v)}
              title="铅笔标记(右键快捷)"
            >
              ✏️ 笔记{notesMode ? "·开" : ""}
            </button>
            <button onClick={() => setChecked(true)}>🔍 检查</button>
            <button onClick={toggleReveal}>
              {revealRooms ? "🙈 隐藏房间图标" : "🏠 显示房间图标"}
            </button>
            <button onClick={resetPuzzle}>🧹 重来</button>
          </div>
          {checked && !won && (
            <p className="check-msg">
              {result.violated > 0
                ? `有 ${result.violated} 条线索还对不上,继续推 🐾`
                : result.conflicts.size > 0
                ? "有猫在同一排/列打架了,挪一挪"
                : "还没摆完,加油!"}
            </p>
          )}
        </section>

        <section className="right">
          <CluePanel
            clues={skin.clues}
            statuses={result.clues}
            showStatus={checked || won}
          />
        </section>
      </main>

      {won && <WinBanner skin={skin} onNext={() => gotoNext(pack, puzzleId, setPuzzleId)} />}
    </div>
  );
}

const DIFF_LABEL = {
  "very-easy": "入门",
  easy: "简单",
  medium: "中等",
  hard: "困难",
  expert: "专家",
};

function gotoNext(pack, currentId, setPuzzleId) {
  const idx = pack.puzzles.findIndex((p) => p.id === currentId);
  const next = pack.puzzles[(idx + 1) % pack.puzzles.length];
  setPuzzleId(next.id);
}
