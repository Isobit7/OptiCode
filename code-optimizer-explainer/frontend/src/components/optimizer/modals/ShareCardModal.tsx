import { useState, useRef } from "react";
import { X, Download, Sparkles, Copy, Check } from "lucide-react";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
  actionTitle?: string;
}

export function ShareCardModal({ isOpen, onClose, code, language, actionTitle }: ShareCardModalProps) {
  const [theme, setTheme] = useState<"sunset" | "ocean" | "emerald" | "neon">("sunset");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const themes = {
    sunset: "from-orange-500 via-rose-500 to-purple-600",
    ocean: "from-blue-600 via-indigo-600 to-purple-700",
    emerald: "from-emerald-500 via-teal-600 to-cyan-700",
    neon: "from-fuchsia-600 via-pink-600 to-rose-600",
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-lg font-bold text-zinc-100">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <span>Carbon-Style Shareable Snippet Card</span>
        </div>
        <p className="text-xs text-zinc-400">Customizable code card with AI summary banner.</p>

        {/* Theme Selectors */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-300">Gradient Theme:</span>
          {(["sunset", "ocean", "emerald", "neon"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`h-6 w-6 rounded-full bg-gradient-to-r ${themes[t]} transition ${
                theme === t ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110" : "opacity-70 hover:opacity-100"
              }`}
            />
          ))}
        </div>

        {/* Preview Card */}
        <div
          ref={cardRef}
          className={`mt-5 rounded-2xl bg-gradient-to-br ${themes[theme]} p-6 shadow-2xl transition-all`}
        >
          <div className="rounded-xl border border-white/10 bg-zinc-950/90 p-4 backdrop-blur-md">
            {/* Mac OS Window Controls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                <Sparkles className="h-3 w-3 text-orange-400" />
                <span>OptiCode AI · {actionTitle || "Optimized Code"}</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">{language}</span>
            </div>

            {/* Code Body */}
            <div className="mt-3 overflow-x-auto font-mono text-xs text-zinc-200">
              <pre>{code}</pre>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied Snippet" : "Copy Snippet"}</span>
          </button>
          <button
            onClick={() => alert("Snippet Card generated! Right-click or take a screenshot to share.")}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
          >
            <Download className="h-4 w-4" />
            <span>Export Image</span>
          </button>
        </div>
      </div>
    </div>
  );
}
