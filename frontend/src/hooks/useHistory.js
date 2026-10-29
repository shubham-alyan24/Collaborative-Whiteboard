import { useState, useCallback } from "react";

// onRestore(strokes) runs after undo/redo so the caller can sync and save
export const useHistory = (strokes, setStrokes, onRestore) => {
  const [history, setHistory] = useState({ past: [], future: [] });

  const pushToHistory = useCallback(
    (prevStrokes, newStrokes) => {
      setHistory((h) => ({
        past: [...h.past, prevStrokes],
        future: [],
      }));
      setStrokes(newStrokes);
    },
    [setStrokes],
  );

  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    const previousState = history.past[history.past.length - 1];
    setHistory({
      past: history.past.slice(0, -1),
      future: [strokes, ...history.future],
    });
    setStrokes(previousState);
    if (onRestore) onRestore(previousState);
  }, [history, strokes, setStrokes, onRestore]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    const nextState = history.future[0];
    setHistory({
      past: [...history.past, strokes],
      future: history.future.slice(1),
    });
    setStrokes(nextState);
    if (onRestore) onRestore(nextState);
  }, [history, strokes, setStrokes, onRestore]);

  return {
    pushToHistory,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
};
