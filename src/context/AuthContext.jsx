import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/auth";

const AuthContext = createContext(null);

const TOKEN_KEY = "negocore_token";
const USER_KEY = "negocore_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const login = useCallback(async ({ email, password }) => {
    const res = await authApi.login({ email, password });
    // Se escribe de forma síncrona (no solo vía el useEffect de abajo) para que
    // cualquier fetch autenticado disparado en el mismo commit (p. ej. el efecto
    // de BusinessContext que carga los negocios) ya encuentre el token guardado.
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser({ id: res.userId, name: res.userName, phoneNumber: res.phoneNumber });
    return res;
  }, []);

  const register = useCallback(async (payload) => {
    return authApi.register(payload);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("negocore_active_business");
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
