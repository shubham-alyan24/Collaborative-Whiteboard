import { useState, useEffect } from "react";
import { whiteboardApi } from "../../api/whiteboard.api.js";
import useToast from "../../hooks/useToast.js";
import { Check, X } from "lucide-react";

export default function SharePanel({ boardId, pendingRequests, onRespond }) {
  const toast = useToast();
  const [requests, setRequests] = useState(pendingRequests);

  // Sync from parent
  useEffect(() => {
    setRequests(pendingRequests);
  }, [pendingRequests]);

  // Periodic refresh
  useEffect(() => {
    if (!boardId) return;
    const interval = setInterval(async () => {
      try {
        const data = await whiteboardApi.getOne(boardId);
        setRequests(data.pendingRequests || []);
      } catch (err) {
        console.error("Failed to fetch pending requests:", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [boardId]);

  const handleRespond = async (requestId, approve) => {
    try {
      await onRespond(requestId, approve);
      setRequests((prev) =>
        prev.filter((r) => r._id?.toString() !== requestId?.toString()),
      );
    } catch (err) {
      console.error("Failed to respond:", err);
      toast.error("Failed to respond to request");
    }
  };

  if (requests.length === 0) return null;

  return (
    /* Anchored top-left, below the header bar — never overlaps toolbar */
    <div>
      {requests.map((req) => (
        <div
          key={req._id}
          className="flex items-center gap-3
            bg-background border border-border/20
            rounded-2xl px-3 py-2.5 shadow-lg
            animate-in slide-in-from-left-3 fade-in duration-200"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden border border-border/40 flex-shrink-0 bg-background-highlight">
            <img
              src={
                req.userId?.profilePicture ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${req.userId?.name}`
              }
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate leading-tight">
              {req.userId?.name}
            </span>
            <span className="text-xs text-foreground/50 leading-tight">
              wants to edit
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 ml-auto flex-shrink-0">
            <button
              onClick={() => handleRespond(req._id, true)}
              title="Approve"
              className="w-8 h-8 flex items-center justify-center rounded-xl
                bg-success/10 hover:bg-success text-success hover:text-background
                transition-all active:scale-90 cursor-pointer"
            >
              <Check size={14} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleRespond(req._id, false)}
              title="Deny"
              className="w-8 h-8 flex items-center justify-center rounded-xl
                bg-background-highlight hover:bg-danger text-foreground/60 hover:text-background
                transition-all active:scale-90 cursor-pointer"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
