import React from "react";

export type DiffType = "add" | "remove" | "keep";

interface DiffLineProps {
  type: DiffType;
  content: string;
  lineNumber?: number;
}

export function DiffLine({ type, content, lineNumber }: DiffLineProps) {
  if (type === "add") {
    return (
      <div className="flex items-start bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-mono text-xs px-3 py-0.5 border-l-3 border-emerald-500 leading-relaxed font-medium">
        {lineNumber && <span className="w-8 shrink-0 select-none text-emerald-600/70 dark:text-emerald-400/70 text-[10px] font-mono">{lineNumber}</span>}
        <span className="w-4 shrink-0 select-none text-emerald-600 dark:text-emerald-400 font-black">+</span>
        <span className="whitespace-pre-wrap flex-1">{content}</span>
      </div>
    );
  }

  if (type === "remove") {
    return (
      <div className="flex items-start bg-rose-500/15 text-rose-600 dark:text-rose-300 font-mono text-xs px-3 py-0.5 border-l-3 border-rose-500 line-through opacity-90 leading-relaxed font-medium">
        {lineNumber && <span className="w-8 shrink-0 select-none text-rose-600/70 dark:text-rose-400/70 text-[10px] font-mono">{lineNumber}</span>}
        <span className="w-4 shrink-0 select-none text-rose-600 dark:text-rose-400 font-black">-</span>
        <span className="whitespace-pre-wrap flex-1">{content}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start text-[var(--text-secondary)] font-mono text-xs px-3 py-0.5 border-l-2 border-transparent leading-relaxed">
      {lineNumber && <span className="w-8 shrink-0 select-none text-[var(--text-muted)] text-[10px]">{lineNumber}</span>}
      <span className="w-4 shrink-0 select-none text-[var(--text-muted)]"> </span>
      <span className="whitespace-pre-wrap flex-1">{content}</span>
    </div>
  );
}

export function SimpleDiffView({ original, modified, isSEO }: { original: string; modified: string; isSEO?: boolean }) {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");

  // Basic line diff generator for Shorten / SEO
  const diffs: { type: DiffType; content: string }[] = [];

  if (isSEO) {
    // For SEO, highlight added lines
    const origSet = new Set(origLines.map((l) => l.trim()));
    modLines.forEach((line) => {
      if (line.trim() && !origSet.has(line.trim())) {
        diffs.push({ type: "add", content: line });
      } else {
        diffs.push({ type: "keep", content: line });
      }
    });
  } else {
    // For Shorten, highlight removed lines
    const modSet = new Set(modLines.map((l) => l.trim()));
    origLines.forEach((line) => {
      if (line.trim() && !modSet.has(line.trim())) {
        diffs.push({ type: "remove", content: line });
      }
    });
    modLines.forEach((line) => {
      if (!diffs.some((d) => d.content === line)) {
        diffs.push({ type: "keep", content: line });
      }
    });
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-alt)] overflow-hidden py-1">
      {diffs.map((d, i) => (
        <DiffLine key={i} type={d.type} content={d.content} lineNumber={i + 1} />
      ))}
    </div>
  );
}
