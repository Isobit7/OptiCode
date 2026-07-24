import { useState } from "react";
import type { ActionResult } from "@/api/backend";
import { Copy, Check } from "lucide-react";

import { GeneratingLoader } from "@/components/custom/GeneratingLoader";

interface Props {
  original: string;
  result: ActionResult | null;
  loading: boolean;
  error: string | null;
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
        } catch (err) {
          void err;
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-[var(--text-on-dark-muted)] transition hover:bg-white/5 hover:text-[var(--text-on-dark-primary)]"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="max-h-[520px] overflow-auto rounded-xl border border-[#1C1C22]/10 dark:border-zinc-800 bg-zinc-950 dark:bg-[#09090B] p-4 font-mono text-[13px] leading-relaxed text-zinc-100 shadow-inner">
      <code>{children}</code>
    </pre>
  );
}

function ProseBlock({ children }: { children: string }) {
  return (
    <div className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-[#1C1C22]/10 dark:border-zinc-800 bg-zinc-950 dark:bg-[#09090B] p-4 text-[14px] leading-relaxed text-zinc-100 shadow-inner">
      {children}
    </div>
  );
}

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-4 bg-white/95 dark:bg-[#121215]/95 border-white/80 dark:border-zinc-800/90 text-zinc-900 dark:text-[#FAFAFA] backdrop-blur-xl"
      style={{
        boxShadow: "var(--shadow-float)",
      }}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-headings text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA]">
          {title}
        </h3>
        {right}
      </header>
      {children}
    </section>
  );
}

const ACTION_TITLES: Record<string, string> = {
  explain: "Explanation",
  humanize: "Humanized code",
  prettify: "Prettified code",
  shorten: "Shortened code",
  "seo-optimize": "SEO-optimized code",
  alternatives: "Alternatives",
};

export function ResultsPanel({ original, result, loading, error }: Props) {
  if (!original && !result && !loading && !error) return null;

  return (
    <div className="mx-auto mt-8 grid w-full max-w-6xl gap-4 lg:grid-cols-2 animate-fade-in-up">
      <Panel title="Original" right={original ? <CopyButton text={original} /> : null}>
        {original ? (
          <CodeBlock>{original}</CodeBlock>
        ) : (
          <p className="text-sm text-[var(--text-on-dark-muted)]">
            Paste code above to get started.
          </p>
        )}
      </Panel>

      <Panel
        title={
          result
            ? `${ACTION_TITLES[result.action] ?? "Result"}${
                result.detectedLanguage ? ` · ${result.detectedLanguage}` : ""
              }`
            : "Result"
        }
        right={result?.output ? <CopyButton text={result.output} /> : null}
      >
        {loading && <GeneratingLoader />}

        {!loading && error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {!loading && !error && result && (
          <div className="space-y-4">
            {result.output != null &&
              (result.isProse ? (
                <ProseBlock>{result.output}</ProseBlock>
              ) : (
                <CodeBlock>{result.output}</CodeBlock>
              ))}

            {result.suggestions && result.suggestions.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-[var(--text-on-dark-muted)]">
                  Suggestions
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-on-dark-primary)]">
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.alternatives && result.alternatives.length > 0 && (
              <div className="space-y-3">
                {result.alternatives.map((alt, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[var(--accent-warm)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--accent-warm)] ring-1 ring-inset ring-[var(--accent-warm)]/25">
                        {alt.tradeoff}
                      </span>
                      <CopyButton text={alt.code} />
                    </div>
                    <CodeBlock>{alt.code}</CodeBlock>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !error && !result && (
          <p className="text-sm text-[var(--text-on-dark-muted)]">
            Choose an action and press the run button to see results here.
          </p>
        )}
      </Panel>
    </div>
  );
}
