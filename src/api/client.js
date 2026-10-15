export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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

export const NETWORK_ERROR_MESSAGE =
  "No se pudo conectar con el servidor. Verifica que el backend esté corriendo en " + API_BASE_URL;

const STATUS_MESSAGES = {
  400: "La solicitud no es válida. Revisa los datos e inténtalo de nuevo.",
  401: "Tu sesión ha expirado o no es válida. Inicia sesión nuevamente.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No se encontró lo que buscas.",
  405: "Esta acción no está permitida.",
  409: "No se pudo completar la operación porque entra en conflicto con datos existentes.",
  413: "El archivo es demasiado grande.",
  415: "El tipo de archivo no es compatible.",
};

// Prioriza el mensaje que envía el backend (ya en español); si no hay, usa uno
// genérico en español según el código HTTP, nunca el texto en inglés de Spring.
export function buildErrorMessage(status, data) {
  const backendMessage =
    data && typeof data === "object" && typeof data.message === "string"
      ? data.message.trim()
      : "";

  if (backendMessage) {
    const details =
      data.errors && typeof data.errors === "object" ? Object.values(data.errors) : [];
    if (details.length > 0) {
      return `${backendMessage.replace(/\.$/, "")}: ${details.join("; ")}`;
    }
    return backendMessage;
  }

  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  if (status >= 500) return "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.";
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

async function request(path, { method = "GET", body, params, auth = true } = {}) {
  let url = `${API_BASE_URL}${path}`;
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
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0, null);
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
    throw new ApiError(buildErrorMessage(res.status, data), res.status, data);
  }

  return data;
}

export const api = {
  get: (path, params, opts) => request(path, { method: "GET", params, ...opts }),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  put: (path, body, opts) => request(path, { method: "PUT", body, ...opts }),
  patch: (path, body, opts) => request(path, { method: "PATCH", body, ...opts }),
  del: (path, opts) => request(path, { method: "DELETE", ...opts }),
};

export { ApiError, getToken };
