// frontend/src/hooks/useCanvas.js
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import { recognizeShape } from "../utils/shapeRecognizer.js";
import {
  generatePerfectShape,
  generateShapePoints,
} from "../utils/shapeGeometry.js";
import { createSpatialIndex } from "../utils/spatialIndex.js";

const HANDLE_SIZE = 8; // in workspace units, adjusted by scale when hit-testing
const STABILITY_THRESHOLD = 10;
const HOLD_DELAY = 1000; // 1 second

const getDpr = () => window.devicePixelRatio || 2;

const isBoxStroke = (s) => s.tool === "image" || s.tool === "text";

const getDistanceToSegment = (p, v, w) => {
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
  if (l2 === 0) return Math.hypot(p[0] - v[0], p[1] - v[1]);
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p[0] - (v[0] + t * (w[0] - v[0])),
    p[1] - (v[1] + t * (w[1] - v[1])),
  );
};

const getStrokeBBox = (stroke, ctx) => {
  if (stroke.tool === "image") {
    return {
      minX: stroke.x,
      minY: stroke.y,
      maxX: stroke.x + stroke.width,
      maxY: stroke.y + stroke.height,
    };
  }
  if (stroke.tool === "text") {
    if (!stroke.text || !ctx)
      return {
        minX: stroke.x,
        minY: stroke.y,
        maxX: stroke.x,
        maxY: stroke.y,
      };
    ctx.font = `${stroke.fontSize}px sans-serif`;
    const lines = stroke.text.split("\n");
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width), 10);
    const h = stroke.fontSize * 1.3 * lines.length;
    return {
      minX: stroke.x,
      minY: stroke.y,
      maxX: stroke.x + w,
      maxY: stroke.y + h,
    };
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  stroke.points.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  return { minX, minY, maxX, maxY };
};

// Index entry: the stroke's bbox padded by its line width, plus its z-order
const makeIndexItem = (stroke, order, ctx) => {
  if (!isBoxStroke(stroke) && !stroke.points?.length) return null;
  const b = getStrokeBBox(stroke, ctx);
  if (![b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite)) return null;
  const pad = isBoxStroke(stroke) ? 0 : (stroke.size || 4) / 2;
  return {
    minX: b.minX - pad,
    minY: b.minY - pad,
    maxX: b.maxX + pad,
    maxY: b.maxY + pad,
    stroke,
    order,
  };
};

const getHandleAt = (x, y, bbox, scale) => {
  const s = HANDLE_SIZE / scale;
  const corners = {
    tl: [bbox.minX, bbox.minY],
    tr: [bbox.maxX, bbox.minY],
    bl: [bbox.minX, bbox.maxY],
    br: [bbox.maxX, bbox.maxY],
  };
  for (const [key, [hx, hy]] of Object.entries(corners)) {
    if (Math.hypot(x - hx, y - hy) <= s) return key;
  }
  return null;
};

// Clears the canvas and applies dpr + camera as one transform
const beginFrame = (ctx, canvas, camera) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const k = getDpr();
  ctx.setTransform(
    k * camera.scale,
    0,
    0,
    k * camera.scale,
    k * camera.x,
    k * camera.y,
  );
};

const renderStroke = (ctx, stroke) => {
  if (!stroke || !stroke.points?.length) return;
  ctx.beginPath();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.globalCompositeOperation = "source-over";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  stroke.points.forEach(([x, y], i) => {
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
};

const renderText = (ctx, stroke) => {
  if (typeof stroke.text !== "string") return;
  ctx.fillStyle = stroke.color;
  ctx.font = `${stroke.fontSize}px sans-serif`;
  ctx.textBaseline = "top";
  const lineHeight = stroke.fontSize * 1.3;
  stroke.text.split("\n").forEach((line, i) => {
    ctx.fillText(line, stroke.x, stroke.y + i * lineHeight);
  });
};

export const useCanvas = (props) => {
  const {
    tool,
    color,
    penSize,
    eraserSize,
    shapeType = "rectangle",
    onStrokesChange,
    onStrokeProgress,
    onStrokeCancel,
    loadStrokes,
    live,
    camera = { x: 0, y: 0, scale: 1 },
  } = props;

  const erasedDuringDrag = useRef(false);
  // Two layers: committed strokes on the base canvas, in-progress strokes and
  // selection UI on the overlay (which also receives pointer events)
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const contextRef = useRef(null);
  const overlayCtxRef = useRef(null);
  const cameraRef = useRef(camera);
  const strokesRef = useRef([]);
  const currentStroke = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // { tree, items: Map<strokeId, indexItem> }
  const [spatial] = useState(() => ({
    tree: createSpatialIndex(),
    items: new Map(),
  }));

  // Hold to Snap Timing References
  const holdTimerRef = useRef(null);
  const lastTrackedMousePos = useRef({ x: 0, y: 0 });
  const hasSnappedRef = useRef(false);
  const shapeStartRef = useRef(null);
  const shapeEndRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const dragStateRef = useRef(null); // { mode: 'move'|'resize', handle, original, startX, startY, bbox, strokeId }
  const imageCacheRef = useRef(new Map());

  // Points of the current stroke already streamed to collaborators
  const progressRef = useRef({ id: null, sent: 0, reset: false });

  // --- Render scheduling: at most one draw per layer per animation frame ---
  const dirtyRef = useRef({ base: false, overlay: false });
  const frameRef = useRef(null);
  const renderFrameRef = useRef(() => {});

  const requestRender = useCallback((base = true, overlay = true) => {
    const dirty = dirtyRef.current;
    dirty.base = dirty.base || base;
    dirty.overlay = dirty.overlay || overlay;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      renderFrameRef.current();
    });
  }, []);

  const rebuildIndex = useCallback(() => {
    spatial.tree.clear();
    spatial.items.clear();
    strokesRef.current.forEach((s, i) => {
      const item = makeIndexItem(s, i, contextRef.current);
      if (!item) return;
      spatial.tree.insert(item);
      spatial.items.set(s.id, item);
    });
  }, [spatial]);

  // (Re)index one stroke after it was added or changed in place
  const indexStroke = useCallback(
    (stroke) => {
      const old = spatial.items.get(stroke.id);
      if (old) spatial.tree.remove(old);
      const order = old ? old.order : strokesRef.current.length - 1;
      const item = makeIndexItem(stroke, order, contextRef.current);
      if (!item) return spatial.items.delete(stroke.id);
      spatial.tree.insert(item);
      spatial.items.set(stroke.id, item);
    },
    [spatial],
  );

  const getMouseCoordinates = (e) => {
    const canvas = overlayRef.current;
    const rect = canvas.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    return {
      x: (offsetX - camera.x) / camera.scale,
      y: (offsetY - camera.y) / camera.scale,
    };
  };

  const renderImage = (ctx, stroke) => {
    let img = imageCacheRef.current.get(stroke.imageUrl);
    if (!img) {
      img = new Image();
      img.crossOrigin = "anonymous";
      img.src = stroke.imageUrl;
      img.onload = () => requestRender(true, false);
      imageCacheRef.current.set(stroke.imageUrl, img);
    }
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, stroke.x, stroke.y, stroke.width, stroke.height);
    }
  };

  const drawBase = () => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const cam = cameraRef.current;
    beginFrame(ctx, canvas, cam);

    // Only strokes intersecting the viewport (images off-screen never load)
    const dpr = getDpr();
    const view = {
      minX: -cam.x / cam.scale,
      minY: -cam.y / cam.scale,
      maxX: (canvas.width / dpr - cam.x) / cam.scale,
      maxY: (canvas.height / dpr - cam.y) / cam.scale,
    };
    spatial.tree
      .search(view)
      .sort((a, b) => a.order - b.order)
      .forEach(({ stroke }) => {
        if (stroke.tool === "image") renderImage(ctx, stroke);
        else if (stroke.tool === "text") renderText(ctx, stroke);
        else renderStroke(ctx, stroke);
      });
  };

  const drawOverlay = () => {
    const ctx = overlayCtxRef.current;
    const canvas = overlayRef.current;
    if (!ctx || !canvas) return;
    const cam = cameraRef.current;
    beginFrame(ctx, canvas, cam);

    live?.get().forEach((s) => renderStroke(ctx, s));
    if (currentStroke.current) renderStroke(ctx, currentStroke.current);

    if (tool === "select" && selectedId) {
      const sel = strokesRef.current.find((s) => s.id === selectedId);
      if (sel) {
        const { minX, minY, maxX, maxY } = getStrokeBBox(sel, ctx);
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1 / cam.scale;
        ctx.setLineDash([6 / cam.scale, 4 / cam.scale]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);
        ctx.fillStyle = "#3B82F6";
        const hs = HANDLE_SIZE / cam.scale;
        [
          [minX, minY],
          [maxX, minY],
          [minX, maxY],
          [maxX, maxY],
        ].forEach(([hx, hy]) => ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs));
      }
    }
  };

  // Stream new points of the in-progress stroke (batched per frame)
  const flushProgress = () => {
    const s = currentStroke.current;
    if (!s || !onStrokeProgress) return;
    const p = progressRef.current;
    const full = p.id !== s.id || p.reset;
    const from = full ? 0 : p.sent;
    if (!full && s.points.length <= from) return;
    onStrokeProgress(
      { id: s.id, color: s.color, size: s.size, tool: s.tool },
      from,
      s.points.slice(from),
    );
    progressRef.current = { id: s.id, sent: s.points.length, reset: false };
  };

  const renderFrame = () => {
    const dirty = dirtyRef.current;
    if (dirty.base) drawBase();
    if (dirty.overlay) drawOverlay();
    dirtyRef.current = { base: false, overlay: false };
    flushProgress();
  };

  useLayoutEffect(() => {
    renderFrameRef.current = renderFrame;
  });

  useLayoutEffect(() => {
    cameraRef.current = camera;
    requestRender();
  }, [camera, requestRender]);

  useEffect(() => {
    requestRender(false, true);
  }, [tool, selectedId, requestRender]);

  // Remote in-progress strokes changed — draw them right away
  useEffect(() => {
    if (!live) return;
    return live.subscribe(() => {
      dirtyRef.current.overlay = true;
      renderFrameRef.current();
    });
  }, [live]);

  // Reset the handle too: StrictMode re-runs effects, and a stale non-null
  // handle would make requestRender think a frame is pending forever
  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    },
    [],
  );

  const hitTestStroke = (x, y) => {
    const pad = 6 / camera.scale;
    const candidates = spatial.tree
      .search({ minX: x - pad, minY: y - pad, maxX: x + pad, maxY: y + pad })
      .sort((a, b) => b.order - a.order);
    for (const { stroke: s } of candidates) {
      if (isBoxStroke(s)) {
        const { minX, minY, maxX, maxY } = getStrokeBBox(s, contextRef.current);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) return s.id;
        continue;
      }
      const reach = (s.size || 4) / 2 + pad;
      for (let j = 0; j < s.points.length - 1; j++) {
        if (
          getDistanceToSegment([x, y], s.points[j], s.points[j + 1]) <= reach
        ) {
          return s.id;
        }
      }
      if (s.points.length === 1) {
        if (Math.hypot(s.points[0][0] - x, s.points[0][1] - y) <= reach)
          return s.id;
      }
    }
    return null;
  };

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    strokesRef.current = strokesRef.current.filter((s) => s.id !== selectedId);
    rebuildIndex();
    setSelectedId(null);
    requestRender();
    if (onStrokesChange) onStrokesChange([...strokesRef.current]);
  }, [selectedId, rebuildIndex, requestRender, onStrokesChange]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && tool === "select") {
        // avoid firing while typing in an input elsewhere on the page
        if (document.activeElement?.tagName === "INPUT") return;
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, tool]);

  const handleEraser = useCallback(
    (x, y) => {
      const hitRadius = eraserSize / 2 / camera.scale;
      const erased = new Set();

      spatial.tree
        .search({
          minX: x - hitRadius,
          minY: y - hitRadius,
          maxX: x + hitRadius,
          maxY: y + hitRadius,
        })
        .forEach(({ stroke }) => {
          if (isBoxStroke(stroke)) return;
          const reach = hitRadius + stroke.size / 2;
          const pts = stroke.points;
          const hit =
            pts.length === 1
              ? Math.hypot(pts[0][0] - x, pts[0][1] - y) <= reach
              : pts.some(
                  (p, i) =>
                    i < pts.length - 1 &&
                    getDistanceToSegment([x, y], p, pts[i + 1]) <= reach,
                );
          if (hit) erased.add(stroke.id);
        });

      if (erased.size) {
        strokesRef.current = strokesRef.current.filter(
          (s) => !erased.has(s.id),
        );
        rebuildIndex();
        erasedDuringDrag.current = true;
        requestRender(true, false);
      }
    },
    [eraserSize, camera.scale, spatial, rebuildIndex, requestRender],
  );

  const triggerShapeSnap = useCallback(async () => {
    const strokeAtStart = currentStroke.current;

    if (
      !strokeAtStart ||
      strokeAtStart.points.length <= 5 ||
      hasSnappedRef.current
    ) {
      return;
    }

    try {
      const predictedShape = await recognizeShape(strokeAtStart.points);
      if (predictedShape === "unknown") return;

      const snappedPoints = generatePerfectShape(
        strokeAtStart.points,
        predictedShape,
      );

      // Case 1: the stroke is still the one being actively drawn
      if (currentStroke.current === strokeAtStart) {
        currentStroke.current.points = snappedPoints;
        currentStroke.current.shapeType = predictedShape;
        hasSnappedRef.current = true;
        progressRef.current.reset = true;
        requestRender(false, true);
        return;
      }

      // Case 2: the pointer was already lifted while we were awaiting —
      // the stroke has already been pushed into strokesRef by finishDrawing.
      const committed = strokesRef.current.find(
        (s) => s.id === strokeAtStart.id,
      );
      if (committed) {
        committed.points = snappedPoints;
        committed.shapeType = predictedShape;
        indexStroke(committed);
        requestRender(true, false);
        if (onStrokesChange) onStrokesChange([...strokesRef.current]);
      }
    } catch (error) {
      console.error("Shape snapping failed:", error);
    }
  }, [indexStroke, requestRender, onStrokesChange]);

  // Keep both canvas bitmaps in sync with their CSS size (window resize, DevTools, zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    contextRef.current = canvas.getContext("2d");
    overlayCtxRef.current = overlay.getContext("2d");

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = getDpr();
      for (const c of [canvas, overlay]) {
        c.width = Math.round(rect.width * dpr);
        c.height = Math.round(rect.height * dpr);
      }
      // Resizing blanks the bitmaps, so repaint synchronously
      dirtyRef.current = { base: true, overlay: true };
      renderFrameRef.current();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!loadStrokes) return;
    strokesRef.current = [...loadStrokes];
    rebuildIndex();
    // Remote live strokes that have now been committed move to the base layer
    const liveStrokes = live?.get();
    if (liveStrokes?.size) {
      const ids = new Set(loadStrokes.map((s) => s.id));
      for (const id of liveStrokes.keys()) {
        if (ids.has(id)) liveStrokes.delete(id);
      }
    }
    requestRender();
  }, [loadStrokes, live, rebuildIndex, requestRender]);

  const startDrawing = (e) => {
    // Only the primary mouse button starts a stroke; touch/pen pointerdown
    // is always button 0, so this naturally allows them through.
    if (e.pointerType === "mouse" && e.button !== 0) return;

    // Keep receiving move/up events even if the finger/cursor leaves the canvas
    e.target.setPointerCapture?.(e.pointerId);

    const { x, y } = getMouseCoordinates(e);
    setIsDrawing(true);

    if (tool === "image" || tool === "text") {
      // Image tool has no click-to-draw behavior; insertion happens via the side panel upload button
      setIsDrawing(false);
      return;
    }

    // startDrawing — select branch
    if (tool === "select") {
      const sel = selectedId
        ? strokesRef.current.find((s) => s.id === selectedId)
        : null;
      if (sel) {
        const bbox = getStrokeBBox(sel, contextRef.current);
        const handle = getHandleAt(x, y, bbox, camera.scale);
        if (handle) {
          dragStateRef.current = {
            mode: "resize",
            handle,
            bbox,
            strokeId: sel.id,
            original: isBoxStroke(sel)
              ? {
                  x: sel.x,
                  y: sel.y,
                  width: sel.width,
                  height: sel.height,
                  fontSize: sel.fontSize,
                }
              : { points: sel.points.map((p) => [...p]) },
          };
          return;
        }
      }
      const hitId = hitTestStroke(x, y);
      setSelectedId(hitId);
      if (hitId) {
        const s = strokesRef.current.find((st) => st.id === hitId);
        dragStateRef.current = {
          mode: "move",
          startX: x,
          startY: y,
          strokeId: hitId,
          original: isBoxStroke(s)
            ? { x: s.x, y: s.y }
            : { points: s.points.map((p) => [...p]) },
        };
      }
      requestRender(false, true);
      return;
    }

    if (tool === "eraser") {
      handleEraser(x, y);
      return;
    }

    if (tool === "shape") {
      shapeStartRef.current = [x, y];
      shapeEndRef.current = [x, y];
      currentStroke.current = {
        id: crypto.randomUUID(),
        points: [[x, y]],
        color,
        size: penSize,
        tool: "shape",
        shapeType,
        createdAt: Date.now(),
      };
      requestRender(false, true);
      return;
    }

    hasSnappedRef.current = false;
    currentStroke.current = {
      id: crypto.randomUUID(),
      points: [[x, y]],
      color: color,
      size: penSize,
      tool: "pen",
      createdAt: Date.now(),
    };

    lastTrackedMousePos.current = { x, y };
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(triggerShapeSnap, HOLD_DELAY);

    requestRender(false, true);
  };

  const draw = (e) => {
    if (!isDrawing || tool === "hand" || tool === "image" || tool === "text")
      return;
    const { x, y } = getMouseCoordinates(e);

    // draw — select branch
    if (tool === "select" && dragStateRef.current) {
      const s = strokesRef.current.find(
        (st) => st.id === dragStateRef.current.strokeId,
      );
      if (!s) return;
      const drag = dragStateRef.current;
      const isBox = isBoxStroke(s);

      if (drag.mode === "move") {
        const dx = x - drag.startX;
        const dy = y - drag.startY;
        if (isBox) {
          s.x = drag.original.x + dx;
          s.y = drag.original.y + dy;
        } else {
          s.points = drag.original.points.map(([px, py]) => [px + dx, py + dy]);
        }
      } else if (drag.mode === "resize") {
        const { bbox, handle, original } = drag;
        const anchor = {
          tl: [bbox.maxX, bbox.maxY],
          tr: [bbox.minX, bbox.maxY],
          bl: [bbox.maxX, bbox.minY],
          br: [bbox.minX, bbox.minY],
        }[handle];
        const scaleX =
          (x - anchor[0]) /
          ({ tl: bbox.minX, bl: bbox.minX, tr: bbox.maxX, br: bbox.maxX }[
            handle
          ] -
            anchor[0]);
        const scaleY =
          (y - anchor[1]) /
          ({ tl: bbox.minY, tr: bbox.minY, bl: bbox.maxY, br: bbox.maxY }[
            handle
          ] -
            anchor[1]);
        if (isBox) {
          const newMinX = anchor[0] + (bbox.minX - anchor[0]) * scaleX;
          const newMaxX = anchor[0] + (bbox.maxX - anchor[0]) * scaleX;
          const newMinY = anchor[1] + (bbox.minY - anchor[1]) * scaleY;
          const newMaxY = anchor[1] + (bbox.maxY - anchor[1]) * scaleY;
          s.x = Math.min(newMinX, newMaxX);
          s.y = Math.min(newMinY, newMaxY);
          s.width = Math.abs(newMaxX - newMinX);
          if (s.tool === "image") {
            s.height = Math.abs(newMaxY - newMinY);
          } else if (s.tool === "text") {
            const factor = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
            s.fontSize = Math.max(6, original.fontSize * factor);
          }
        } else {
          s.points = original.points.map(([px, py]) => [
            anchor[0] + (px - anchor[0]) * scaleX,
            anchor[1] + (py - anchor[1]) * scaleY,
          ]);
        }
      }
      indexStroke(s);
      requestRender();
      return;
    }

    if (tool === "eraser") {
      handleEraser(x, y);
      return;
    }

    if (tool === "shape") {
      if (currentStroke.current && shapeStartRef.current) {
        shapeEndRef.current = [x, y];
        currentStroke.current.points = generateShapePoints(
          shapeType,
          shapeStartRef.current,
          shapeEndRef.current,
        );
        progressRef.current.reset = true;
        requestRender(false, true);
      }
      return;
    }

    if (currentStroke.current) {
      currentStroke.current.points.push([x, y]);

      if (!hasSnappedRef.current) {
        const driftDistance = Math.hypot(
          x - lastTrackedMousePos.current.x,
          y - lastTrackedMousePos.current.y,
        );
        if (driftDistance > STABILITY_THRESHOLD) {
          lastTrackedMousePos.current = { x, y };
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = setTimeout(triggerShapeSnap, HOLD_DELAY);
        }
      }

      requestRender(false, true);
    }
  };

  const finishDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    clearTimeout(holdTimerRef.current);

    if (e?.target?.releasePointerCapture && e?.pointerId != null) {
      e.target.releasePointerCapture(e.pointerId);
    }

    if (tool === "select") {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        if (onStrokesChange) onStrokesChange([...strokesRef.current]);
      }
      return;
    }

    if (tool === "eraser") {
      if (erasedDuringDrag.current) {
        if (onStrokesChange) onStrokesChange([...strokesRef.current]);
        erasedDuringDrag.current = false;
      }
      return;
    }

    if (tool === "shape") {
      const start = shapeStartRef.current;
      const end = shapeEndRef.current;
      const dragged =
        start && end && Math.hypot(end[0] - start[0], end[1] - start[1]) > 4;

      if (dragged && currentStroke.current) {
        strokesRef.current.push(currentStroke.current);
        indexStroke(currentStroke.current);
        if (onStrokesChange) onStrokesChange([...strokesRef.current]);
      } else if (currentStroke.current && onStrokeCancel) {
        onStrokeCancel(currentStroke.current.id);
      }
      currentStroke.current = null;
      shapeStartRef.current = null;
      shapeEndRef.current = null;
      requestRender();
      return;
    }

    if (currentStroke.current) {
      strokesRef.current.push(currentStroke.current);
      indexStroke(currentStroke.current);
      if (onStrokesChange) onStrokesChange([...strokesRef.current]);
      currentStroke.current = null;
      hasSnappedRef.current = false;
      requestRender();
    }
  };

  const clearCanvas = useCallback(() => {
    strokesRef.current = [];
    rebuildIndex();
    requestRender();
    if (onStrokesChange) onStrokesChange([]);
  }, [rebuildIndex, requestRender, onStrokesChange]);

  const insertImage = useCallback(
    (imageUrl) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const maxDim = 300;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w *= ratio;
          h *= ratio;
        }
        const rect = canvasRef.current.getBoundingClientRect();
        const worldX = (rect.width / 2 - camera.x) / camera.scale - w / 2;
        const worldY = (rect.height / 2 - camera.y) / camera.scale - h / 2;
        imageCacheRef.current.set(imageUrl, img);
        const stroke = {
          id: crypto.randomUUID(),
          tool: "image",
          imageUrl,
          x: worldX,
          y: worldY,
          width: w,
          height: h,
          createdAt: Date.now(),
        };
        strokesRef.current.push(stroke);
        indexStroke(stroke);
        requestRender(true, false);
        if (onStrokesChange) onStrokesChange([...strokesRef.current]);
      };
      img.src = imageUrl;
    },
    [camera, indexStroke, requestRender, onStrokesChange],
  );
  const addTextStroke = useCallback(
    (worldX, worldY, text, fontSize, color) => {
      // Ensure text is a string before calling trim()
      if (typeof text !== "string" || !text.trim()) return;

      const stroke = {
        id: crypto.randomUUID(),
        tool: "text",
        text,
        x: worldX,
        y: worldY,
        fontSize,
        color,
        createdAt: Date.now(),
      };
      strokesRef.current.push(stroke);
      indexStroke(stroke);
      requestRender(true, false);
      if (onStrokesChange) onStrokesChange([...strokesRef.current]);
    },
    [indexStroke, requestRender, onStrokesChange],
  );
  return {
    canvasRef,
    overlayRef,
    startDrawing,
    draw,
    finishDrawing,
    clearCanvas,
    insertImage,
    addTextStroke,
  };
};
