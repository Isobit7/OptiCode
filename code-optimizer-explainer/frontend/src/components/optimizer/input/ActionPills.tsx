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
  { id: "explain", label: "Explain", icon: BookOpen, description: "Plain-language walkthrough" },
  { id: "humanize", label: "Humanize", icon: UserRound, description: "Rewrite to feel human-authored" },
  { id: "prettify", label: "Prettify", icon: Sparkles, description: "Auto-format to standard style" },
  { id: "shorten", label: "Shorten", icon: Minimize2, description: "Condense / minify" },
  { id: "seo-optimize", label: "SEO", icon: Search, description: "Improve HTML for SEO" },
  { id: "alternatives", label: "Alternatives", icon: Shuffle, description: "Different implementations" },
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
                  ? "bg-[var(--accent-muted)] text-[var(--accent)] font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]",
              ].join(" ")}
            >
              <Icon
                className={`h-3.5 w-3.5 ${
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
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
