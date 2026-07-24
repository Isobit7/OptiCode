import { useState, useEffect, type ReactNode } from "react";
import type { ActionResult } from "@/api/backend";
import { Copy, Check, AlertCircle, Sparkles } from "lucide-react";

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

async function highlightCode(code: string, lang: string): Promise<string> {
  try {
    const hljs = (await import("highlight.js")).default;
    const detected = hljs.highlightAuto(code, lang === "auto" ? undefined : [lang]).value;
    return detected;
  } catch {
    return code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    highlightCode(code, language || "auto").then(setHtml);
  }, [code, language]);

  return (
    <div className="relative group rounded-lg bg-muted/50 border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch { /* ignore */ }
          }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
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
        } catch { /* ignore */ }
      }}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
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
      parts.push(<strong key={match.index} className="font-bold text-foreground">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded text-primary font-medium">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return parts;
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let currentList: { type: "bullet" | "number"; items: ReactNode[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = "";

  const flushList = () => {
    if (currentList) {
      if (currentList.type === "bullet") {
        blocks.push(
          <ul key={`list_${blocks.length}`} className="space-y-1 my-2">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80">
                <span className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`list_${blocks.length}`} className="space-y-1 my-2 pl-4 list-decimal text-xs leading-relaxed text-foreground/80 marker:text-primary">
            {currentList.items.map((item, idx) => (
              <li key={idx}>{item}</li>
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
          <CodeBlock key={`code_${lineIdx}`} code={codeText} language={codeBlockLang} />
        );
        codeBlockLines = [];
        codeBlockLang = "";
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    if (trimmed.startsWith("###") || trimmed.startsWith("##")) {
      flushList();
      const headerText = trimmed.replace(/^#+\s*/, "");
      blocks.push(
        <h4 key={`head_${lineIdx}`} className="text-xs font-bold text-foreground pt-4 pb-1 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
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
        <p key={`p_${lineIdx}`} className="text-xs leading-relaxed text-foreground/80 my-1">
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList();
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push(<CodeBlock key="code_final" code={codeBlockLines.join("\n")} language={codeBlockLang} />);
  }

  return <div className="space-y-0.5">{blocks}</div>;
}

const ACTION_TITLES: Record<string, string> = {
  explain: "Explanation",
  humanize: "Humanized Code",
  prettify: "Formatted Code",
  shorten: "Minified Code",
  "seo-optimize": "SEO Analysis",
  alternatives: "Alternatives",
};

function SkeletonBlock() {
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card animate-pulse">
      <div className="h-3 w-24 bg-muted rounded" />
      <div className="space-y-2">
        <div className="h-2.5 w-full bg-muted rounded" />
        <div className="h-2.5 w-3/4 bg-muted rounded" />
        <div className="h-2.5 w-1/2 bg-muted rounded" />
      </div>
    </div>
  );
}

export function ResultsPanel({ messages, original, result, loading, error }: Props) {
  const messageList: ChatMessage[] = messages && messages.length > 0
    ? messages
    : (original || result || loading || error)
      ? [{ id: "single_msg", original: original || "", result: result || null, loading, error }]
      : [];

  if (messageList.length === 0) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {messageList.map((msg) => (
        <div key={msg.id} className="space-y-4">
          {msg.original && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Input</span>
                <CopyButton text={msg.original} />
              </div>
              <CodeBlock code={msg.original} />
            </div>
          )}

          {msg.loading && <SkeletonBlock />}

          {!msg.loading && msg.error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-destructive/80 mt-0.5">{msg.error}</p>
              </div>
            </div>
          )}

          {!msg.loading && !msg.error && msg.result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {ACTION_TITLES[msg.result.action] ?? "Output"}
                  {msg.result.detectedLanguage ? ` · ${msg.result.detectedLanguage}` : ""}
                </span>
              </div>

              <div className="space-y-3 p-4 rounded-lg border bg-card">
                {msg.result.output != null && (
                  msg.result.isProse ? (
                    <MarkdownRenderer content={msg.result.output} />
                  ) : (
                    <CodeBlock code={msg.result.output} language={msg.result.detectedLanguage} />
                  )
                )}

                {msg.result.suggestions && msg.result.suggestions.length > 0 && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Suggestions
                    </div>
                    <ul className="space-y-1.5">
                      {msg.result.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                          <span className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span className="flex-1">{parseInline(s)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.result.alternatives && msg.result.alternatives.length > 0 && (
                  <div className="pt-3 border-t border-border space-y-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Alternative Approaches
                    </div>
                    {msg.result.alternatives.map((alt, i) => (
                      <div key={i} className="space-y-1.5 p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-primary">{alt.tradeoff}</span>
                          <CopyButton text={alt.code} />
                        </div>
                        <CodeBlock code={alt.code} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}