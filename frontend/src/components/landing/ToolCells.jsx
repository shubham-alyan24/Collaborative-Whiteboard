import { useState } from "react";
import {
  Circle,
  Diamond,
  Eraser,
  Hand,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  MoveUpRight,
  PenLine,
  RectangleHorizontal,
  Redo2,
  Shapes,
  Square,
  Star,
  Triangle,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { CANVAS_COLORS, ERASER_SIZES, ZOOM } from "@/utils/constants";

const SHAPES = [
  { id: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { id: "square", label: "Square", icon: Square },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "diamond", label: "Diamond", icon: Diamond },
  { id: "line", label: "Line", icon: Minus },
  { id: "arrow", label: "Arrow", icon: MoveUpRight },
  { id: "star", label: "Star", icon: Star },
];
const FONT_SIZES = [12, 16, 20, 28, 40];

function PenPanel() {
  const [color, setColor] = useState(CANVAS_COLORS[2]);
  const [size, setSize] = useState(6);
  return (
    <div className="ui-panel">
      <div className="ui-head">
        <span className="ui-label">Colour</span>
        <span className="ui-small">{color.toUpperCase()}</span>
      </div>
      <div className="ui-spread">
        {CANVAS_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="ui-swatch"
            style={{ background: c }}
            aria-pressed={color === c}
            aria-label={`Colour ${c}`}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="ui-head" style={{ marginTop: 8 }}>
        <label className="ui-label" htmlFor="lw-pen-size">
          Size
        </label>
        <span className="ui-small">{size}px</span>
      </div>
      <div className="ui-row" style={{ gap: 14 }}>
        <input
          id="lw-pen-size"
          type="range"
          min="1"
          max="20"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          style={{ flex: 1, accentColor: "var(--ui-ink)" }}
        />
        {/* Fixed box so the slider keeps its length as the dot grows */}
        <span
          style={{
            width: 20,
            height: 20,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: Math.max(size, 2),
              height: Math.max(size, 2),
              borderRadius: "50%",
              background: color,
            }}
          />
        </span>
      </div>
    </div>
  );
}

function ShapesPanel() {
  const [shape, setShape] = useState("circle");
  return (
    <div className="ui-panel">
      <div className="ui-head">
        <span className="ui-label">Shape</span>
        <span className="ui-small">
          {SHAPES.find((s) => s.id === shape).label}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {SHAPES.map(({ id, label, icon }) => {
          const Icon = icon;
          return (
          <button
            key={id}
            type="button"
            className="ui-iconbtn"
            style={{ width: "100%", height: 44, border: "1px solid var(--ui-line)" }}
            aria-pressed={shape === id}
            aria-label={label}
            title={label}
            onClick={() => setShape(id)}
          >
            <Icon size={18} />
          </button>
          );
        })}
      </div>
    </div>
  );
}

function TextPanel() {
  const [size, setSize] = useState(28);
  return (
    <div className="ui-panel">
      <div className="ui-head">
        <span className="ui-label">Font size</span>
        <span className="ui-small">{size}px</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 6,
        }}
      >
        {FONT_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            className="ui-btn"
            style={{ padding: 0, height: 32, fontSize: 13 }}
            aria-pressed={size === s}
            onClick={() => setSize(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <p
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          fontSize: size,
          fontWeight: 600,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
        }}
      >
        a² + b² = c²
      </p>
    </div>
  );
}

function ImagePanel() {
  return (
    <div className="ui-panel">
      <div className="ui-head">
        <span className="ui-label">blackboard-homer.jpg</span>
        <span className="ui-small">Uploaded</span>
      </div>
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          outline: "2px solid var(--ui-ink)",
          outlineOffset: -2,
          overflow: "hidden",
        }}
      >
        <img
          src="/landing/homer-blackboard-detail.jpg"
          alt="Chalk square, circle and lines on a blackboard, placed on a board as an image"
          width="700"
          height="1075"
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 10%",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

function EraserPanel() {
  const [size, setSize] = useState(30);
  return (
    <div className="ui-panel">
      <div className="ui-head">
        <span className="ui-label">Eraser size</span>
        <span className="ui-small">{size}px</span>
      </div>
      <div className="ui-spread">
        {ERASER_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`${s} pixels`}
            aria-pressed={size === s}
            onClick={() => setSize(s)}
            style={{
              width: 52,
              height: 52,
              display: "grid",
              placeItems: "center",
              border: 0,
              borderRadius: 6,
              background: size === s ? "var(--ui-hover)" : "transparent",
            }}
          >
            <span
              style={{
                width: s * 0.9,
                height: s * 0.9,
                borderRadius: "50%",
                border: "2px solid var(--ui-ink)",
                opacity: size === s ? 1 : 0.45,
              }}
            />
          </button>
        ))}
      </div>
      <button type="button" className="ui-btn" style={{ alignSelf: "flex-start" }}>
        <Eraser size={15} /> Clear board
      </button>
    </div>
  );
}

function ToolbarPanel() {
  const [scale, setScale] = useState(1);
  const zoom = (delta) =>
    setScale((s) =>
      Math.min(ZOOM.MAX, Math.max(ZOOM.MIN, Math.round((s + delta) * 10) / 10)),
    );
  return (
    <div className="ui-panel" style={{ padding: 0, gap: 0 }}>
      <div style={{ padding: 14, flex: 1, display: "flex" }}>
        <div
          style={{
            position: "relative",
            flex: 1,
            borderRadius: 6,
            background: "var(--ui-hover)",
          }}
          aria-label="Minimap"
        >
          <span
            style={{
              position: "absolute",
              left: `${30 - 10 / scale}%`,
              top: `${34 - 12 / scale}%`,
              width: `${40 / scale}%`,
              height: `${48 / scale}%`,
              border: "2px solid var(--accent)",
              transition: "all 320ms cubic-bezier(.16,1,.3,1)",
            }}
          />
        </div>
      </div>
      <div
        className="ui-row"
        style={{ gap: 2, padding: "6px 8px", borderTop: "1px solid var(--ui-line)" }}
      >
        <button type="button" className="ui-iconbtn" aria-label="Undo">
          <Undo2 size={16} />
        </button>
        <button type="button" className="ui-iconbtn" aria-label="Redo">
          <Redo2 size={16} />
        </button>
        <span className="ui-sep" />
        <button
          type="button"
          className="ui-iconbtn"
          aria-label="Zoom out"
          onClick={() => zoom(-ZOOM.STEP * 5)}
        >
          <ZoomOut size={16} />
        </button>
        <span
          className="ui-small"
          style={{ width: 44, textAlign: "center", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          className="ui-iconbtn"
          aria-label="Zoom in"
          onClick={() => zoom(ZOOM.STEP * 5)}
        >
          <ZoomIn size={16} />
        </button>
        <span className="ui-sep" />
        <button type="button" className="ui-iconbtn" aria-label="Pen">
          <PenLine size={16} />
        </button>
        <button type="button" className="ui-iconbtn" aria-label="Select">
          <MousePointer2 size={16} />
        </button>
        <button type="button" className="ui-iconbtn" aria-label="Shapes">
          <Shapes size={16} />
        </button>
        <button type="button" className="ui-iconbtn" aria-label="Hand" aria-pressed="true">
          <Hand size={16} />
        </button>
        <button type="button" className="ui-iconbtn" aria-label="Image">
          <ImageIcon size={16} />
        </button>
        <button type="button" className="ui-iconbtn" aria-label="Text">
          <Type size={16} />
        </button>
      </div>
    </div>
  );
}

const CELLS = [
  {
    title: "Pen",
    text: "Ten marker colours or any custom one, from a 1px hairline to a 20px felt tip.",
    panel: PenPanel,
  },
  {
    title: "Shapes",
    text: "Eight shapes to drag out, from a square to a star. Or draw one rough and let it snap.",
    panel: ShapesPanel,
  },
  {
    title: "Text",
    text: "Click anywhere and type. Five sizes, from a 12px note to a 40px title.",
    panel: TextPanel,
  },
  {
    title: "Images",
    text: "Put a diagram, a worksheet or a photo of the textbook page on the board.",
    panel: ImagePanel,
  },
  {
    title: "Eraser",
    text: "Five widths from 10 to 50px. Rub out what you need, undo what you didn’t mean.",
    panel: EraserPanel,
  },
  {
    title: "Hand and zoom",
    text: "Hold Space to pan, zoom from 50% to 500%, and find your place on the minimap.",
    panel: ToolbarPanel,
  },
];

export default function ToolCells() {
  return (
    <div className="lw-cells">
      {CELLS.map(({ title, text, panel }, i) => {
        const Panel = panel;
        return (
        <article
          key={title}
          className="lw-cell"
          data-reveal
          style={{ "--d": `${(i % 3) * 80}ms` }}
        >
          <div className="lw-cell__text">
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
          <div className="lw-cell__ui" data-ui>
            <Panel />
          </div>
        </article>
        );
      })}
    </div>
  );
}
