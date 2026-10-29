import { Trash2 } from "lucide-react";
import { ERASER_SIZES } from "../../utils/constants.js";

export default function EraserTool({ eraserSize, setEraserSize, clearCanvas }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-center h-16 rounded-xl bg-background-highlight border border-border-muted/40">
        <div
          className="rounded-full border-2 border-foreground/40 bg-foreground/10"
          style={{ width: eraserSize, height: eraserSize }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Size
          </span>
          <span className="text-xs font-semibold text-foreground/70 tabular-nums">
            {eraserSize}px
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          value={eraserSize}
          onChange={(e) => setEraserSize(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer"
        />
        <div className="flex gap-1.5">
          {ERASER_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setEraserSize(s)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer
                ${
                  eraserSize === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-highlight text-foreground/60 hover:text-foreground"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={clearCanvas}
        className="flex items-center justify-center gap-2 h-10 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-background border border-danger/30 transition-all cursor-pointer text-sm font-semibold"
      >
        <Trash2 size={14} /> Clear canvas
      </button>
    </div>
  );
}
