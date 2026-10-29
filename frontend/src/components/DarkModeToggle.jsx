import { Moon } from "lucide-react";
import { Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
export default function DarkModeToggle({ className = "" }) {
  const { isDark, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`w-10 h-10 flex items-center justify-center cursor-pointer
        bg-background hover:bg-background-highlight
        border border-border/40 hover:border-border
        text-foreground transition-all rounded-2xl shadow-sm
        active:scale-95 ${className}`}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
