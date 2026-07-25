import type { ActionId } from "@/api/backend";
import { BookOpen, UserRound, Sparkles, Minimize2, Search, Shuffle } from "lucide-react";

export interface ActionItem {
  id: ActionId;
  label: string;
  icon: typeof BookOpen;
}

export const ACTIONS: ActionItem[] = [
  { id: "explain", label: "Explain", icon: BookOpen },
  { id: "humanize", label: "Humanize", icon: UserRound },
  { id: "prettify", label: "Prettify", icon: Sparkles },
  { id: "shorten", label: "Shorten", icon: Minimize2 },
  { id: "seo-optimize", label: "SEO", icon: Search },
  { id: "alternatives", label: "Alternatives", icon: Shuffle },
];

interface Props {
  active: ActionId | null;
  loading: boolean;
  onSelect: (id: ActionId) => void;
}

export function ActionPills({ active, loading, onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 py-1">
      {ACTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              isActive
                ? "bg-orange-500/90 text-white border-orange-400 shadow-md scale-105"
                : "bg-white/50 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 border-black/10 dark:border-white/20 hover:bg-white/70 dark:hover:bg-white/20"
            } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}