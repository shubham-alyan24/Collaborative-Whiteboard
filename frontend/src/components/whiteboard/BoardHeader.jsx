import { useState, useRef, useEffect } from "react";
import DarkModeToggle from "../DarkModeToggle";
import useToast from "@/hooks/useToast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, Check, Users, Download } from "lucide-react";
import SharePanel from "./SharePanel";
import { useTheme } from "@/context/ThemeContext";

// ── Export helper ──────────────────────────────────────────────────────────
const PADDING = 40; // px of whitespace around the drawing

function exportToPng(strokes, boardName, isDark) {
  if (!strokes || strokes.length === 0) return null;
  console.log("fxn called");
  // 1. Find bounding box across all stroke points (world coordinates)
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  strokes.forEach((stroke) => {
    const halfSize = (stroke.size || 2) / 2;
    stroke.points.forEach(([x, y]) => {
      minX = Math.min(minX, x - halfSize);
      minY = Math.min(minY, y - halfSize);
      maxX = Math.max(maxX, x + halfSize);
      maxY = Math.max(maxY, y + halfSize);
    });
  });

  const contentW = maxX - minX;
  const contentH = maxY - minY;

  if (contentW <= 0 || contentH <= 0) return null;

  // 2. Create an offscreen canvas sized to content + padding
  const dpr = window.devicePixelRatio || 1;
  const canvasW = contentW + PADDING * 2;
  const canvasH = contentH + PADDING * 2;

  const offscreen = document.createElement("canvas");
  offscreen.width = canvasW * dpr;
  offscreen.height = canvasH * dpr;

  const ctx = offscreen.getContext("2d");
  ctx.scale(dpr, dpr);

  // 3. Fill background matching the current theme
  ctx.fillStyle = isDark ? "#000000" : "#FFFFFF";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 4. Translate so world-origin maps to top-left padding
  ctx.translate(PADDING - minX, PADDING - minY);

  // 5. Redraw every stroke exactly as useCanvas does
  strokes.forEach((stroke) => {
    if (!stroke?.points?.length) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.globalCompositeOperation = "source-over";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    stroke.points.forEach(([x, y], i) => {
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // 6. Trigger download
  const dataUrl = offscreen.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${boardName || "whiteboard"}.png`;
  a.click();
}

export default function BoardHeader({
  boardName,
  onRename,
  saving,
  shareCode,
  presentUsers,
  onCopyShareCode,
  id,
  pendingRequests,
  handleRespond,
  strokes,
}) {
  const { isDark } = useTheme();
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus();
  }, [isRenaming]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isMenuOpen]);

  const handleRename = () => {
    if (tempName.trim() && tempName !== boardName) onRename(tempName.trim());
    setIsRenaming(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/join/${shareCode}`,
    );
    setCopied(true);
    toast.success("Link copied to clipboard");
    onCopyShareCode?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* ── Top-left: Back + Board name ── */}
      <div className="z-10 absolute top-3 left-3 flex items-center gap-2">
        <button
          onClick={() => navigate("/home")}
          title="Back to home"
          className="w-10 h-10 flex items-center justify-center rounded-2xl
            bg-background text-foreground hover:bg-background-highlight
            border border-border/40 hover:border-border
            transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft size={17} />
        </button>

        <div className="flex items-center gap-2 h-10 px-3 rounded-2xl bg-background border border-border/40 text-foreground shadow-sm">
          {isRenaming ? (
            <input
              ref={inputRef}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              onBlur={handleRename}
              className="text-sm font-medium bg-transparent border-none focus:outline-none w-40"
            />
          ) : (
            <span
              className="text-sm font-medium cursor-text select-none"
              onDoubleClick={() => {
                setTempName(boardName);
                setIsRenaming(true);
              }}
              title="Double-click to rename"
            >
              {boardName}
            </span>
          )}
          {saving && (
            <span className="text-[11px] text-foreground/40 pl-2 border-l border-border">
              Saving…
            </span>
          )}
        </div>
      </div>

      {/* ── Top-right: Export + Share + Dark mode ── */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 ">
        {/* Export button */}
        <button
          onClick={() => exportToPng(strokes, boardName, isDark)}
          title="Export as PNG"
          className="w-10 h-10 flex items-center justify-center rounded-2xl
            bg-background text-foreground hover:bg-background-highlight
            border border-border/40 hover:border-border
            transition-all shadow-sm active:scale-95"
        >
          <Download size={17} />
        </button>

        <div className="relative " ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 h-10 px-4 rounded-2xl
              bg-background text-foreground     border border-border/40            hover:opacity-90 active:scale-95
              transition-all shadow-sm text-sm font-medium"
          >
            Share
            {presentUsers.length > 0 && (
              <span className="flex items-center gap-1 bg-background-highlight rounded-md px-2 py-0.5 text-xs font-semibold">
                <Users size={11} />
                {presentUsers.length}
              </span>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right">
              <div className="p-3 flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest px-1">
                  Invite link
                </p>
                <div className="flex items-center gap-2 bg-background-highlight rounded-xl border border-border/60 px-3 py-2">
                  <code className="text-xs font-mono text-foreground/70 flex-1 truncate">
                    {shareCode}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                      copied
                        ? "bg-success/15 text-success"
                        : "bg-background hover:bg-background-highlight border border-border/60 text-foreground"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={11} /> Copied
                      </>
                    ) : (
                      <>
                        <Link2 size={11} /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="h-px bg-border/50 mx-3" />

              <div className="p-3 flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest px-1">
                  Online · {presentUsers.length}
                </p>
                <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto">
                  {presentUsers.length > 0 ? (
                    presentUsers.map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-background-highlight transition-colors"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.username?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="text-sm text-foreground truncate flex-1">
                          {u.username}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-foreground/40 italic px-2 py-1.5">
                      No one else is here yet
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px bg-border/50 mx-3" />
              <div className="p-3 flex flex-col gap-2">
                {" "}
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest px-1">
                  Requests{" "}
                </p>
                <SharePanel
                  boardId={id}
                  pendingRequests={pendingRequests}
                  onRespond={handleRespond}
                />
              </div>
            </div>
          )}
        </div>

        <DarkModeToggle />
      </div>
    </>
  );
}
