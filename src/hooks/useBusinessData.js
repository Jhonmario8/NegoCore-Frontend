import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "../context/BusinessContext";

export function useBusinessData(fetcher, deps = []) {
  const { activeBusinessId } = useBusiness();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!activeBusinessId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher(activeBusinessId);
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, loading, error, reload: load, businessId: activeBusinessId };
}
