import { useState, type ReactNode } from "react";
import type { ActionId, ActionResult } from "@/api/backend";
import { Copy, Check, Sparkles, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { SimpleDiffView } from "./DiffLine";

export interface TurnMessage {
  id: string;
  original: string;
  action: ActionId;
  language: string;
  result: ActionResult | null;
  loading?: boolean;
  error?: string | null;
}

interface Props {
  message: TurnMessage;
  onRetry?: (message: TurnMessage) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Ignore
        }
      }}
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] transition-colors cursor-pointer border border-[var(--border-subtle)]"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function parseInline(text: string) {
  const parts: (string | ReactNode)[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-[var(--accent)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="font-mono text-xs bg-[var(--bg-surface-alt)] px-1.5 py-0.5 rounded text-[var(--text-primary)] border border-[var(--border-subtle)]">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts;
}

function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let currentList: { type: "bullet" | "number"; items: ReactNode[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = () => {
    if (currentList) {
      if (currentList.type === "bullet") {
        blocks.push(
          <ul key={`list_${blocks.length}`} className="space-y-1.5 my-2 pl-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] mt-2 shrink-0" />
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`list_${blocks.length}`} className="space-y-1.5 my-2 pl-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                <span className="shrink-0 font-mono text-[10px] bg-[var(--bg-surface-alt)] text-[var(--accent)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] font-bold">
                  {idx + 1}
                </span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        const codeText = codeBlockLines.join("\n");
        blocks.push(
          <div key={`code_${lineIdx}`} className="my-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-alt)] p-3 text-[var(--text-primary)]">
            <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-[var(--border-subtle)] text-xs">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Code Block</span>
              <CopyButton text={codeText} />
            </div>
            <pre className="font-mono text-xs overflow-x-auto leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    if (trimmed.startsWith("#")) {
      flushList();
      const headerText = trimmed.replace(/^#+\s*/, "");
      blocks.push(
        <h4 key={`head_${lineIdx}`} className="font-headings text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 pt-3 pb-1 border-b border-[var(--border-subtle)] uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>{headerText}</span>
        </h4>
      );
      return;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const itemContent = parseInline(trimmed.replace(/^[-*•]\s+/, ""));
      if (!currentList || currentList.type !== "bullet") {
        flushList();
        currentList = { type: "bullet", items: [] };
      }
      currentList.items.push(itemContent);
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const itemContent = parseInline(trimmed.replace(/^\d+\.\s+/, ""));
      if (!currentList || currentList.type !== "number") {
        flushList();
        currentList = { type: "number", items: [] };
      }
      currentList.items.push(itemContent);
      return;
    }

    if (!trimmed) {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p_${lineIdx}`} className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed my-1.5">
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList();

  return <div className="space-y-1">{blocks}</div>;
}

const ACTION_LABELS: Record<ActionId, string> = {
  explain: "Explain",
  humanize: "Humanize",
  prettify: "Prettify",
  shorten: "Shorten",
  "seo-optimize": "SEO Optimize",
  alternatives: "Alternatives",
};

export function TurnCard({ message, onRetry }: Props) {
  const [codeExpanded, setCodeExpanded] = useState(false);
  const codeLines = message.original ? message.original.split("\n") : [];
  const lineCount = codeLines.length;

  return (
    <div className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden shadow-xs space-y-0 transition-all duration-150">
      {/* 1. Compact Pasted Code Preview Bar (Top Zone) */}
      <div className="px-4 py-2.5 bg-[var(--bg-surface-alt)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded">
            {ACTION_LABELS[message.action] ?? message.action}
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-mono truncate">
            {lineCount} line{lineCount === 1 ? "" : "s"} · {message.language || "auto"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text={message.original} />
          <button
            type="button"
            onClick={() => setCodeExpanded(!codeExpanded)}
            className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span>{codeExpanded ? "Collapse code" : "View code"}</span>
            {codeExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Pasted Code Box */}
      {codeExpanded && (
        <div className="p-4 bg-[var(--bg-base)] border-b border-[var(--border-subtle)] font-mono text-xs overflow-x-auto text-[var(--text-primary)] leading-relaxed">
          <pre>{message.original}</pre>
        </div>
      )}

      {/* 2. Result Body Zone */}
      <div className="p-4 sm:p-5">
        {/* Loading Skeleton State */}
        {message.loading && (
          <div className="space-y-3 animate-pulse">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
              <Sparkles className="h-4 w-4 text-[var(--accent)] animate-spin" />
              <span>Analyzing code snippet...</span>
            </div>
            {message.action === "explain" ? (
              <div className="space-y-2 pt-2">
                <div className="h-4 bg-[var(--bg-surface-alt)] rounded w-3/4" />
                <div className="h-3 bg-[var(--bg-surface-alt)] rounded w-full" />
                <div className="h-3 bg-[var(--bg-surface-alt)] rounded w-5/6" />
                <div className="h-3 bg-[var(--bg-surface-alt)] rounded w-2/3" />
              </div>
            ) : (
              <div className="h-24 bg-[var(--bg-surface-alt)] rounded-lg w-full border border-[var(--border-subtle)]" />
            )}
          </div>
        )}

        {/* Error State */}
        {!message.loading && message.error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-medium">Couldn't reach the model — try again</p>
              <p className="text-[11px] opacity-80">{message.error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2.5 py-1 rounded transition cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Output Result Body */}
        {!message.loading && !message.error && message.result && (
          <div className="space-y-4">
            {/* Header Result Bar */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{ACTION_LABELS[message.action]} Result</span>
              </span>
              {message.result.output && <CopyButton text={message.result.output} />}
            </div>

            {/* Action Specific Output Renderer */}
            {message.action === "shorten" || message.action === "seo-optimize" ? (
              <SimpleDiffView
                original={message.original}
                modified={message.result.output || ""}
                isSEO={message.action === "seo-optimize"}
              />
            ) : message.action === "explain" ? (
              <MarkdownRenderer content={message.result.output || ""} />
            ) : message.action === "alternatives" && message.result.alternatives && message.result.alternatives.length > 0 ? (
              <div className="space-y-3">
                {message.result.alternatives.map((alt, idx) => (
                  <div key={idx} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-alt)] p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--accent)] text-xs">
                        Alternative {idx + 1} — {alt.tradeoff}
                      </span>
                      <CopyButton text={alt.code} />
                    </div>
                    <pre className="font-mono text-xs text-[var(--text-primary)] overflow-x-auto leading-relaxed">
                      <code>{alt.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="font-mono text-xs leading-relaxed bg-[var(--bg-surface-alt)] p-3.5 rounded-lg border border-[var(--border-default)] overflow-x-auto text-[var(--text-primary)]">
                <code>{message.result.output}</code>
              </pre>
            )}

            {/* Suggestions & Insights */}
            {message.result.suggestions && message.result.suggestions.length > 0 && (
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Key Insights & Recommendations
                </div>
                <ul className="space-y-1.5 pl-1">
                  {message.result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                      <span className="flex-1">{parseInline(s)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
