import { useState } from "react";
import {
  explainCode,
  humanizeCode,
  getAlternatives,
  prettifyCode,
  shortenCode,
  seoOptimizeCode,
} from "./api/backend";

const FEATURES = [
  { key: "explain", label: "Explain", handler: explainCode },
  { key: "humanize", label: "Humanize", handler: humanizeCode },
  { key: "alternatives", label: "Alternatives", handler: getAlternatives },
  { key: "prettify", label: "Prettify", handler: prettifyCode },
  { key: "shorten", label: "Shorten", handler: shortenCode },
  { key: "seo", label: "SEO Optimize", handler: seoOptimizeCode },
];

export default function App() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runFeature(feature) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await feature.handler(code, language);
      setResult({ feature: feature.label, data });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>Code Optimizer & Explainer</h1>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste your code here..."
        rows={14}
        style={{ width: "100%", fontFamily: "monospace", fontSize: 14 }}
      />

      <input
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        placeholder="Language (optional — leave blank to auto-detect)"
        style={{ width: "100%", margin: "8px 0", padding: 8 }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {FEATURES.map((f) => (
          <button key={f.key} onClick={() => runFeature(f)} disabled={loading || !code}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p>Processing...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div>
          <h2>{result.feature} Result</h2>
          <pre style={{ background: "#f4f4f4", padding: 12, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
