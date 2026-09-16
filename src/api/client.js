const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function getToken() {
  return localStorage.getItem("negocore_token");
}

async function request(path, { method = "GET", body, params, auth = true } = {}) {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifica que el backend esté corriendo en " + BASE_URL,
      0,
      null
    );
  }

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error || data.detail)) ||
      `Error ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data;
}

export const api = {
  get: (path, params, opts) => request(path, { method: "GET", params, ...opts }),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  patch: (path, body, opts) => request(path, { method: "PATCH", body, ...opts }),
  del: (path, opts) => request(path, { method: "DELETE", ...opts }),
};

export { ApiError, getToken };
