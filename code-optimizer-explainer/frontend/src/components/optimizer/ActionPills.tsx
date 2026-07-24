import type { ActionId } from "@/api/backend";
import { BookOpen, UserRound, Sparkles, Minimize2, Search, Shuffle } from "lucide-react";

interface Action {
  id: ActionId;
  label: string;
  icon: typeof BookOpen;
  description: string;
}

const ACTIONS: Action[] = [
  { id: "explain", label: "Explain", icon: BookOpen, description: "Plain-language walkthrough" },
  {
    id: "humanize",
    label: "Humanize",
    icon: UserRound,
    description: "Rewrite to feel human-authored",
  },
  {
    id: "prettify",
    label: "Prettify",
    icon: Sparkles,
    description: "Auto-format to standard style",
  },
  { id: "shorten", label: "Shorten", icon: Minimize2, description: "Condense / minify" },
  { id: "seo-optimize", label: "SEO Optimize", icon: Search, description: "Improve HTML for SEO" },
  {
    id: "alternatives",
    label: "Alternatives",
    icon: Shuffle,
    description: "Different implementations",
  },
];

interface Props {
  active: ActionId | null;
  loading: boolean;
  onSelect: (id: ActionId) => void;
}

export function ActionPills({ active, loading, onSelect }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 animate-slide-down">
      {ACTIONS.map(({ id, label, icon: Icon, description }, index) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            title={description}
            onClick={() => onSelect(id)}
            disabled={loading}
            style={{ animationDelay: `${index * 40}ms` }}
            className={[
              "group inline-flex items-center gap-2 rounded-full px-4.5 py-2 text-sm font-medium transition-all duration-300 ease-out",
              "border shadow-sm backdrop-blur-md cursor-pointer",
              "disabled:cursor-not-allowed disabled:opacity-60",
              isActive
                ? "bg-white dark:bg-gradient-to-r dark:from-orange-500 dark:to-amber-500 text-zinc-950 dark:text-white border-white dark:border-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.5)] ring-2 ring-orange-500 font-semibold scale-105"
                : "bg-white/90 dark:bg-[#18181C]/90 text-zinc-900 dark:text-zinc-200 border-white/80 dark:border-zinc-800 hover:bg-white dark:hover:bg-[#27272A] hover:text-black dark:hover:text-white hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg",
            ].join(" ")}
          >
            <Icon
              className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 text-orange-600 dark:text-orange-400"
              strokeWidth={1.8}
            />
            <span>{label}</span>
          </button>


        );
      })}
    </div>
  );
}
