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
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {ACTIONS.map(({ id, label, icon: Icon, description }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            title={description}
            onClick={() => onSelect(id)}
            disabled={loading}
            className={[
              "group inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ease-out cursor-pointer",
              compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isActive
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border border-orange-400/80 shadow-[0_4px_14px_rgba(249,115,22,0.35)] scale-[1.02]"
                : "border border-orange-500/25 bg-orange-500/5 hover:bg-orange-500/12 hover:border-orange-500/40 text-zinc-800 dark:text-zinc-200 hover:-translate-y-0.5 active:scale-95",
            ].join(" ")}
          >
            <Icon
              className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? "text-white" : "text-orange-500 group-hover:text-white dark:text-orange-400"
              }`}
              strokeWidth={2}
            />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
