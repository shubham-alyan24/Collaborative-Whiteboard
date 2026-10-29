const FONT_SIZES = [12, 16, 20, 28, 40];
const TEXT_COLORS = ["#000000", "#E63946", "#2A9D8F", "#457B9D", "#F4A261"];

export default function TextTool({
  textColor,
  setTextColor,
  textFontSize,
  setTextFontSize,
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-foreground/50 leading-snug">
        Click anywhere on the canvas to start typing. Press Enter or click away
        to place the text.
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
          Color
        </span>
        <div className="grid grid-cols-5 gap-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`aspect-square rounded-lg cursor-pointer transition-all border
                ${
                  textColor === c
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                    : "border-border-muted/40 hover:scale-105"
                }`}
              style={{ backgroundColor: c }}
              onClick={() => setTextColor(c)}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border border-border-muted/40 bg-background hover:bg-background-highlight cursor-pointer transition-colors">
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
          />
          <span className="text-xs text-foreground/60">Custom color</span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
            Font size
          </span>
          <span className="text-xs font-semibold text-foreground/70 tabular-nums">
            {textFontSize}px
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="72"
          value={textFontSize}
          onChange={(e) => setTextFontSize(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer"
        />
        <div className="flex gap-1.5">
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTextFontSize(s)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer
                ${
                  textFontSize === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-highlight text-foreground/60 hover:text-foreground"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
