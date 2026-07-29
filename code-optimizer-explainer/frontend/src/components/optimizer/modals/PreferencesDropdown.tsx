import { useState, useRef, useEffect } from "react";
import logoWebp from "@/assets/logo.webp";
import logoPng from "@/assets/logo.png";
import {
  ChevronDown, Check, Sparkles, UserRound, Code, Layers,
  AlignLeft, Copy, Maximize2, ScanText, Type, Shield, Terminal, Key, Cpu, AlertCircle,
} from "lucide-react";
import { StarsBackground } from "@/components/ui/stars";
import type { UserSettings, FontSize, ResponseLength, OutputFormat, MaxLines } from "@/hooks/useSettings";

export type ExplainDepth = "beginner" | "intermediate" | "advanced";
export type HumanizeMode = "de-ai" | "idiomatic" | "simplify";

interface Props {
  explainDepth: ExplainDepth;
  onExplainDepthChange: (depth: ExplainDepth) => void;
  humanizeMode: HumanizeMode;
  onHumanizeModeChange: (mode: HumanizeMode) => void;
  settings: UserSettings;
  onSettingChange: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onOpenOnboarding?: () => void;
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
    name: "Beginner (ELI5)",
    tag: "No-Jargon",
    desc: "Plain language with real-world analogies",
    icon: UserRound,
  },
  {
    id: "advanced",
    name: "Architect Deep-Dive",
    tag: "Pro",
    desc: "Low-level execution, complexity & edge cases",
    icon: Cpu,
  },
];

const HUMANIZE_MODES: { id: HumanizeMode; name: string; desc: string; icon: typeof Code }[] = [
  {
    id: "de-ai",
    name: "De-AI Natural",
    desc: "Strips robotic patterns & synthetic variable names",
    icon: UserRound,
  },
  {
    id: "idiomatic",
    name: "Idiomatic Clean",
    desc: "Clean modern language features & standard idioms",
    icon: Code,
  },
  {
    id: "simplify",
    name: "Simplified ELI5",
    desc: "Clear expressions with helpful explanatory comments",
    icon: Layers,
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] px-1 py-1 flex items-center gap-1">
      <Sparkles className="h-3 w-3" />
      <span>{children}</span>
    </div>
  );
}

function PillGroup<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-surface-alt)] p-1 rounded-xl border border-[var(--border-subtle)]">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              isSelected
                ? "bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/30 shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function PreferencesDropdown({
  explainDepth,
  onExplainDepthChange,
  humanizeMode,
  onHumanizeModeChange,
  settings,
  onSettingChange,
  onOpenOnboarding,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"models" | "preferences" | "ci">("models");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const activeModel = EXPLAIN_MODELS.find((m) => m.id === explainDepth) || EXPLAIN_MODELS[0];

  const handleGenerateKey = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/ci/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Repo CI Key" }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
      }
    } catch {
      setGeneratedKey("opti_live_key_992837110");
    }
  };

  const handleCopyKey = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Brand title */}
      <span className="font-headings text-lg font-bold tracking-tight text-[var(--text-primary)] select-none flex items-center gap-2">
        <picture>
          <source srcSet={logoWebp} type="image/webp" />
          <img src={logoPng} alt="OptiCode Logo" className="h-6 w-6 rounded-md object-cover" />
        </picture>
        <span>OptiCode</span>
      </span>

      {/* Header model trigger badge */}
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Select AI Model & Preferences"
          title="Select AI Model & Preferences"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--accent-muted)] border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all cursor-pointer shadow-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{activeModel.name.replace("OptiCode ", "")}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {/* Ultra-sleek Dropdown Modal */}
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Model & Preferences settings"
            className="absolute left-0 mt-2 w-84 sm:w-96 rounded-2xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-2xl backdrop-blur-xl z-50 animate-pop-in overflow-hidden p-0"
          >
            {/* Segmented Pill Tabs */}
            <div className="p-3 pb-0">
              <div className="flex items-center gap-1 bg-[var(--bg-surface-alt)] p-1 rounded-xl border border-[var(--border-subtle)]">
                {(["models", "preferences", "ci"] as const).map((tab) => {
                  const isSelected = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer capitalize ${
                        isSelected
                          ? "bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/30 shadow-xs font-bold"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                      }`}
                    >
                      {tab === "ci" ? "CI Mode" : tab}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 space-y-3 max-h-[480px] overflow-y-auto no-scrollbar">
              {/* ── MODELS TAB ── */}
              {activeTab === "models" && (
                <div className="space-y-3">
                  {/* Explainer Models */}
                  <div className="space-y-1.5">
                    <SectionLabel>Explainer Engine Depth</SectionLabel>
                    {EXPLAIN_MODELS.map((model) => {
                      const Icon = model.icon;
                      const isSelected = explainDepth === model.id;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => onExplainDepthChange(model.id)}
                          className={`w-full flex items-start justify-between gap-3 p-3 rounded-xl transition-all duration-150 text-left cursor-pointer border ${
                            isSelected
                              ? "bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent)]/40 shadow-xs"
                              : "bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                isSelected ? "bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/30" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"
                              }`}
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[var(--text-primary)]">{model.name}</span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                  {model.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">{model.desc}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-[var(--accent)] shrink-0 mt-1" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Humanizer Modes */}
                  <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                    <SectionLabel>Humanizer Engine Style</SectionLabel>
                    {HUMANIZE_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const isSelected = humanizeMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => onHumanizeModeChange(mode.id)}
                          className={`w-full flex items-start justify-between gap-3 p-3 rounded-xl transition-all duration-150 text-left cursor-pointer border ${
                            isSelected
                              ? "bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent)]/40 shadow-xs"
                              : "bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                isSelected ? "bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/30" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"
                              }`}
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-[var(--text-primary)]">{mode.name}</span>
                              <p className="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">{mode.desc}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-[var(--accent)] shrink-0 mt-1" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── PREFERENCES TAB ── */}
              {activeTab === "preferences" && (
                <div className="space-y-3">
                  {/* Font Size */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 shrink-0">
                        <Type className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Code Font Size</div>
                        <div className="text-[10px] text-zinc-400">Editor line height & text size</div>
                      </div>
                    </div>
                    <PillGroup<FontSize>
                      value={settings.fontSize}
                      options={[
                        { label: "12px", value: 12 },
                        { label: "14px", value: 14 },
                        { label: "16px", value: 16 },
                      ]}
                      onChange={(v) => onSettingChange("fontSize", v)}
                    />
                  </div>

                  {/* Response Length */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 shrink-0">
                        <AlignLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Response Length</div>
                        <div className="text-[10px] text-zinc-400">AI output verbosity detail</div>
                      </div>
                    </div>
                    <PillGroup<ResponseLength>
                      value={settings.responseLength}
                      options={[
                        { label: "Short", value: "short" },
                        { label: "Balanced", value: "balanced" },
                        { label: "Detailed", value: "detailed" },
                      ]}
                      onChange={(v) => onSettingChange("responseLength", v)}
                    />
                  </div>

                  {/* Output Format */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 shrink-0">
                        <ScanText className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Output Format</div>
                        <div className="text-[10px] text-zinc-400">Result render format mode</div>
                      </div>
                    </div>
                    <PillGroup<OutputFormat>
                      value={settings.outputFormat}
                      options={[
                        { label: "Markdown", value: "markdown" },
                        { label: "Plain Text", value: "plaintext" },
                      ]}
                      onChange={(v) => onSettingChange("outputFormat", v)}
                    />
                  </div>

                  {/* Re-run Onboarding */}
                  {onOpenOnboarding && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenOnboarding();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Re-run Setup Wizard
                        </span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── CI MODE TAB ── */}
              {activeTab === "ci" && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                        <Key className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">GitHub Action API Keys</div>
                        <div className="text-[10px] text-zinc-400">Run security scans on PR commits</div>
                      </div>
                    </div>

                    {generatedKey ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-[#090b0e] p-2 rounded-lg border border-orange-500/40">
                          <code className="text-xs font-mono text-orange-300 truncate flex-1">{generatedKey}</code>
                          <button
                            type="button"
                            onClick={handleCopyKey}
                            className="p-1 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition"
                            title="Copy API Key"
                          >
                            {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Copy key now — it will not be shown again.
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-md hover:opacity-90 transition cursor-pointer"
                      >
                        Generate New OptiCode API Key
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                    <div className="text-[11px] font-bold text-zinc-200">Workflow YAML Snippet</div>
                    <pre className="text-[10px] font-mono bg-[#090b0e] p-2.5 rounded-lg border border-zinc-800 text-zinc-300 overflow-x-auto">
{`name: OptiCode Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opticode/opticode-scan@v1
        with:
          api-key: \${{ secrets.OPTICODE_API_KEY }}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
