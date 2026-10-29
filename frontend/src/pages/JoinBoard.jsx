import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { whiteboardApi } from "../api/whiteboard.api.js";
import Canvas from "../components/whiteboard/Canvas.jsx";
import useToast from "../hooks/useToast.js";

export default function JoinBoard() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const pollRef = useRef(null);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState("idle");

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const data = await whiteboardApi.joinByCode(code);
        setBoard(data);
      } catch (err) {
        console.log(err);
        setError("Board not found. Check your code or link.");
      }
    };
    fetchBoard();
  }, [code]);

  const startPolling = (boardId) => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await whiteboardApi.getOne(boardId);
        const approved = data.sharedWith?.some(
          (s) =>
            s.userId?.toString() === user._id?.toString() ||
            s.userId?._id?.toString() === user._id?.toString(),
        );
        if (approved) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          toast.success("You've been approved! Redirecting...");
          setTimeout(() => navigate(`/whiteboard/${boardId}`), 2000);
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleRequestAccess = async () => {
    if (!user) {
      navigate(`/login?redirect=/join/${code}`);
      return;
    }
    try {
      await whiteboardApi.requestAccess(board._id);
      setRequestStatus("sent");
      toast.success("Request sent! Waiting for owner approval...");
      startPolling(board._id);
    } catch (err) {
      if (err.message?.includes("Already")) {
        setRequestStatus("already");
        toast.info("Request already sent");
        startPolling(board._id);
      } else {
        console.error(err);
        toast.error("Failed to send request");
      }
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center gap-3 flex flex-col">
          <p className="text-xl font-semibold">{error}</p>
          <button
            onClick={() => navigate("/home")}
            className="text-sm text-primary underline"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <p>Loading board...</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div className="absolute top-3 left-3 z-10 bg-background border border-border-muted rounded-md px-3 py-1 text-sm text-foreground flex items-center gap-2">
        <span>{board.name}</span>
        <span className="text-xs text-foreground-muted bg-background-highlight px-2 py-0.5 rounded-md">
          View only
        </span>
      </div>

      <div className="absolute top-3 right-4 z-10">
        {requestStatus === "idle" && (
          <button
            onClick={handleRequestAccess}
            className="bg-primary text-primary-foreground font-semibold text-sm px-4 py-2 rounded-md hover:bg-primary-hover transition-all cursor-pointer"
          >
            {user ? "Request to Edit" : "Login to Edit"}
          </button>
        )}
        {requestStatus === "sent" && (
          <span className="text-sm bg-background border border-border-muted px-4 py-2 rounded-md text-foreground-muted">
            Request sent — waiting for owner
          </span>
        )}
        {requestStatus === "already" && (
          <span className="text-sm bg-background border border-border-muted px-4 py-2 rounded-md text-foreground-muted">
            Request already sent
          </span>
        )}
      </div>

      <Canvas
        tool="hand"
        color="black"
        penSize={5}
        eraserSize={20}
        zoom={1}
        setZoom={() => {}}
        loadStrokes={board.strokes || []}
        readOnly={true}
      />
    </div>
  );
}
