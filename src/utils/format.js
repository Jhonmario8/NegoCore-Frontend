export function formatMoney(value, currency = "COP") {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${n.toLocaleString("es-CO")}`;
  }
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function errorMessage(err) {
  if (!err) return "Ocurrió un error inesperado.";
  return err.message || "Ocurrió un error inesperado.";
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = import.meta.env.VITE_API_URL || "http://localhost:8080";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}
