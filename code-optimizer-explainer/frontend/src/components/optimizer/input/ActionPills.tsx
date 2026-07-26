import type { ActionId } from "@/api/backend";
import { BookOpen, UserRound, Sparkles, Minimize2, Search, Shuffle } from "lucide-react";
import { TranslateBarControl } from "./TranslateBarControl";

export interface ActionItem {
  id: ActionId;
  label: string;
  icon: typeof BookOpen;
  description: string;
  isPowerTool?: boolean;
}

export const CORE_ACTIONS: ActionItem[] = [
  { id: "explain", label: "Explain", icon: BookOpen, description: "Line-by-line code explanation with complexity analysis" },
  { id: "humanize", label: "Humanize", icon: UserRound, description: "Remove AI patterns and convert to idiomatic human code" },
  { id: "prettify", label: "Prettify", icon: Sparkles, description: "Format and align code to standard style guidelines" },
  { id: "shorten", label: "Shorten", icon: Minimize2, description: "Condense and minify code without altering logic" },
  { id: "seo-optimize", label: "SEO", icon: Search, description: "Optimize HTML metadata and structure for search engines" },
  { id: "alternatives", label: "Alternatives", icon: Shuffle, description: "Generate 2-3 alternate implementations with trade-offs" },
];

export const ACTIONS: ActionItem[] = [...CORE_ACTIONS];

interface Props {
  active: ActionId | null;
  loading: boolean;
  onSelect: (id: ActionId) => void;
  compact?: boolean;
  targetLanguage?: string;
  onSelectTargetLanguage?: (lang: string) => void;
}

export function ActionPills({
  active,
  loading,
  onSelect,
  compact = true,
  targetLanguage = "TypeScript",
  onSelectTargetLanguage,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 max-w-full">
      <div
        role="tablist"
        aria-label="Core code actions"
        className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--bg-surface-alt)] p-1 border border-[var(--border-subtle)]"
      >
        {CORE_ACTIONS.map(({ id, label, icon: Icon, description }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              title={description}
              onClick={() => onSelect(id)}
              disabled={loading}
              className={[
                "group inline-flex items-center gap-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
                "disabled:cursor-not-allowed disabled:opacity-40",
                isActive
                  ? "bg-[var(--accent)] text-white font-bold shadow-sm shadow-[var(--accent)]/20 scale-[1.02]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:-translate-y-0.5",
              ].join(" ")}
            >
              <Icon
                className={`h-3.5 w-3.5 ${
                  isActive ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--accent)]"
                }`}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Inline Target Language Selector when Translate is active */}
      {active === "translate" && onSelectTargetLanguage && (
        <TranslateBarControl
          targetLanguage={targetLanguage}
          onSelectTarget={onSelectTargetLanguage}
        />
      )}
    </div>
  );
}
