import { useCallback, useEffect, useState } from "react";

const TOAST_CONFIG = {
  success: {
    colorClass: "text-success",
    borderClass: "border-success/35",
    bgClass: "bg-success/20",
    icon: "✓",
  },
  error: {
    colorClass: "text-danger",
    borderClass: "border-danger/35",
    bgClass: "bg-danger/20",
    icon: "✕",
  },
  warning: {
    colorClass: "text-warning",
    borderClass: "border-warning/35",
    bgClass: "bg-warning/20",
    icon: "⚠",
  },
  info: {
    colorClass: "text-info",
    borderClass: "border-info/35",
    bgClass: "bg-info/20",
    icon: "ℹ",
  },
};

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-9999 flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ id, type, message, duration, onRemove }) {
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onRemove(id), 300);
  }, [id, onRemove]);

  useEffect(() => {
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [dismiss, duration]);

  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;

  return (
    <div
      role="alert"
      className={`
        relative pointer-events-auto flex items-start gap-3 overflow-hidden 
        rounded-lg min-w-260px max-w-380px p-4 border shadow-lg
        transition-all duration-300 ease-in-out text-foreground
        ${config.bgClass} ${config.borderClass} backdrop-blur-sm
        ${
          visible
            ? "animate-toast-slide-in opacity-100 translate-x-0 scale-100"
            : "opacity-0 translate-x-4 scale-95"
        }
      `}
      onClick={dismiss}
    >
      {/* Message */}
      <span className="flex-1 text-sm leading-snug break-words font-medium text-foreground">
        {message}
      </span>
    </div>
  );
}
