import { createContext, useContext, useEffect } from "react";

export const ThemeContext = createContext({
    theme: "light",
    isDark: false
});

export function ThemeProvider({ children }) {
    useEffect(() => {
        document.documentElement.setAttribute("data-bs-theme", "light");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
        try {
            localStorage.setItem("expense_tracker_theme", "light");
        } catch {
            // ignore
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: "light", isDark: false }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
