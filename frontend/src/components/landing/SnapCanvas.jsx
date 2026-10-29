import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Undo2 } from "lucide-react";
import { generatePerfectShape } from "@/utils/shapeGeometry";
import { useTheme } from "@/context/ThemeContext";

// Same feel as the real board (hooks/useCanvas.js): hold for 1s, 10px drift resets
const HOLD_DELAY = 1000;
const STABILITY_THRESHOLD = 10;
const MIN_CONFIDENCE = 0.6;
const ML_API_URL = import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:8000";

// null means "the board's ink", which flips with the theme
const COLORS = [
  { value: null, label: "Ink" },
  { value: "#E63946", label: "Red" },
  { value: "#2A9D8F", label: "Teal" },
  { value: "#457B9D", label: "Blue" },
];

// Used only when the ML server can't be reached, so the demo still answers
function guessShapeLocally(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.hypot(width, height);
  const [first, last] = [points[0], points[points.length - 1]];
  if (diagonal < 20) return "unknown";
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) > diagonal * 0.35) {
    return "line";
  }

  const cx = minX + width / 2;
  const cy = minY + height / 2;
  const span = (list) => (list.length ? Math.max(...list) - Math.min(...list) : 0);
  const topWidth = span(points.filter((p) => p[1] < cy).map((p) => p[0]));
  const bottomWidth = span(points.filter((p) => p[1] >= cy).map((p) => p[0]));
  const leftHeight = span(points.filter((p) => p[0] < cx).map((p) => p[1]));
  const rightHeight = span(points.filter((p) => p[0] >= cx).map((p) => p[1]));
  const tapers = (a, b) => a > 0 && b > 0 && (a / b < 0.6 || b / a < 0.6);
  if (tapers(topWidth, bottomWidth) || tapers(leftHeight, rightHeight)) {
    return "triangle";
  }

  // A circle passes well inside the corners of its box; a square reaches them
  const cornerReach = [
    [minX, minY],
    [maxX, minY],
    [minX, maxY],
    [maxX, maxY],
  ].map(([x, y]) =>
    Math.min(...points.map((p) => Math.hypot(p[0] - x, p[1] - y))),
  );
  const average = cornerReach.reduce((a, b) => a + b, 0) / 4;
  return average > diagonal * 0.12 ? "circle" : "square";
}

async function recognize(points) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${ML_API_URL}/api/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data = await response.json();
    return { shape: data.shapeType, confidence: data.confidence };
  } catch (error) {
    console.warn("Shape server unavailable, guessing in the browser:", error);
    return { shape: guessShapeLocally(points), confidence: null };
  } finally {
    clearTimeout(timer);
  }
}

function statusText(status) {
  switch (status.kind) {
    case "holding":
      return "Hold still…";
    case "thinking":
      return "Looking at your stroke…";
    case "snapped":
      return status.confidence == null
        ? `Snapped to a ${status.shape}`
        : `Snapped to a ${status.shape}, ${Math.round(status.confidence * 100)}% sure`;
    case "kept":
      return status.confidence == null
        ? "Not sure what that is, kept as drawn"
        : `Only ${Math.round(status.confidence * 100)}% sure, kept as drawn`;
    case "released":
      return "Kept as drawn. Hold the pen still at the end to snap";
    default:
      return null;
  }
}

export default function SnapCanvas() {
  const { isDark } = useTheme();
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentRef = useRef(null);
  const ghostRef = useRef(null);
  const anchorRef = useRef(null);
  const holdTimerRef = useRef(null);
  const [color, setColor] = useState(null);
  const [status, setStatus] = useState({ kind: "idle" });
  const [holdKey, setHoldKey] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const ink = getComputedStyle(canvas).getPropertyValue("--ui-ink").trim();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const trace = (stroke, alpha) => {
      if (stroke.points.length < 2) return;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke.color || ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(...stroke.points[0]);
      stroke.points.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.stroke();
    };

    if (ghostRef.current) trace(ghostRef.current, ghostRef.current.alpha);
    strokesRef.current.forEach((s) => trace(s, 1));
    if (currentRef.current) trace(currentRef.current, 1);
    ctx.globalAlpha = 1;
  }, []);

  // Keep the backing store matched to the element's size and pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [isDark, redraw]);

  useEffect(() => () => clearTimeout(holdTimerRef.current), []);

  const fadeGhost = useCallback(
    (points, strokeColor) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const start = performance.now();
      ghostRef.current = { points, color: strokeColor, alpha: 0.35 };
      const step = (now) => {
        const t = Math.min((now - start) / 600, 1);
        if (!ghostRef.current) return;
        ghostRef.current.alpha = 0.35 * (1 - t);
        redraw();
        if (t < 1) requestAnimationFrame(step);
        else ghostRef.current = null;
      };
      requestAnimationFrame(step);
    },
    [redraw],
  );

  const snap = useCallback(async () => {
    const stroke = currentRef.current;
    if (!stroke || stroke.points.length <= 5 || stroke.snapped) return;
    stroke.snapped = true;
    setStatus({ kind: "thinking" });

    const rough = stroke.points.map((p) => [...p]);
    const { shape, confidence } = await recognize(rough);
    const sure = confidence == null || confidence > MIN_CONFIDENCE;
    if (!shape || shape === "unknown" || !sure) {
      setStatus({ kind: "kept", confidence });
      return;
    }
    stroke.points = generatePerfectShape(rough, shape);
    fadeGhost(rough, stroke.color);
    redraw();
    setStatus({ kind: "snapped", shape, confidence });
  }, [fadeGhost, redraw]);

  const restartHold = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(snap, HOLD_DELAY);
    setHoldKey((k) => k + 1);
  }, [snap]);

  const pointAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const handleDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const point = pointAt(e);
    currentRef.current = { points: [point], color, snapped: false };
    anchorRef.current = point;
    setHasDrawn(true);
    setStatus({ kind: "holding" });
    restartHold();
  };

  const handleMove = (e) => {
    const stroke = currentRef.current;
    if (!stroke || stroke.snapped) return;
    const point = pointAt(e);
    stroke.points.push(point);
    const [ax, ay] = anchorRef.current;
    if (Math.hypot(point[0] - ax, point[1] - ay) > STABILITY_THRESHOLD) {
      anchorRef.current = point;
      restartHold();
    }
    redraw();
  };

  const handleUp = () => {
    const stroke = currentRef.current;
    if (!stroke) return;
    clearTimeout(holdTimerRef.current);
    strokesRef.current.push(stroke);
    currentRef.current = null;
    if (!stroke.snapped) {
      setStatus(
        stroke.points.length > 5 ? { kind: "released" } : { kind: "idle" },
      );
    }
    redraw();
  };

  const undo = () => {
    strokesRef.current.pop();
    setStatus({ kind: "idle" });
    redraw();
  };

  const clear = () => {
    strokesRef.current = [];
    setStatus({ kind: "idle" });
    setHasDrawn(false);
    redraw();
  };

  const message = statusText(status);

  return (
    <div data-ui className="ui-panel ui-board">
      <div className="ui-board__bar">
        <span className="ui-board__title">Untitled board</span>
        {COLORS.map((c) => (
          <button
            key={c.label}
            type="button"
            className="ui-swatch"
            style={{ background: c.value || "var(--ui-ink)" }}
            aria-pressed={color === c.value}
            aria-label={`${c.label} pen`}
            title={c.label}
            onClick={() => setColor(c.value)}
          />
        ))}
        <span className="ui-sep" />
        <button
          type="button"
          className="ui-iconbtn"
          onClick={undo}
          aria-label="Undo"
          title="Undo"
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          className="ui-iconbtn"
          onClick={clear}
          aria-label="Clear the board"
          title="Clear"
        >
          <Trash2 size={17} />
        </button>
      </div>
      <div className="ui-board__area">
        <canvas
          ref={canvasRef}
          aria-label="Practice board. Draw a rough circle, square, triangle or line and hold still for a second."
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
        />
        <p className="ui-board__hint" style={{ opacity: hasDrawn ? 0 : 1 }}>
          Draw a rough circle, square, triangle or line here. Keep the pen
          still for a second at the end.
        </p>
        {message && (
          <p className="ui-board__status" role="status">
            {status.kind === "holding" && (
              <svg className="ui-board__ring" viewBox="0 0 20 20" key={holdKey}>
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.3"
                  strokeWidth="3"
                />
                <circle
                  className="ui-board__ring-fill"
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  pathLength="1"
                  strokeDasharray="1"
                />
              </svg>
            )}
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
