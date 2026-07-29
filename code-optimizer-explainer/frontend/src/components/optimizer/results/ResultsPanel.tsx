import { useEffect, useState } from "react";
import type { ActionResult } from "@/api/backend";
import type { ReactNode } from "react";
import { Copy, Eye, GitCompare, Sparkles, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { createShareLink } from "@/api/backend";
import { SimpleDiffView } from "./DiffLine";
import { SecurityScorecard } from "./SecurityScorecard";
import { FlowchartViewer } from "./FlowchartViewer";
import { ShareCardModal } from "../modals/ShareCardModal";

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

async function highlightCode(code: string, lang: string = "auto"): Promise<string> {
  try {
    const hljs = (await import("highlight.js")).default;
    return hljs.highlightAuto(code, lang === "auto" ? undefined : [lang]).value;
  } catch {
    return code.replace(/</g, "<").replace(/>/g, ">");
  }
}

function SafeCodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    highlightCode(code, language).then(setHtml);
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1"
        >
          {copied ? <Copy className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {/* ✅ FIX: No left border line - clean code display */}
      <pre className="p-3 overflow-x-auto text-sm leading-relaxed text-foreground border-l-0" style={{counterReset: 'line'}}>
        <code 
          dangerouslySetInnerHTML={{ __html: html }} 
          style={{
            display: 'block',
            counterIncrement: 'line 0',
            borderLeft: 'none',
          }}
          className="[&>span]:no-underline [&>span]:border-l-0"
        />
      </pre>
      <style>{`
        pre { border-left: 0 !important; }
        .hljs-line-number { display: none !important; }
        .hljs-deletion { text-decoration: none !important; color: inherit !important; background: none !important; }
        code span { text-decoration: none !important; border-left: 0 !important; }
      `}</style>
    </div>
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
      parts.push(<strong key={match.index} className="font-semibold text-primary">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="font-mono text-sm bg-muted px-1 py-0.5 rounded text-primary font-medium">
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
          <ul key={blocks.length} className="space-y-1 my-2">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
                <span className="h-1 w-1 rounded-full bg-primary mt-2 shrink-0" />
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={blocks.length} className="space-y-1 my-2 pl-4 list-decimal text-sm leading-relaxed text-foreground/80 marker:text-primary">
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
        blocks.push(<SafeCodeBlock key={`code_${lineIdx}`} code={codeText} language={codeBlockLang} />);
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
        <h4 key={lineIdx} className="text-sm font-medium text-primary mt-3 pb-1 border-b">
          <span className="text-primary">Key Insight</span>
          <span className="ml-1">{headerText}</span>
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
        <p key={lineIdx} className="text-sm leading-relaxed text-foreground/80 my-0.5">
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList();
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push(
      <SafeCodeBlock key="code_final" code={codeBlockLines.join("\n")} language={codeBlockLang} />
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}

type OutputViewMode = "explanation" | "diff";

function ResultBox({
  content,
  originalCode,
  isProse,
  action,
  language,
  result,
}: {
  content: string;
  originalCode?: string;
  isProse?: boolean;
  action?: string;
  language?: string;
  result?: ActionResult;
}) {
  const modifiedForDiff =
    action === "security-audit" && result?.securityData?.sanitized_code
      ? result.securityData.sanitized_code
      : action === "flowchart" && result?.mermaidCode
      ? result.mermaidCode
      : content;

  const hasDiffEligible =
    !!originalCode && !!modifiedForDiff && action !== "explain";
  const [viewMode, setViewMode] = useState<OutputViewMode>("explanation");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleCreateShareLink = async () => {
    if (!result) return;
    setIsSharing(true);
    try {
      const shareRes = await createShareLink({
        input_code: originalCode || "",
        language: language || result.detectedLanguage || "auto",
        analysis_type: action || result.action || "explain",
        result_json: result,
      });
      const url = `${window.location.origin}/share/${shareRes.slug}`;
      await navigator.clipboard.writeText(url);
      toast.success("Shareable review link copied to clipboard!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create share link");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-3">
      {result?.securityData && (
        <SecurityScorecard data={result.securityData} />
      )}

      {result?.mermaidCode && (
        <FlowchartViewer mermaidCode={result.mermaidCode} nodesCount={result.nodesCount} />
      )}

      <div className="flex items-center justify-between">
        {hasDiffEligible ? (
          <div
            role="tablist"
            aria-label="Output view mode"
            className="inline-flex rounded-lg bg-muted p-0.5 text-[11px] font-medium border border-border"
          >
            <button
              role="tab"
              type="button"
              aria-selected={viewMode === "explanation"}
              onClick={() => setViewMode("explanation")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                viewMode === "explanation"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" aria-hidden="true" />
              Output
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={viewMode === "diff"}
              onClick={() => setViewMode("diff")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                viewMode === "diff"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitCompare className="h-3 w-3" aria-hidden="true" />
              Diff
            </button>
          </div>
        ) : <div />}

        {content && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateShareLink}
              disabled={isSharing}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition disabled:opacity-50"
              title="Generate public share link"
            >
              <Share2 className="h-3.5 w-3.5 text-orange-400" />
              <span>{isSharing ? "Sharing..." : "Share Link"}</span>
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Create Share Card</span>
            </button>
          </div>
        )}
      </div>

      {viewMode === "diff" && hasDiffEligible ? (
        <SimpleDiffView
          original={originalCode}
          modified={modifiedForDiff}
          isSEO={action === "seo-optimize"}
        />
      ) : isProse ? (
        <div className="max-w-none overflow-x-auto break-words hyphens-auto rounded-lg border border-border bg-background p-3.5">
          <MarkdownRenderer content={content} />
        </div>
      ) : (
        <SafeCodeBlock code={content} language={language} />
      )}

      {isShareModalOpen && (
        <ShareCardModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          code={content}
          language={language || "code"}
          actionTitle={action}
        />
      )}
    </div>
  );
}

export function ResultsPanel({ messages = [], original, result, loading, error }: Props) {
  const chatMessages = messages.length ? messages : original ? [{ id: 'msg_initial', original, result, loading, error }] : [];

  return (
    <div className="space-y-4 w-full">
      {chatMessages.map((msg) => (
        <div key={msg.id} className="space-y-2 w-full">
          {msg.original && (
            <SafeCodeBlock code={msg.original} language="" />
          )}
          {msg.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {msg.error && <div className="text-sm text-destructive">{msg.error}</div>}
          {msg.result && (
            <ResultBox
              content={msg.result.output || ''}
              originalCode={msg.original}
              isProse={msg.result.isProse}
              action={msg.result.action}
              language={msg.result.detectedLanguage}
              result={msg.result}
            />
          )}
        </div>
      ))}
    </div>
  );
}
