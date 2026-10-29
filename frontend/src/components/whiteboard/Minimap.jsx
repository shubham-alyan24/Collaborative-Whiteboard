import { useEffect, useRef } from "react";

export default function Minimap({ strokes, camera }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear the minimap frame
    ctx.clearRect(0, 0, width, height);

    // 2. Define the "World Size" the minimap covers.
    // 10,000 pixels means the minimap covers a massive area.
    const worldSize = 10000;
    const scale = width / worldSize;

    // --- DRAW THE STROKES ---
    ctx.save();
    // Center the origin (0,0) in the middle of the minimap
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    strokes.forEach((stroke) => {
      if (!stroke || !stroke.points.length) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      // Make lines artificially thicker so they are visible on the tiny map
      ctx.lineWidth = Math.max(stroke.size * 3, 20);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      stroke.points.forEach(([x, y], i) => {
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    ctx.restore();

    // --- DRAW THE VIEWPORT (CAMERA) BOX ---
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Calculate where the camera is looking in World Coordinates
    const viewportWorldWidth = screenW / camera.scale;
    const viewportWorldHeight = screenH / camera.scale;
    const viewportWorldX = -camera.x / camera.scale;
    const viewportWorldY = -camera.y / camera.scale;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);

    // Styling for the Viewport box
    ctx.strokeStyle = "#ef4444"; // Tailwind Red-500
    ctx.lineWidth = 3 / scale; // Keep border thickness consistent regardless of zoom
    ctx.fillStyle = "rgba(239, 68, 68, 0.1)";

    ctx.beginPath();
    ctx.rect(
      viewportWorldX,
      viewportWorldY,
      viewportWorldWidth,
      viewportWorldHeight,
    );
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }, [strokes, camera]); // Re-render when strokes or camera changes

  return (
    <div className="absolute bottom-5 right-5 z-40 bg-background/90 backdrop-blur-md rounded-lg shadow-lg overflow-hidden pointer-events-none transition-opacity duration-300">
      {/* 200x150 is a nice 4:3 aspect ratio for a minimap */}
      <canvas
        ref={canvasRef}
        width={160}
        height={120}
        className="block opacity-75"
      />
    </div>
  );
}
