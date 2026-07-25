import { useState, useRef, useEffect } from "react";
import {
  ChevronDown, Check, Sparkles, Zap, Shield, UserRound, Code, Layers,
  Languages, AlignLeft, Copy, Maximize2, ScanText, Type,
} from "lucide-react";
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

// ── Small toggle switch ──────────────────────────────────────
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        checked ? "bg-[var(--accent)] border-[var(--accent)]" : "bg-[var(--bg-surface-alt)] border-[var(--border-default)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-px ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ── Pill group (segmented control) ──────────────────────────
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
    <div className="flex rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-default)] p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 ${
            value === opt.value
              ? "bg-[var(--accent)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Section label ────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
      {children}
    </div>
  );
}

// ── Setting row ──────────────────────────────────────────────
function SettingRow({ icon: Icon, label, desc, children }: {
  icon: typeof Languages;
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)] shrink-0">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--text-primary)]">{label}</div>
          <div className="text-[10px] text-[var(--text-muted)] leading-snug">{desc}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
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
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"models" | "preferences">("models");
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

  return (
    <div className="flex items-center gap-3">
      {/* OptiCode brand title */}
      <span className="font-headings text-lg font-bold tracking-tight text-[var(--text-primary)] select-none">
        OptiCode
      </span>

      {/* Header model selector */}
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

        {/* Dropdown panel */}
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Model & Preferences settings"
            className="absolute left-0 mt-2 w-80 sm:w-88 rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xl z-50 animate-pop-in overflow-hidden"
          >
            {/* Tab bar */}
            <div className="flex border-b border-[var(--border-subtle)] px-2 pt-2 gap-1">
              {(["models", "preferences"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-t-md transition-colors cursor-pointer capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 ${
                    activeTab === tab
                      ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-2 space-y-1 max-h-[480px] overflow-y-auto">
              {/* ── MODELS TAB ── */}
              {activeTab === "models" && (
                <>
                  {/* Explainer Models Section */}
                  <div className="space-y-1">
                    <SectionLabel>Explainer Models</SectionLabel>
                    {EXPLAIN_MODELS.map((model) => {
                      const Icon = model.icon;
                      const isSelected = explainDepth === model.id;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => onExplainDepthChange(model.id)}
                          className={[
                            "w-full flex items-start justify-between gap-3 p-2.5 rounded-lg transition-colors duration-150 text-left cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
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
                    <SectionLabel>Humanizer Modes</SectionLabel>
                    {HUMANIZE_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const isSelected = humanizeMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => onHumanizeModeChange(mode.id)}
                          className={[
                            "w-full flex items-start justify-between gap-3 p-2.5 rounded-lg transition-colors duration-150 text-left cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
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
                </>
              )}

              {/* ── PREFERENCES TAB ── */}
              {activeTab === "preferences" && (
                <div className="space-y-0.5">
                  {/* Auto-detect Language */}
                  <SettingRow icon={Languages} label="Auto-detect Language" desc="Automatically identify the code language">
                    <Toggle
                      id="setting-auto-detect"
                      checked={settings.autoDetectLanguage}
                      onChange={(v) => onSettingChange("autoDetectLanguage", v)}
                    />
                  </SettingRow>

                  {/* Copy on Submit */}
                  <SettingRow icon={Copy} label="Copy on Submit" desc="Auto-copy result to clipboard after each run">
                    <Toggle
                      id="setting-copy-on-submit"
                      checked={settings.copyOnSubmit}
                      onChange={(v) => onSettingChange("copyOnSubmit", v)}
                    />
                  </SettingRow>

                  {/* Font Size */}
                  <div className="px-2.5 py-2">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)] shrink-0">
                        <Type className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Editor Font Size</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Code textarea font size</div>
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
                  <div className="px-2.5 py-2">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)] shrink-0">
                        <AlignLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Response Length</div>
                        <div className="text-[10px] text-[var(--text-muted)]">AI output verbosity</div>
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
                  <div className="px-2.5 py-2">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)] shrink-0">
                        <ScanText className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Output Format</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Result render format</div>
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

                  {/* Max Lines */}
                  <div className="px-2.5 py-2">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)] shrink-0">
                        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Max Line Limit</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Max lines to process per request</div>
                      </div>
                    </div>
                    <PillGroup<MaxLines>
                      value={settings.maxLines}
                      options={[
                        { label: "500", value: 500 },
                        { label: "1k", value: 1000 },
                        { label: "2k", value: 2000 },
                        { label: "5k", value: 5000 },
                      ]}
                      onChange={(v) => onSettingChange("maxLines", v)}
                    />
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

