const DEFAULT_API_URL = "";

export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined) ?? DEFAULT_API_URL;
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (trimmed) return trimmed;
  // fallback: mesma origem (modo Hostinger/rewrite)
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

