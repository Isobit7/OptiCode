import type { ActionId } from "@/api/backend";
import { BookOpen, UserRound, Sparkles, Minimize2, Search, Shuffle } from "lucide-react";

interface Action {
  id: ActionId;
  label: string;
  icon: typeof BookOpen;
  description: string;
}

const ACTIONS_ROW_1: Action[] = [
  { id: "explain", label: "Explain", icon: BookOpen, description: "Plain-language walkthrough" },
  { id: "humanize", label: "Humanize", icon: UserRound, description: "Rewrite to feel human-authored" },
  { id: "prettify", label: "Prettify", icon: Sparkles, description: "Auto-format to standard style" },
  { id: "shorten", label: "Shorten", icon: Minimize2, description: "Condense / minify" },
  { id: "seo-optimize", label: "SEO Optimize", icon: Search, description: "Improve HTML for SEO" },
];

const ACTIONS_ROW_2: Action[] = [
  { id: "alternatives", label: "Alternatives", icon: Shuffle, description: "Different implementations" },
];

interface Props {
  active: ActionId | null;
  loading: boolean;
  onSelect: (id: ActionId) => void;
}

export function ActionPills({ active, loading, onSelect }: Props) {
  const renderPill = ({ id, label, icon: Icon, description }: Action) => {
    const isActive = active === id;
    return (
      <button
        key={id}
        type="button"
        title={description}
        onClick={() => onSelect(id)}
        disabled={loading}
        className={[
          "group inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out",
          "shadow-md backdrop-blur-md cursor-pointer border",
          "disabled:cursor-not-allowed disabled:opacity-60",
          isActive
            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-105"
            : "bg-white text-zinc-900 border-zinc-200/80 hover:bg-zinc-50 hover:text-orange-600 hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg dark:bg-white dark:text-zinc-900",
        ].join(" ")}
      >
        <Icon
          className={`h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 ${
            isActive ? "text-white" : "text-orange-500"
          }`}
          strokeWidth={2}
        />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-2.5 w-full max-w-3xl mx-auto my-2 animate-fade-in-up">
      {/* Row 1: Main 5 Actions */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {ACTIONS_ROW_1.map(renderPill)}
      </div>

      {/* Row 2: Centered Alternatives Action */}
      <div className="flex justify-center">
        {ACTIONS_ROW_2.map(renderPill)}
      </div>
    </div>
  );
}
