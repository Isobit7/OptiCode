// Single place the frontend talks to the FastAPI backend.
// Set VITE_API_BASE_URL in your Vercel project's environment variables.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function post(path, body) {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const explainCode = (code, language) => post("/explain", { code, language });
export const humanizeCode = (code, language) => post("/humanize", { code, language });
export const getAlternatives = (code, language) => post("/alternatives", { code, language });
export const prettifyCode = (code, language) => post("/prettify", { code, language });
export const shortenCode = (code, language) => post("/shorten", { code, language });
export const seoOptimizeCode = (code) => post("/seo-optimize", { code });
