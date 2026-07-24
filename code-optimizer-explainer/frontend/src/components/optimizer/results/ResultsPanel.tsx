import { useEffect, useState } from "react";
import type { ActionResult } from "@/api/backend";
import type { ReactNode } from "react";
import { Copy } from "lucide-react";

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
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent rounded transition"
        >
          {copied ? <Copy className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm leading-relaxed text-foreground">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
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

export function ResultsPanel({ messages = [], original, result, loading, error }: Props) {
  // If there is a single result (non-chat) use it directly
  const chatMessages = messages.length ? messages : original ? [{ id: 'msg_initial', original, result, loading, error }] : [];

  return (
    <div className="space-y-4">
      {chatMessages.map((msg) => (
        <div key={msg.id} className="space-y-2">
          {msg.original && (
            <SafeCodeBlock code={msg.original} language="" />
          )}
          {msg.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {msg.error && <div className="text-sm text-destructive">{msg.error}</div>}
          {msg.result && (
            <MarkdownRenderer content={msg.result.output || ''} />
          )}
        </div>
      ))}
    </div>
  );
}
