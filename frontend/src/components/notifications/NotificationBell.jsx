import { Bell } from "lucide-react";
import { useState } from "react";
import NotificationDropdown from "./NotificationDropdown.jsx";
import useNotifications from "../../hooks/useNotifications.js";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleAction,
    refresh,
  } = useNotifications();

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      refresh();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className={`w-10 h-10 flex items-center justify-center cursor-pointer
        bg-background hover:bg-background-highlight
        border border-border/40 hover:border-border
        text-foreground transition-all rounded-2xl shadow-sm
        active:scale-95 `}
      >
        <Bell className="hover:text-primary" size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
        )}
      </button>

      <NotificationDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
        onAction={handleAction}
      />
    </div>
  );
}
