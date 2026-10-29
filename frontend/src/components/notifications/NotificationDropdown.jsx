import { useRef, useEffect } from "react";
import { Bell, CheckCheck, Inbox, Loader2 } from "lucide-react";
import NotificationItem from "./NotificationItem.jsx";

export default function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onAction,
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-[calc(100%+8px)] right-0 z-50
  w-[calc(100vw-1.5rem)] max-w-88 max-h-[480px] flex flex-col
  bg-background border border-border/40
  rounded-2xl shadow-2xl overflow-hidden
  animate-in fade-in zoom-in-95 duration-150 origin-top-right"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-foreground/50" />
          <span className="text-sm font-semibold text-foreground">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              className="flex items-center justify-center min-w-[20px] h-5 px-1.5
              bg-primary text-primary-foreground
              text-[10px] font-bold rounded-full"
            >
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg
              text-xs font-medium text-foreground/50
              hover:text-foreground hover:bg-background-highlight
              active:scale-95 transition-all cursor-pointer"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto
        [&::-webkit-scrollbar]:w-1
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-border/40
        [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-foreground/30">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div
              className="w-10 h-10 rounded-2xl bg-background-highlight border border-border/40
              flex items-center justify-center"
            >
              <Inbox size={18} className="text-foreground/30" />
            </div>
            <p className="text-sm font-medium text-foreground/40">
              All caught up
            </p>
            <p className="text-xs text-foreground/25">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onAction={onAction}
              onDelete={onDelete}
              onMarkRead={onMarkAsRead}
            />
          ))
        )}
      </div>
    </div>
  );
}
