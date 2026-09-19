import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { businessApi } from "../api/business";
import { useAuth } from "./AuthContext";

const BusinessContext = createContext(null);
const ACTIVE_KEY = "negocore_active_business";

export function BusinessProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? Number(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const list = await businessApi.list();
      setBusinesses(list || []);
      setActiveBusinessId((prev) => {
        if (prev && list.some((b) => b.id === prev)) return prev;
        return list && list.length > 0 ? list[0].id : null;
      });
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else {
      setBusinesses([]);
      setActiveBusinessId(null);
    }
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (activeBusinessId) localStorage.setItem(ACTIVE_KEY, String(activeBusinessId));
  }, [activeBusinessId]);

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || null;

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusinessId,
        activeBusiness,
        setActiveBusinessId,
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness debe usarse dentro de BusinessProvider");
  return ctx;
}
