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
  Zap,
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
          className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          title="Expand Right Dashboard"
        >
          <PanelRightOpen className="h-5 w-5 text-orange-400" />
        </button>
        <div className="mt-6 flex flex-col gap-3">
          {POWER_TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onSelectAction(id)}
              disabled={loading}
              title={label}
              className={`rounded-xl p-2.5 transition ${
                activeAction === id
                  ? "bg-orange-500 text-white"
                  : "text-orange-400 hover:bg-orange-500/20"
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
      {/* Dashboard Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 font-bold">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              AI Tools Dashboard
            </h2>
            <p className="text-[10px] text-[var(--text-muted)]">
              {codeLength > 0 ? `${codeLength} characters loaded` : "Select an action to execute"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          title="Collapse Dashboard"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {/* Section 1: Power Tools */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Power Tools
          </span>
          <span className="text-[10px] font-bold text-orange-400/70 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
            PRO SUITE
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
                      ? "border-orange-500 bg-orange-500/15 shadow-md shadow-orange-500/10"
                      : "border-orange-500/20 bg-orange-500/5 hover:border-orange-500/50 hover:bg-orange-500/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                        isActive ? "bg-orange-500 text-white" : "bg-orange-500/20 text-orange-400 group-hover:scale-105"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-100 group-hover:text-orange-400 transition">
                          {label}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition ${
                      isActive ? "text-orange-400 translate-x-0.5" : "text-zinc-600 group-hover:text-zinc-400"
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
