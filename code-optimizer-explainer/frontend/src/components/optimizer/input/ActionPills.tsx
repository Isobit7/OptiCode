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
    <div className="flex items-center gap-0.5">
      {ACTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onSelect(id)}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.5 : 1.5} />
          </button>
        );
      })}
    </div>
  );
}