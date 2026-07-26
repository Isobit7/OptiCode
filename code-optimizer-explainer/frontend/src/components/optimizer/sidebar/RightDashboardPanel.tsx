import { useState } from "react";
import type { ActionId } from "@/api/backend";
import {
  ShieldCheck,
  Languages,
  FileText,
  GitBranch,
  GitCompare,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Cpu,
} from "lucide-react";
import { TranslateBarControl } from "../input/TranslateBarControl";

interface RightDashboardPanelProps {
  activeAction: ActionId | null;
  loading: boolean;
  onSelectAction: (actionId: ActionId) => void;
  targetLanguage: string;
  onSelectTargetLanguage: (lang: string) => void;
  codeLength: number;
}

const POWER_TOOLS = [
  {
    id: "security-audit" as ActionId,
    label: "Security Audit",
    icon: ShieldCheck,
    description: "Scan secret leaks & OWASP security risks",
    badge: "OWASP",
  },
  {
    id: "translate" as ActionId,
    label: "Universal Translator",
    icon: Languages,
    description: "Port code to target programming language",
    badge: "Multi-Lang",
  },
  {
    id: "pr-review" as ActionId,
    label: "PR & Code Review",
    icon: FileText,
    description: "Generate PR notes & unit test ideas",
    badge: "GitHub",
  },
  {
    id: "diff-story" as ActionId,
    label: "Diff Storytelling",
    icon: GitCompare,
    description: "Plain-English 'What changed & why' PR summary",
    badge: "Diff",
  },
  {
    id: "flowchart" as ActionId,
    label: "Logic Flowchart",
    icon: GitBranch,
    description: "Render visual decision flowchart diagram",
    badge: "Mermaid",
  },
];

export function RightDashboardPanel({
  activeAction,
  loading,
  onSelectAction,
  targetLanguage,
  onSelectTargetLanguage,
  codeLength,
}: RightDashboardPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center py-4 px-2 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] w-14 shrink-0 transition-all">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] transition cursor-pointer"
          title="Expand Code Intelligence Panel"
        >
          <PanelRightOpen className="h-5 w-5 text-[var(--accent)]" />
        </button>
        <div className="mt-6 flex flex-col gap-3">
          {POWER_TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onSelectAction(id)}
              disabled={loading}
              title={label}
              className={`rounded-xl p-2.5 transition cursor-pointer ${
                activeAction === id
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--accent)] bg-[var(--accent-muted)] hover:bg-[var(--accent)]/20"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col h-full w-80 shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 overflow-y-auto no-scrollbar transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] font-semibold">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Code Intelligence
            </h2>
            <p className="text-[10px] text-[var(--text-muted)]">
              {codeLength > 0 ? `${codeLength} characters loaded` : "Security, Translation & Analysis"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] transition cursor-pointer"
          title="Collapse Panel"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {/* Section 1: Analysis Modules */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Analysis Modules
          </span>
        </div>

        <div className="grid gap-2">
          {POWER_TOOLS.map(({ id, label, icon: Icon, description, badge }) => {
            const isActive = activeAction === id;
            return (
              <div key={id} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => onSelectAction(id)}
                  disabled={loading}
                  className={`group flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent-muted)] shadow-md shadow-[var(--accent)]/10"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-surface)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                        isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-muted)] text-[var(--accent)] group-hover:scale-105"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                          {label}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition ${
                      isActive ? "text-[var(--accent)] translate-x-0.5" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    }`}
                  />
                </button>

                {/* Inline Target Language Control for Universal Translator */}
                {id === "translate" && activeAction === "translate" && (
                  <div className="pl-2 pt-1">
                    <TranslateBarControl
                      targetLanguage={targetLanguage}
                      onSelectTarget={onSelectTargetLanguage}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
