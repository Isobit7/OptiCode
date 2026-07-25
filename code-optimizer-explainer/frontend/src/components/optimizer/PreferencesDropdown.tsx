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
    <div className="flex items-center gap-3">
      {/* OptiCode brand title — plain text per DESIGN.md */}
      <span className="font-headings text-lg font-bold tracking-tight text-[var(--text-primary)] select-none">
        OptiCode
      </span>

      {/* Header model selector — Plain text + chevron per DESIGN.md */}
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Select AI Model & Preferences"
          title="Select AI Model & Preferences"
          className="inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span>{activeModel.name.replace("OptiCode ", "")}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {/* Model Selection Popover */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-76 sm:w-84 rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xl p-2 z-50 animate-pop-in space-y-3">
            {/* Explainer Models Section */}
            <div className="space-y-1">
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
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
                      "w-full flex items-start justify-between gap-3 p-2.5 rounded-lg transition-colors duration-150 text-left cursor-pointer border",
                      isSelected
                        ? "bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)] font-semibold"
                        : "bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-surface-alt)] hover:text-[var(--text-primary)]",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={[
                          "p-1.5 rounded-md shrink-0 mt-0.5",
                          isSelected ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-surface-alt)] text-[var(--text-muted)]",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">{model.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-surface-alt)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            {model.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-snug mt-0.5">{model.desc}</p>
                      </div>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-[var(--accent)] shrink-0 mt-1" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            {/* Humanizer Style Section */}
            <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
              <div className="px-2.5 pt-1 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
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
                      "w-full flex items-start justify-between gap-3 p-2.5 rounded-lg transition-colors duration-150 text-left cursor-pointer border",
                      isSelected
                        ? "bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)] font-semibold"
                        : "bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-surface-alt)] hover:text-[var(--text-primary)]",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={[
                          "p-1.5 rounded-md shrink-0 mt-0.5",
                          isSelected ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-surface-alt)] text-[var(--text-muted)]",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold">{mode.name}</span>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-snug mt-0.5">{mode.desc}</p>
                      </div>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-[var(--accent)] shrink-0 mt-1" aria-hidden="true" />}
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
