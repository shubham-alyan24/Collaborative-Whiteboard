import { Link } from "react-router-dom";
import DarkModeToggle from "./DarkModeToggle";
import Logo from "./Logo";

export default function Header() {
  return (
    <div className="py-3 px-6 w-3/4 flex justify-between bg-background rounded-l-full rounded-r-full">
      <Logo />

      <div className="flex gap-5 ">
        {/* dark mode */}
        <DarkModeToggle />
        <Link to="/login">
          <button
            size="lg"
            className="text-md cursor-pointer bg-primary text-background rounded-l-full rounded-r-full
            p-3 text-text font-body text-semibold "
          >
            Get Started
          </button>
        </Link>
      </div>
    </div>
  );
}
