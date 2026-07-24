import { useState, type ReactNode } from "react";
import type { ActionResult } from "@/api/backend";
import { Copy, Check, Sparkles, AlertCircle } from "lucide-react";
import { GeneratingLoader } from "@/components/custom/GeneratingLoader";

export interface ChatMessage {
  id: string;
  original: string;
  result: ActionResult | null;
  loading?: boolean;
  error?: string | null;
}

interface Props {
  messages?: ChatMessage[];
  original?: string;
  result?: ActionResult | null;
  loading?: boolean;
  error?: string | null;
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition hover:bg-black/10 dark:hover:bg-white/20 hover:text-zinc-950 dark:hover:text-white cursor-pointer active:scale-95 shadow-2xs"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />}
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
        <strong key={match.index} className="font-bold text-orange-600 dark:text-orange-400">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="font-mono text-xs bg-black/10 dark:bg-white/15 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-300 font-semibold border border-black/5 dark:border-white/10">
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
          <ul key={`list_${blocks.length}`} className="space-y-1.5 my-2.5 pl-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 dark:bg-orange-400 mt-2 shrink-0 shadow-xs" />
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`list_${blocks.length}`} className="space-y-2 my-3 pl-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                <span className="shrink-0 font-bold text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-300 px-2 py-0.5 rounded-md border border-orange-500/30 shadow-xs">
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
          <div key={`code_${lineIdx}`} className="my-3 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-950 dark:bg-[#0a0c12] p-4 text-zinc-100 shadow-inner">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10 text-xs">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Code Output</span>
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
        <h4 key={`head_${lineIdx}`} className="font-headings text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2 pt-3 pb-1 border-b border-black/10 dark:border-white/10 uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
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
        <p key={`p_${lineIdx}`} className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed my-1.5">
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList();

  return <div className="space-y-1">{blocks}</div>;
}

const ACTION_TITLES: Record<string, string> = {
  explain: "Code Explanation",
  humanize: "Humanized Implementation",
  prettify: "Prettified Code",
  shorten: "Shortened Code",
  "seo-optimize": "SEO Optimized Markup",
  alternatives: "Alternative Implementations",
};

export function ResultsPanel({ messages, original, result, loading, error }: Props) {
  const messageList: ChatMessage[] = messages && messages.length > 0
    ? messages
    : (original || result || loading || error)
      ? [{ id: "single_msg", original: original || "", result: result || null, loading, error }]
      : [];

  if (messageList.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up py-4">
      {messageList.map((msg) => (
        <div key={msg.id} className="space-y-6">
          {/* 1. User Submitted Code Bubble */}
          {msg.original && (
            <div className="flex justify-end w-full">
              <div className="w-full bg-white/80 dark:bg-[#181b26]/90 text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-2xl shadow-warm-md border border-white/80 dark:border-white/15 backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-black/10 dark:border-white/10">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    👤 Your Input Snippet
                  </span>
                  <CopyButton text={msg.original} />
                </div>
                <pre className="font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {msg.original}
                </pre>
              </div>
            </div>
          )}

          {/* 2. AI Response Block with Rich Professional Markdown Parsing */}
          <div className="w-full space-y-4">
            {msg.loading && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-[#121620]/90 border border-white/80 dark:border-white/15 text-sm text-zinc-800 dark:text-zinc-300 shadow-warm-md backdrop-blur-2xl">
                <GeneratingLoader />
              </div>
            )}

            {!msg.loading && msg.error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 text-sm shadow-warm-sm backdrop-blur-xl">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-bold">Error generating response</p>
                  <p className="text-xs text-red-700 dark:text-red-300/90 mt-0.5">{msg.error}</p>
                </div>
              </div>
            )}

            {!msg.loading && !msg.error && msg.result && (
              <div className="space-y-4">
                <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-2 px-1">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
                  <span>
                    {ACTION_TITLES[msg.result.action] ?? "AI Output"}{" "}
                    {msg.result.detectedLanguage ? `· Language: ${msg.result.detectedLanguage}` : ""}
                  </span>
                </div>

                <div className="bg-white/85 dark:bg-[#121620]/95 text-zinc-900 dark:text-zinc-100 p-5 sm:p-6 rounded-2xl border border-white/80 dark:border-white/15 shadow-warm-lg backdrop-blur-2xl space-y-5">
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
                    <span className="font-headings text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                      {ACTION_TITLES[msg.result.action] ?? "Output"}
                    </span>
                    {msg.result.output && <CopyButton text={msg.result.output} />}
                  </div>

                  {/* Rich Formatted Output (Markdown, Bullet Points, Code Blocks) */}
                  {msg.result.output != null && (
                    <div className="leading-relaxed">
                      {msg.result.isProse ? (
                        <MarkdownRenderer content={msg.result.output} />
                      ) : (
                        <pre className="font-mono text-xs leading-relaxed bg-zinc-950 dark:bg-[#0a0c12] p-4 rounded-xl border border-black/10 dark:border-white/10 overflow-x-auto text-zinc-100 shadow-inner">
                          <code>{msg.result.output}</code>
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Suggestions Cards */}
                  {msg.result.suggestions && msg.result.suggestions.length > 0 && (
                    <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-2.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                        💡 Key Insights & Best Practices
                      </div>
                      <ul className="space-y-2 pl-1">
                        {msg.result.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 dark:bg-orange-400 mt-2 shrink-0" />
                            <span className="flex-1">{parseInline(s)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Alternatives Code Cards */}
                  {msg.result.alternatives && msg.result.alternatives.length > 0 && (
                    <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                        🔀 Alternative Approaches
                      </div>
                      {msg.result.alternatives.map((alt, i) => (
                        <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 bg-zinc-950 dark:bg-[#0a0c12] p-3.5 space-y-2 text-zinc-100 shadow-inner">
                          <div className="flex items-center justify-between text-xs">
                            <span className="rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-300 px-2.5 py-0.5 text-[11px] font-semibold border border-orange-500/30">
                              {alt.tradeoff}
                            </span>
                            <CopyButton text={alt.code} />
                          </div>
                          <pre className="font-mono text-xs text-zinc-200 overflow-x-auto">
                            <code>{alt.code}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
