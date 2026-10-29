import Logo from "../Logo";
import DarkModeToggle from "../DarkModeToggle";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { useRef, useState, useEffect } from "react";
import NotificationBell from "../notifications/NotificationBell.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex justify-between items-center gap-2 p-2 rounded-lg bg-background shadow-sm flex-wrap">
      <Logo />
      <div className="flex gap-2 sm:gap-3 items-center">
        <DarkModeToggle />
        <NotificationBell />
        {user ? (
          <div className="flex items-center gap-3 relative group cursor-pointer">
            <button
              className={`w-10 h-10 flex items-center justify-center cursor-pointer
        bg-background hover:bg-background-highlight
        border border-border/40 hover:border-border
        text-foreground transition-all rounded-2xl shadow-sm
        active:scale-95 `}
              onClick={() => setIsOpen(!isOpen)}
            >
              <User className="hover:text-primary" size={17} />
            </button>
            {isOpen && (
              <div
                ref={menuRef}
                className="absolute top-full right-0 z-20 w-40 max-w-[calc(100vw-1.5rem)] text-center p-5 border border-border-muted rounded-md bg-background text-foreground mt-2 shadow-lg"
              >
                <button
                  onClick={() => navigate("/settings")}
                  className="text-sm text-foreground cursor-pointer truncate w-full"
                >
                  {user.name}
                </button>

                <hr className="my-2 border-t border-border" />
                <button
                  onClick={handleLogout}
                  className="py-2 px-1 w-full hover:bg-danger hover:text-background rounded-md text-sm cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="border border-border-muted py-2 px-3 sm:px-4 rounded-md bg-primary cursor-pointer text-primary-foreground hover:bg-background hover:text-primary hover:border-primary transition-all whitespace-nowrap"
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
}
