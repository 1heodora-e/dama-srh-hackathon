/** Backend API base URL — set VITE_API_BASE_URL in Vercel (no trailing slash). */
const DEFAULT_BASE = "http://127.0.0.1:8000";

function normalizeBase(url) {
  return String(url || DEFAULT_BASE).replace(/\/+$/, "");
}

export const API_BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL);

/** Build a full API path, e.g. apiUrl("/api/vulnerability/scores") */
export function apiUrl(path) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}
