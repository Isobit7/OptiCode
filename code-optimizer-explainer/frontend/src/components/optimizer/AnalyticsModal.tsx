import { useState, useEffect } from "react";
import { X, BarChart3, Code2, Zap, Download, Sparkles, Check } from "lucide-react";
import type { HistoryItem } from "./SidebarHistory";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
}

export function AnalyticsModal({ isOpen, onClose, history }: Props) {
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalRuns = history.length;
  const explainCount = history.filter((h) => h.action === "explain").length;
  const prettifyCount = history.filter((h) => h.action === "prettify").length;
  const optimizeCount = totalRuns - (explainCount + prettifyCount);

  // Compute language distribution
  const langCounts: Record<string, number> = {};
  history.forEach((h) => {
    const lang = h.language || "TypeScript";
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  });

  const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `opticode_analytics_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-modal-title"
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-6 text-[var(--text-primary)] animate-pop-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="analytics-modal-title" className="text-base font-bold font-headings">
                Usage & Efficiency Insights
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">Overview of your code transformations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close analytics modal"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Top 3 KPI Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Transformations</span>
            <div className="text-xl font-extrabold font-headings text-[var(--accent)]">{totalRuns}</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Avg Speedup</span>
            <div className="text-xl font-extrabold font-headings text-emerald-500">2.4x</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Big-O Saved</span>
            <div className="text-xl font-extrabold font-headings text-indigo-400">O(N)</div>
          </div>
        </div>

        {/* Action Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Action Distribution</span>
          </h3>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-surface-alt)]">
              <span className="text-[var(--text-secondary)]">Explanations</span>
              <span className="font-bold text-indigo-400">{explainCount} runs</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-surface-alt)]">
              <span className="text-[var(--text-secondary)]">Prettify & Format</span>
              <span className="font-bold text-emerald-400">{prettifyCount} runs</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-surface-alt)]">
              <span className="text-[var(--text-secondary)]">Optimizations</span>
              <span className="font-bold text-[var(--accent)]">{optimizeCount} runs</span>
            </div>
          </div>
        </div>

        {/* Language Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Top Languages Processed</span>
          </h3>
          <div className="space-y-2 text-xs">
            {sortedLangs.length > 0 ? (
              sortedLangs.slice(0, 3).map(([lang, count]) => {
                const percent = Math.round((count / totalRuns) * 100);
                return (
                  <div key={lang} className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[var(--text-primary)] font-semibold">{lang}</span>
                      <span className="text-[var(--text-muted)]">{percent}% ({count})</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--bg-surface-alt)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">No transformation history yet.</p>
            )}
          </div>
        </div>

        {/* Footer Export Button */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>OptiCode v2.4 Engine</span>
          </div>
          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
          >
            {downloaded ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            <span>{downloaded ? "Exported!" : "Export Analytics (JSON)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
