import { useState, useCallback, useEffect, useRef } from "react";
import { ZOOM } from "../utils/constants.js";

export const useCamera = (tool) => {
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // pointerId -> {x, y} in screen coords, used to detect & track pinch gestures
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null); // { distance, midpoint } from the previous frame

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !e.repeat) setIsSpacePressed(true);
    };
    const handleKeyUp = (e) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleWheel = useCallback((e) => {
    const zoomSensitivity = 0.001;
    const delta = e.deltaY * -zoomSensitivity;

    setCamera((prev) => {
      const newScale = Math.min(Math.max(0.1, prev.scale + delta), 5);
      const scaleRatio = newScale / prev.scale;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const newX = mouseX - (mouseX - prev.x) * scaleRatio;
      const newY = mouseY - (mouseY - prev.y) * scaleRatio;
      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  const startPan = useCallback(
    (e) => {
      if (e.pointerType === "touch") {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointersRef.current.size === 2) {
          // Second finger landed — start pinch, abandon any single-finger pan
          const [a, b] = Array.from(pointersRef.current.values());
          pinchRef.current = {
            distance: Math.hypot(a.x - b.x, a.y - b.y),
            midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          };
          setIsPanning(false);
          setIsPinching(true);
          return;
        }

        if (pointersRef.current.size === 1 && tool === "hand") {
          setIsPanning(true);
        }
        return;
      }

      // Mouse / pen: unchanged behaviour
      if (
        e.button === 1 ||
        isSpacePressed ||
        (tool === "hand" && e.button === 0)
      ) {
        setIsPanning(true);
      }
    },
    [isSpacePressed, tool],
  );

  const pan = useCallback(
    (e) => {
      if (e.pointerType === "touch" && pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointersRef.current.size === 2 && pinchRef.current) {
          const [a, b] = Array.from(pointersRef.current.values());
          const newDistance = Math.hypot(a.x - b.x, a.y - b.y);
          const newMidpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

          // Guard again right before use — pinchRef.current may have been
          // nulled by a racing pointerup/cancel between the check above
          // and here (common on iPadOS Safari multi-touch).
          const prevPinch = pinchRef.current;
          if (!prevPinch) return;

          const distanceRatio = newDistance / prevPinch.distance;

          setCamera((prev) => {
            const newScale = Math.min(
              Math.max(ZOOM.MIN || 0.1, prev.scale * distanceRatio),
              ZOOM.MAX || 5,
            );
            const scaleRatio = newScale / prev.scale;

            const zoomedX =
              newMidpoint.x - (newMidpoint.x - prev.x) * scaleRatio;
            const zoomedY =
              newMidpoint.y - (newMidpoint.y - prev.y) * scaleRatio;

            const panDx = newMidpoint.x - prevPinch.midpoint.x;
            const panDy = newMidpoint.y - prevPinch.midpoint.y;

            return { x: zoomedX + panDx, y: zoomedY + panDy, scale: newScale };
          });

          pinchRef.current = { distance: newDistance, midpoint: newMidpoint };
          return;
        }

        if (!(pointersRef.current.size === 1 && isPanning)) return;
      }

      if (!isPanning) return;
      setCamera((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
        scale: prev.scale,
      }));
    },
    [isPanning],
  );
  const stopPan = useCallback(
    (e) => {
      if (e?.pointerType === "touch" && e?.pointerId != null) {
        pointersRef.current.delete(e.pointerId);

        if (pointersRef.current.size < 2) {
          pinchRef.current = null;
          setIsPinching(false);
        }
        if (pointersRef.current.size === 1 && tool === "hand") {
          setIsPanning(true);
        } else {
          setIsPanning(false);
        }
        return;
      }
      // Non-touch pointerup (or synthetic call) — fully reset touch state too,
      // in case a stray touch pointer never got its own up/cancel event.
      pointersRef.current.clear();
      pinchRef.current = null;
      setIsPinching(false);
      setIsPanning(false);
    },
    [tool],
  );

  const handleButtonZoom = useCallback((delta) => {
    setCamera((prev) => {
      const newScale = Math.min(
        Math.max(ZOOM.MIN || 0.1, prev.scale + delta),
        ZOOM.MAX || 5,
      );
      const scaleRatio = newScale / prev.scale;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const newX = centerX - (centerX - prev.x) * scaleRatio;
      const newY = centerY - (centerY - prev.y) * scaleRatio;
      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  const zoomIn = () => handleButtonZoom(ZOOM.STEP || 0.1);
  const zoomOut = () => handleButtonZoom(-(ZOOM.STEP || 0.1));

  return {
    camera,
    isSpacePressed,
    isPanning,
    isPinching,
    startPan,
    pan,
    stopPan,
    handleWheel,
    zoomIn,
    zoomOut,
  };
};
