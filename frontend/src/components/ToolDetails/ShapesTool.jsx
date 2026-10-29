import {
  Square,
  RectangleHorizontal,
  Circle,
  Triangle,
  Minus,
  MoveUpRight,
  Diamond,
  Star,
} from "lucide-react";
import { CANVAS_COLORS } from "../../utils/constants.js";

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

export default function ShapesTool({
  shapeType,
  setShapeType,
  color,
  setColor,
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
          Shape
        </span>
        <div className="grid grid-cols-4 gap-2">
          {SHAPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setShapeType(id)}
              title={label}
              className={`aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer border
                ${
                  shapeType === id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background-highlight text-foreground/60 border-border-muted/40 hover:text-foreground hover:border-border"
                }`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-foreground/40 leading-snug pt-1">
          Click and drag on the canvas to draw the selected shape.
        </p>
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
      </div>
    </div>
  );
}
