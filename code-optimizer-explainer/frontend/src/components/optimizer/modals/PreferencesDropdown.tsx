import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Sparkles, Zap, Shield, UserRound, Code, Layers } from "lucide-react";

export type ExplainDepth = "beginner" | "intermediate" | "advanced";
export type HumanizeMode = "de-ai" | "idiomatic" | "simplify";

interface Props {
  explainDepth: ExplainDepth;
  onExplainDepthChange: (depth: ExplainDepth) => void;
  humanizeMode: HumanizeMode;
  onHumanizeModeChange: (mode: HumanizeMode) => void;
}

const EXPLAIN_MODELS: { id: ExplainDepth; name: string; tag: string; desc: string; icon: typeof Sparkles }[] = [
  {
    id: "intermediate",
    name: "OptiCode Standard",
    tag: "Default",
    desc: "Great for everyday logic & Big-O breakdowns",
    icon: Sparkles,
  },
  {
    id: "beginner",
    name: "OptiCode Beginner",
    tag: "Easy",
    desc: "Plain language & step-by-step analogies",
    icon: Zap,
  },
  {
    id: "advanced",
    name: "OptiCode Pro Architect",
    tag: "Deep",
    desc: "Low-level mechanics & architectural bounds",
    icon: Shield,
  },
];

const HUMANIZE_MODES: { id: HumanizeMode; name: string; desc: string; icon: typeof UserRound }[] = [
  {
    id: "de-ai",
    name: "Humanizer De-AI",
    desc: "Rewrites code to feel naturally human-authored",
    icon: UserRound,
  },
  {
    id: "idiomatic",
    name: "Humanizer Idiomatic",
    desc: "Clean modern language features & standard idioms",
    icon: Code,
  },
  {
    id: "simplify",
    name: "Humanizer Simplified",
    desc: "Clear expressions with helpful explanatory comments",
    icon: Layers,
  },
];

export function PreferencesDropdown({
  explainDepth,
  onExplainDepthChange,
  humanizeMode,
  onHumanizeModeChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeModel = EXPLAIN_MODELS.find((m) => m.id === explainDepth) || EXPLAIN_MODELS[0];

  return (
    <div className="flex items-center gap-2">
      {/* OptiCode brand title — stays white, separate from the trigger */}
      <span
        className="font-headings text-xl sm:text-2xl font-black tracking-tight text-white"
        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45), 0 2px 16px rgba(0,0,0,0.25)" }}
      >
        OptiCode
      </span>

      {/* Separate small preferences trigger pill */}
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title="Select AI Model & Preferences"
          className="inline-flex items-center gap-1 rounded-lg bg-white/20 hover:bg-white/35 border border-white/40 hover:border-white/60 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white transition-all duration-200 cursor-pointer active:scale-95"
        >
          <span className="hidden sm:inline opacity-90">{activeModel.name.replace("OptiCode ", "")}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-white/70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* ChatGPT-Style Model Selection Popover */}
        {isOpen && (
        <div className="absolute left-0 mt-2 w-76 sm:w-84 rounded-2xl bg-zinc-950/95 dark:bg-[#18191c]/95 text-white border border-white/20 shadow-2xl backdrop-blur-2xl p-2 z-50 animate-pop-in space-y-3">
          {/* Explainer Models Section */}
          <div className="space-y-1">
            <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Explainer Models</span>
            </div>
            {EXPLAIN_MODELS.map((model) => {
              const Icon = model.icon;
              const isSelected = explainDepth === model.id;

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onExplainDepthChange(model.id);
                  }}
                  className={[
                    "w-full flex items-start justify-between gap-3 p-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer border",
                    isSelected
                      ? "bg-white/12 text-white border-orange-500/50 shadow-warm-sm"
                      : "bg-transparent text-zinc-300 border-transparent hover:bg-white/8 hover:text-white",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={[
                        "p-1.5 rounded-lg shrink-0 mt-0.5",
                        isSelected ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-zinc-400",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{model.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                          {model.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{model.desc}</p>
                    </div>
                  </div>

                  {isSelected && <Check className="h-4 w-4 text-orange-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>

          {/* Humanizer Style Section */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="px-2.5 pt-1 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              <span>Humanizer Modes</span>
            </div>
            {HUMANIZE_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = humanizeMode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    onHumanizeModeChange(mode.id);
                  }}
                  className={[
                    "w-full flex items-start justify-between gap-3 p-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer border",
                    isSelected
                      ? "bg-white/12 text-white border-amber-500/50 shadow-warm-sm"
                      : "bg-transparent text-zinc-300 border-transparent hover:bg-white/8 hover:text-white",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={[
                        "p-1.5 rounded-lg shrink-0 mt-0.5",
                        isSelected ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-zinc-400",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold">{mode.name}</span>
                      <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{mode.desc}</p>
                    </div>
                  </div>

                  {isSelected && <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
