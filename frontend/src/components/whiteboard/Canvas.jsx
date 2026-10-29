import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import { useCanvas } from "../../hooks/useCanvas";
import { CANVAS_COLORS } from "../../utils/constants.js";
import { useTheme } from "@/context/ThemeContext";

// ── Snap flash toast ───────────────────────────────────────────────────────
const SHAPE_LABELS = {
  circle: "○ Circle",
  square: "□ Square",
  rectangle: "▭ Rectangle",
  triangle: "△ Triangle",
  rhombus: "◇ Rhombus",
  line: "— Line",
  arrow: "→ Arrow",
  plus: "+ Plus",
  star: "✦ Star",
};

const SnapToast = ({ snap }) => {
  if (!snap) return null;
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50
                 flex items-center gap-2 px-4 py-2 rounded-md
                 bg-foreground text-background text-sm font-semibold
                 pointer-events-none select-none
                 animate-fade-in-up"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <span>{SHAPE_LABELS[snap.shape] ?? snap.shape}</span>
      <span className="opacity-50 text-xs">
        {Math.round(snap.score * 100)}% match
      </span>
    </div>
  );
};

// ── Canvas ─────────────────────────────────────────────────────────────────
const Canvas = forwardRef((props, ref) => {
  const {
    tool,
    color = "#000000",
    readOnly,
    cursorStore,
    onCursorMove,
    camera = { x: 0, y: 0, scale: 1 },
    overrideCursor,
    penSize = 5,
    eraserSize = 20,
    onCanvasPointerDown,
    textColor = "#000000",
    textFontSize = 20,
  } = props;

  const { isDark } = useTheme();
  const backgroundColor = isDark ? CANVAS_COLORS[0] : CANVAS_COLORS[1];
  const cursorBorderColor = isDark ? "#ffffff" : "#000000";

  // ── Snap toast state ─────────────────────────────────────────────────────
  const [snapInfo, setSnapInfo] = useState(null);
  const snapToastTimer = useRef(null);

  const handleShapeSnapped = useCallback(({ shape, score }) => {
    if (snapToastTimer.current) clearTimeout(snapToastTimer.current);
    setSnapInfo({ shape, score });
    snapToastTimer.current = setTimeout(() => setSnapInfo(null), 1800);
  }, []);

  // ── useCanvas ────────────────────────────────────────────────────────────
  const {
    canvasRef,
    overlayRef,
    startDrawing,
    draw,
    finishDrawing,
    clearCanvas,
    insertImage,
    addTextStroke,
  } = useCanvas({ ...props, onShapeSnapped: handleShapeSnapped });

  const [textEditor, setTextEditor] = useState(null);

  const customCursorRef = useRef(null);
  // Latest pointer position in world space, sent at most once per frame
  const pendingCursorRef = useRef(null);
  const cursorFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    getCanvas: () => canvasRef.current,
    insertImage,
    addTextStroke,
  }));

  // ── Pointer handlers (mouse, touch, pen — unified) ──────────────────────
  const handlePointerDown = (e) => {
    onCanvasPointerDown?.();
    if (readOnly) return;

    if (tool === "text") {
      // 1. Prevent the browser from starting a native drag/select action
      e.preventDefault();

      const rect = e.currentTarget.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // 2. Push the mount to the next tick of the event loop.
      // This forces the browser to resolve the pointer event FIRST,
      // ensuring the new overlay is immediately painted to the screen.
      setTimeout(() => {
        setTextEditor({
          screenX,
          screenY,
          worldX: (screenX - camera.x) / camera.scale,
          worldY: (screenY - camera.y) / camera.scale,
        });
      }, 0);

      return;
    }
    startDrawing(e);
  };

  const handlePointerMove = (e) => {
    if (customCursorRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      customCursorRef.current.style.left = `${e.clientX - rect.left}px`;
      customCursorRef.current.style.top = `${e.clientY - rect.top}px`;
    }
    if (onCursorMove) {
      const rect = e.currentTarget.getBoundingClientRect();
      pendingCursorRef.current = {
        x: (e.clientX - rect.left - camera.x) / camera.scale,
        y: (e.clientY - rect.top - camera.y) / camera.scale,
      };
      if (cursorFrameRef.current === null) {
        cursorFrameRef.current = requestAnimationFrame(() => {
          cursorFrameRef.current = null;
          const { x, y } = pendingCursorRef.current;
          onCursorMove(x, y);
        });
      }
    }
    if (!readOnly && draw) draw(e);
  };

  const handlePointerUp = (e) => {
    if (readOnly) return;
    finishDrawing(e);
  };

  const handlePointerLeaveOrCancel = (e) => {
    if (customCursorRef.current) customCursorRef.current.style.opacity = "0";
    finishDrawing(e);
  };

  const handlePointerEnter = (e) => {
    // Hide the visual cursor ring for touch — a finger already covers it
    if (customCursorRef.current) {
      customCursorRef.current.style.opacity =
        e.pointerType === "touch" ? "0" : "1";
    }
  }; // ── Styles ────────────────────────────────────────────────────────────────
  const showCustomCursor = (tool === "pen" || tool === "eraser") && !readOnly;
  const isPen = tool === "pen";
  const activeSize = (isPen ? penSize : eraserSize) * camera.scale;

  const cursorStyle = overrideCursor
    ? overrideCursor
    : showCustomCursor
      ? "none"
      : tool === "hand"
        ? "grab"
        : tool === "shape"
          ? "crosshair"
          : tool === "text"
            ? "text"
            : tool === "select"
              ? "default"
              : "default";
  const gridSize = 24 * camera.scale;

  return (
    <div className="fixed inset-0 w-screen h-screen">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          background: backgroundColor,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`,
        }}
      />
      <canvas
        ref={overlayRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerLeaveOrCancel}
        onPointerLeave={handlePointerLeaveOrCancel}
        onPointerEnter={handlePointerEnter}
        className="absolute inset-0 w-full h-full touch-none" // touch-none stops browser scroll interference
        style={{ cursor: cursorStyle }}
      />

      {/* Dynamic cursor overlay */}
      {showCustomCursor && (
        <div
          ref={customCursorRef}
          className="absolute pointer-events-none rounded-full z-50 transition-opacity duration-150"
          style={{
            width: `${activeSize}px`,
            height: `${activeSize}px`,
            transform: "translate(-50%, -50%)",
            top: "-9999px",
            left: "-9999px",
            backgroundColor: isPen ? color : "rgba(255, 255, 255, 0.4)",
            border: `1.5px solid ${cursorBorderColor}`,
            boxShadow: isPen ? "0 0 2px rgba(0,0,0,0.4)" : "none",
          }}
        />
      )}

      {/* Shape snap toast */}
      <SnapToast snap={snapInfo} />

      {/* Remote cursors */}
      {cursorStore && <RemoteCursors store={cursorStore} camera={camera} />}

      {textEditor && (
        <textarea
          // Replace autoFocus with this callback ref:
          ref={(el) => el && el.focus()}
          className="absolute z-50 bg-transparent outline-none border border-dashed border-primary p-1 resize-none"
          style={{
            left: textEditor.screenX,
            top: textEditor.screenY,
            fontSize: `${textFontSize * camera.scale}px`,
            color: textColor,
            lineHeight: 1.3,
            minWidth: "120px",
            minHeight: `${textFontSize * 1.3}px`,
          }}
          onBlur={(e) => {
            addTextStroke(
              textEditor.worldX,
              textEditor.worldY,
              e.target.value,
              textFontSize,
              textColor,
            );
            setTextEditor(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setTextEditor(null);
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.target.blur();
            }
          }}
        />
      )}
    </div>
  );
});

// Subscribes to cursor updates itself so they don't re-render the board.
// Cursors arrive in world space and are projected with the local camera.
const RemoteCursors = ({ store, camera }) => {
  const cursors = useSyncExternalStore(store.subscribe, store.get);
  return Object.entries(cursors).map(([id, c]) => (
    <CursorOverlay
      key={id}
      cursor={c}
      left={c.x * camera.scale + camera.x}
      top={c.y * camera.scale + camera.y}
    />
  ));
};

const CursorOverlay = ({ cursor, left, top }) => (
  <div
    className="absolute pointer-events-none flex items-center gap-1"
    style={{ left, top, transform: "translate(0, -100%)" }}
  >
    <div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: cursor.color }}
    />
    <span
      className="text-xs px-1 rounded text-white"
      style={{ backgroundColor: cursor.color }}
    >
      {cursor.username}
    </span>
  </div>
);

export default Canvas;

/* ── Add this to your index.css or tailwind config ────────────────────────
   The snap toast uses animate-fade-in-up.
   Add this to your CSS if it's not already there:

@keyframes fade-in-up {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.2s ease-out forwards;
}
*/
