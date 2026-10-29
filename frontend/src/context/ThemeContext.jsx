import { useState, useContext } from "react";
import { ThemeContext } from "./AllContexts.jsx";
export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(
    document.body.classList.contains("dark"),
  );

  const toggleDarkMode = () => {
    const newState = !isDark;
    setIsDark(newState);
    document.body.classList.toggle("dark", newState);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
export const useTheme = () => useContext(ThemeContext);
