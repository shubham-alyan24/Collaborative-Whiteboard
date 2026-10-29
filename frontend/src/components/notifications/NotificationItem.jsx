import { Check, X, Trash2 } from "lucide-react";

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const TYPE_CONFIG = {
  request_received: { dot: "bg-primary" },
  request_approved: { dot: "bg-success" },
  request_denied: { dot: "bg-danger" },
  added_to_board: { dot: "bg-info" },
};

export default function NotificationItem({
  notification,
  onAction,
  onDelete,
  onMarkRead,
}) {
  const { _id, sender, board, type, message, isRead, createdAt } = notification;
  const isRequestType = type === "request_received";
  const config = TYPE_CONFIG[type] ?? { dot: "bg-foreground/20" };

  return (
    <div
      onClick={() => !isRead && onMarkRead(_id)}
      className={`group flex gap-3 px-4 py-3 cursor-pointer transition-colors
        border-b border-border/30 last:border-0
        ${isRead ? "bg-background" : "bg-background-highlight"}
        hover:bg-background-highlight`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div
          className="w-8 h-8 rounded-xl bg-primary/10 text-primary
          flex items-center justify-center text-xs font-bold select-none"
        >
          {sender?.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        {/* Type dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
          ring-2 ring-background ${config.dot}`}
        />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-sm text-foreground leading-snug">{message}</p>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-foreground/40">
            {timeAgo(createdAt)}
          </span>
          {board && (
            <>
              <span className="text-foreground/20 text-[11px]">·</span>
              <span className="text-[11px] text-foreground/40 truncate max-w-[120px]">
                {board.name}
              </span>
            </>
          )}
          {!isRead && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>

        {/* Accept / Reject actions */}
        {isRequestType && (
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(_id, "accept", board?._id);
              }}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg
                bg-primary text-primary-foreground text-xs font-semibold
                hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
            >
              <Check size={12} strokeWidth={2.5} /> Accept
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(_id, "reject", board?._id);
              }}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg
                bg-background-highlight border border-border/50
                text-foreground/60 text-xs font-semibold
                hover:bg-danger hover:text-background hover:border-danger
                active:scale-95 transition-all cursor-pointer"
            >
              <X size={12} strokeWidth={2.5} /> Reject
            </button>
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(_id);
        }}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg
          text-foreground/20 hover:text-danger hover:bg-danger/10
          opacity-0 group-hover:opacity-100
          transition-all active:scale-90 cursor-pointer mt-0.5"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
