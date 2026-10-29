import { useId } from "react";
import { CANVAS_COLORS } from "../../utils/constants.js";

const SIZE_PRESETS = [2, 4, 6, 10, 16];

export default function PenTool({ color, setColor, penSize, setPenSize }) {
  const colorInputId = useId();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-center h-16 rounded-xl bg-background-highlight border border-border-muted/40">
        <div
          className="rounded-full"
          style={{
            width: Math.max(penSize, 2),
            height: Math.max(penSize, 2),
            backgroundColor: color,
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
          Color
        </span>
        <div className="grid grid-cols-5 gap-2">
          {CANVAS_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`aspect-square rounded-lg cursor-pointer transition-all border
                ${
                  color === c
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                    : "border-border-muted/40 hover:scale-105"
                }`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
        <label
          htmlFor={colorInputId}
          className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border border-border-muted/40 bg-background hover:bg-background-highlight cursor-pointer transition-colors"
        >
          <input
            id={colorInputId}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
          />
          <span className="text-xs text-foreground/60">Custom color</span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Size
          </span>
          <span className="text-xs font-semibold text-foreground/70 tabular-nums">
            {penSize}px
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={penSize}
          onChange={(e) => setPenSize(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer"
        />
        <div className="flex gap-1.5">
          {SIZE_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPenSize(s)}
              className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer
                ${
                  penSize === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-highlight text-foreground/60 hover:text-foreground"
                }`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: Math.min(s, 14), height: Math.min(s, 14) }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
