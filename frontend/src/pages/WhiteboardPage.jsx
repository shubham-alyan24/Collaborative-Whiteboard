import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { whiteboardApi } from "../api/whiteboard.api.js";
import { useAuth } from "../hooks/useAuth.js";
import { useWhiteboard } from "../hooks/useWhiteboard.js";
import { useBoardSocket } from "../hooks/useBoardSocket.js";
import useToast from "../hooks/useToast.js";
import { useCamera } from "../hooks/useCamera.js";
import { useHistory } from "../hooks/useHistory";
// Components
import Canvas from "../components/whiteboard/Canvas";
import Toolbar from "../components/whiteboard/Toolbar";
import BoardHeader from "../components/whiteboard/BoardHeader";

export default function WhiteboardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const canvasRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [shapeType, setShapeType] = useState("rectangle");
  const [activePanel, setActivePanel] = useState(null);
  // 1. Board state (drawing)
  const {
    strokes,
    setStrokes,
    tool,
    setTool,
    color,
    setColor,
    penSize,
    setPenSize,
    eraserSize,
    setEraserSize,
    debouncedSave,
    saveThumbnail,
  } = useWhiteboard(id);

  const {
    camera,
    handleWheel,
    isSpacePressed,
    isPanning,
    isPinching,
    startPan,
    pan,
    stopPan,
    zoomIn,
    zoomOut,
  } = useCamera(tool);
  const {
    boardName,
    setBoardName,
    shareCode,
    pendingRequests,
    setPendingRequests,
    cursorStore,
    liveStrokes,
    presentUsers,
    emit,
  } = useBoardSocket(id, user, setStrokes);

  // Debounced save of the full strokes array + thumbnail
  const persistStrokes = useCallback(
    (newStrokes) => {
      setSaving(true);
      debouncedSave(newStrokes, async (strokesToSave) => {
        try {
          await whiteboardApi.update(id, {
            strokes: strokesToSave,
            name: boardName,
          });
          const canvasElement = canvasRef.current?.getCanvas();
          if (canvasElement) await saveThumbnail(canvasElement);
        } catch (err) {
          console.error("Save error:", err);
          toast.error("Failed to save changes");
        } finally {
          setSaving(false);
        }
      });
    },
    [id, boardName, debouncedSave, saveThumbnail, toast],
  );

  // Undo/redo: broadcast the restored array and save it
  const handleHistoryRestore = useCallback(
    (restoredStrokes) => {
      emit("board-sync", { boardId: id, strokes: restoredStrokes });
      persistStrokes(restoredStrokes);
    },
    [id, emit, persistStrokes],
  );

  const { pushToHistory, undo, redo, canUndo, canRedo } = useHistory(
    strokes,
    setStrokes,
    handleHistoryRestore,
  );
  const isDrawMode = !isSpacePressed && !isPinching && tool !== "hand";
  const [textColor, setTextColor] = useState("#000000");
  const [textFontSize, setTextFontSize] = useState(20);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.shiftKey ? redo() : undo();
        }
        if (e.key === "y") redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // 3. Handlers
  const handleInsertImage = (dataUrl) =>
    canvasRef.current?.insertImage(dataUrl);
  const handleStrokesChange = useCallback(
    (newStrokes) => {
      // 1. Push to undo/redo history FIRST (before setStrokes happens inside it)
      pushToHistory(strokes, newStrokes);

      // 2. Sync to other users — distinguish add vs erase
      if (newStrokes.length > strokes.length) {
        // A pen stroke was added
        const latestStroke = newStrokes[newStrokes.length - 1];
        if (latestStroke)
          emit("stroke-update", { boardId: id, stroke: latestStroke });
      } else if (newStrokes.length < strokes.length) {
        // Strokes were erased/deleted — send only their ids
        const kept = new Set(newStrokes.map((s) => s.id));
        const ids = strokes.filter((s) => !kept.has(s.id)).map((s) => s.id);
        emit("stroke-erase", { boardId: id, ids });
      } else {
        // A stroke was moved/resized/snapped — send the full array
        emit("board-sync", { boardId: id, strokes: newStrokes });
      }

      // 3. Save to DB
      persistStrokes(newStrokes);
    },
    [id, strokes, pushToHistory, emit, persistStrokes],
  );

  const handleRespond = async (requestId, approve) => {
    try {
      await whiteboardApi.respondToRequest(id, requestId, approve);
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
      toast.success(approve ? "Approved" : "Denied");
    } catch (err) {
      console.error("Respond error:", err);
      toast.error("Action failed");
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden touch-none"
      onWheel={handleWheel}
      onPointerDownCapture={startPan}
      onPointerMoveCapture={pan}
      onPointerUpCapture={stopPan}
      onPointerCancel={stopPan}
      onPointerLeave={stopPan}
    >
      <BoardHeader
        boardName={boardName}
        onRename={setBoardName}
        saving={saving}
        shareCode={shareCode}
        presentUsers={presentUsers}
        boardId={id}
        pendingRequests={pendingRequests}
        onRespond={handleRespond}
        strokes={strokes}
      />
      {/* Drawing canvas */}
      <Canvas
        ref={canvasRef}
        tool={tool}
        shapeType={shapeType}
        overrideCursor={isSpacePressed || isPanning ? "grab" : null}
        readOnly={!isDrawMode}
        color={color}
        penSize={penSize}
        eraserSize={eraserSize}
        loadStrokes={strokes}
        onStrokesChange={handleStrokesChange}
        onStrokeProgress={(stroke, from, points) =>
          emit("stroke-progress", { boardId: id, stroke, from, points })
        }
        onStrokeCancel={(strokeId) =>
          emit("stroke-cancel", { boardId: id, id: strokeId })
        }
        onCursorMove={(x, y) => emit("cursor-move", { boardId: id, x, y })}
        onCanvasPointerDown={() => setActivePanel(null)}
        cursorStore={cursorStore}
        live={liveStrokes}
        camera={camera}
        textColor={textColor}
        textFontSize={textFontSize}
      />{" "}
      {/* Unified toolbar — bottom centre */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        penSize={penSize}
        setPenSize={setPenSize}
        eraserSize={eraserSize}
        setEraserSize={setEraserSize}
        shapeType={shapeType}
        setShapeType={setShapeType}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        scale={camera.scale}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        clearCanvas={() => canvasRef.current?.clear()}
        undo={undo}
        redo={redo}
        onInsertImage={handleInsertImage}
        textColor={textColor}
        setTextColor={setTextColor}
        textFontSize={textFontSize}
        setTextFontSize={setTextFontSize}
        boardId={id}
      />
    </div>
  );
}
