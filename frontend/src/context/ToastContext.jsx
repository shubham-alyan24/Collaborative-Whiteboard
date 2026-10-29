import { useCallback, useState } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { ToastContext } from "./AllContexts";
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    ({ type = "info", message, duration = 3000 }) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      return id;
    },
    [],
  );

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, opts) => addToast({ type: "success", message, ...opts }),
    error: (message, opts) => addToast({ type: "error", message, ...opts }),
    warning: (message, opts) => addToast({ type: "warning", message, ...opts }),
    info: (message, opts) => addToast({ type: "info", message, ...opts }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}
