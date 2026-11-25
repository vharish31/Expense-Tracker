import { useCallback, useMemo, useState } from "react";
import API from "../services/api";
import { AuthContext } from "./auth";

function readUser() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(readUser);
    const [token, setToken] = useState(localStorage.getItem("token"));

    const persist = useCallback((nextUser, nextToken) => {
        setUser(nextUser);
        setToken(nextToken);

        if (nextUser && nextToken) {
            localStorage.setItem("user", JSON.stringify(nextUser));
            localStorage.setItem("token", nextToken);
        } else {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
        }
    }, []);

    const register = useCallback(async (form) => {
        const { data } = await API.post("/auth/register", form);
        persist(data.user, data.token);
    }, [persist]);

    const login = useCallback(async (form) => {
        const { data } = await API.post("/auth/login", form);
        persist(data.user, data.token);
    }, [persist]);

    const logout = useCallback(() => {
        persist(null, null);
    }, [persist]);

    const value = useMemo(
        () => ({
            user,
            token,
            isAuthenticated: Boolean(user && token),
            register,
            login,
            logout
        }),
        [user, token, register, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
