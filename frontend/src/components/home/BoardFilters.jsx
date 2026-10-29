import { Search, X, CalendarDays, ArrowUpDown } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

export default function BoardFilters({ onSearch, onDateFilter, onSort }) {
  const { register, setValue, control } = useForm({
    defaultValues: {
      boardName: "",
      startDate: "",
      endDate: "",
      filters: "recent",
    },
  });

  const [startDate, endDate] = useWatch({
    control,
    name: ["startDate", "endDate"],
  });

  const hasDateFilter = startDate || endDate;

  const clearDates = () => {
    setValue("startDate", "");
    setValue("endDate", "");
    onDateFilter?.({ startDate: "", endDate: "" });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none"
        />
        <input
          {...register("boardName")}
          type="text"
          placeholder="Search boards…"
          onChange={(e) => onSearch?.(e.target.value)}
          className="h-13 w-full pl-9 pr-3 rounded-xl 
            bg-background border border-border/40 hover:border-border
            text-md text-foreground placeholder:text-foreground/30
            focus:outline-none focus:border-border focus:ring-1 focus:ring-border/30
            transition-all shadow-sm"
        />
      </div>

      {/* Date range */}
      <div
        className={`flex items-center h-13 rounded-xl border shadow-sm transition-all px-3 gap-2
        bg-background
        ${
          hasDateFilter
            ? "border-primary/40 ring-1 ring-primary/20"
            : "border-border/40 hover:border-border"
        }`}
      >
        <CalendarDays size={14} className="text-foreground/30 flex-shrink-0" />
        <input
          {...register("startDate")}
          type="date"
          title="Start date"
          onChange={(e) =>
            onDateFilter?.({
              startDate: e.target.value,
              endDate: endDate || "",
            })
          }
          className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer w-32"
        />
        <span className="text-foreground/30 text-xs select-none">→</span>
        <input
          {...register("endDate")}
          type="date"
          title="End date"
          onChange={(e) =>
            onDateFilter?.({
              startDate: startDate || "",
              endDate: e.target.value,
            })
          }
          className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer w-32"
        />
        {hasDateFilter && (
          <button
            type="button"
            onClick={clearDates}
            title="Clear dates"
            className="ml-1 w-5 h-5 flex items-center justify-center rounded-md
              text-foreground/30 hover:text-foreground hover:bg-background-highlight
              transition-colors flex-shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="relative flex items-center h-13 rounded-xl border border-border/40 hover:border-border bg-background shadow-sm transition-all px-3 gap-2">
        <ArrowUpDown
          size={14}
          className="text-foreground/30 flex-shrink-0 pointer-events-none"
        />
        <select
          {...register("filters")}
          onChange={(e) => onSort?.(e.target.value)}
          className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer appearance-none pr-4"
        >
          <option value="recent">Most recent</option>
          <option value="a-z">Name A → Z</option>
          <option value="z-a">Name Z → A</option>
        </select>
      </div>
    </div>
  );
}
