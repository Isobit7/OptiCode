import type { ActionId } from "@/api/backend";
import { BookOpen, UserRound, Sparkles, Minimize2, Search, Shuffle } from "lucide-react";

export interface ActionItem {
  id: ActionId;
  label: string;
  icon: typeof BookOpen;
  description: string;
}

export const ACTIONS: ActionItem[] = [
  { id: "explain", label: "Explain", icon: BookOpen, description: "Plain-language walkthrough" },
  { id: "humanize", label: "Humanize", icon: UserRound, description: "Rewrite to feel human-authored" },
  { id: "prettify", label: "Prettify", icon: Sparkles, description: "Auto-format to standard style" },
  { id: "shorten", label: "Shorten", icon: Minimize2, description: "Condense / minify" },
  { id: "seo-optimize", label: "SEO Optimize", icon: Search, description: "Improve HTML for SEO" },
  { id: "alternatives", label: "Alternatives", icon: Shuffle, description: "Different implementations" },
];

interface Props {
  active: ActionId | null;
  loading: boolean;
  onSelect: (id: ActionId) => void;
  compact?: boolean;
}

export function ActionPills({ active, loading, onSelect, compact = true }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Code action selector"
      className="flex flex-wrap items-center gap-1 rounded-lg bg-[var(--bg-surface-alt)] p-1 border border-[var(--border-subtle)] max-w-full overflow-x-auto no-scrollbar"
    >
      {ACTIONS.map(({ id, label, icon: Icon, description }) => {
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
              "group inline-flex items-center gap-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              compact ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-xs",
              "disabled:cursor-not-allowed disabled:opacity-40",
              isActive
                ? "bg-[var(--accent-muted)] text-[var(--accent)] font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]",
            ].join(" ")}
          >
            <Icon
              className={`h-4 w-4 ${
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
  );
}
