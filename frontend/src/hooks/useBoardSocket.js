import { useState, useEffect } from "react";
import { whiteboardApi } from "../api/whiteboard.api.js";
import { useSocket } from "./useSocket.js";
import useToast from "./useToast.js";
import { createFrameStore } from "../utils/frameStore.js";

export const useBoardSocket = (id, user, setStrokes) => {
  const { connect, disconnect, emit } = useSocket();
  const toast = useToast();

  const [boardName, setBoardName] = useState("Untitled");
  const [shareCode, setShareCode] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  // Kept outside React state so high-frequency socket events don't re-render the page
  const [cursorStore] = useState(() => createFrameStore({}));
  const [liveStrokes] = useState(() => createFrameStore(new Map()));
  const [presentUsers, setPresentUsers] = useState([]);

  useEffect(() => {
    if (!id) return;
    whiteboardApi
      .getOne(id)
      .then((data) => {
        setBoardName(data.name);
        setStrokes(data.strokes || []);
        setShareCode(data.shareCode || "");
        setPendingRequests(data.pendingRequests || []);
      })
      .catch((err) => {
        console.error("Save error details:", err); // Look at your browser console for this!
        toast.error("Failed to load whiteboard");
      });
  }, [id, setStrokes, toast]);

  useEffect(() => {
    if (!id || !user) return;
    const socket = connect();

    // Identity comes from the socket's JWT on the server
    socket.emit("join-board", { boardId: id });

    socket.on("stroke-update", ({ stroke }) =>
      setStrokes((prev) => [...prev, stroke]),
    );

    // A collaborator's stroke while it is being drawn: batches of points
    // appended from index `from` (0 = replace, e.g. shapes and snaps)
    socket.on("stroke-progress", ({ stroke, from, points, socketId }) => {
      liveStrokes.set((map) => {
        const existing = map.get(stroke.id);
        if (existing && from > 0) existing.points.push(...points);
        else map.set(stroke.id, { ...stroke, points, socketId });
        return map;
      });
    });

    socket.on("stroke-cancel", ({ id }) => {
      liveStrokes.set((map) => {
        map.delete(id);
        return map;
      });
    });

    socket.on("stroke-erase", ({ ids }) => {
      const erased = new Set(ids);
      setStrokes((prev) => prev.filter((s) => !erased.has(s.id)));
    });

    // Full-array replace from a collaborator's move/undo/redo
    socket.on("board-sync", ({ strokes }) => setStrokes(strokes));

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    socket.on("cursor-move", ({ socketId, username, color, x, y }) => {
      cursorStore.set((prev) => ({
        ...prev,
        [socketId]: { username, color, x, y },
      }));
    });

    socket.on("cursor-leave", ({ socketId }) => {
      cursorStore.set((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      liveStrokes.set((map) => {
        for (const [id, s] of map) if (s.socketId === socketId) map.delete(id);
        return map;
      });
    });

    socket.on("presence-update", (users) => setPresentUsers(users));

    return () => {
      socket.emit("leave-board", { boardId: id });
      disconnect();
    };
  }, [id, user, connect, disconnect, setStrokes, cursorStore, liveStrokes]);

  return {
    boardName,
    setBoardName,
    shareCode,
    pendingRequests,
    setPendingRequests,
    cursorStore,
    liveStrokes,
    presentUsers,
    emit,
  };
};
