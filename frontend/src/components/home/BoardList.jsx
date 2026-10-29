import Card from "../Card";
import { useNavigate } from "react-router-dom";
import { CardSkeleton } from "../shimmer/CardSkeleton";
import { useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";

const ITEMS_PER_PAGE = 8;

export default function BoardList({ boards, loading, onDelete, onRename }) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(boards.length / ITEMS_PER_PAGE);
  const indexFirst = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentBoards = boards.slice(indexFirst, indexFirst + ITEMS_PER_PAGE);

  const goToNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const goToPrev = () => setCurrentPage((p) => Math.max(p - 1, 1));

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  /* ── Empty state ── */
  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-background-highlight border border-border/40 flex items-center justify-center">
          <LayoutGrid size={20} className="text-foreground/30" />
        </div>
        <p className="text-sm font-medium text-foreground/50">
          No whiteboards found
        </p>
        <p className="text-xs text-foreground/30">
          Create one above or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
        {currentBoards.map((board) => (
          <Card
            key={board._id}
            text={board.name}
            thumbnail={board.thumbnail}
            time={`Updated ${new Date(board.updatedAt).toLocaleDateString(
              undefined,
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              },
            )}`}
            sharedWith={board.sharedWith}
            owner={board.owner}
            onClick={() => navigate(`/whiteboard/${board._id}`)}
            onDelete={(e) => onDelete(board._id, e)}
            onRename={(newName) => onRename(board._id, newName)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/30">
          {/* Prev */}
          <button
            onClick={goToPrev}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl
              border border-border/40 hover:border-border
              bg-background hover:bg-background-highlight
              text-foreground disabled:opacity-30 disabled:cursor-not-allowed
              transition-all active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              const isCurrent = currentPage === page;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/50 hover:text-foreground hover:bg-background-highlight"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next */}
          <button
            onClick={goToNext}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-xl
              border border-border/40 hover:border-border
              bg-background hover:bg-background-highlight
              text-foreground disabled:opacity-30 disabled:cursor-not-allowed
              transition-all active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
