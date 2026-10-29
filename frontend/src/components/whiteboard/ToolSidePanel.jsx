import { X } from "lucide-react";

export default function ToolSidePanel({
  open,
  title,
  icon,
  onClose,
  children,
}) {
  return (
    <div
      className={`fixed top-20 right-0 z-40 w-72 max-w-[calc(100vw-1.5rem)]
        bg-background border border-border-muted/60 shadow-2xl
        rounded-l-2xl overflow-hidden
        transition-transform duration-300 ease-out
        ${open ? "translate-x-0" : "translate-x-[110%] pointer-events-none"}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-muted/50 bg-background-highlight">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          {icon}
          {title}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground/50 hover:text-foreground hover:bg-background transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
