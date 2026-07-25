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
      <div className="flex items-start bg-emerald-500/10 text-emerald-400 font-mono text-xs px-3 py-0.5 border-l-2 border-emerald-500 leading-relaxed">
        {lineNumber && <span className="w-8 shrink-0 select-none text-[var(--text-muted)] text-[10px]">{lineNumber}</span>}
        <span className="w-4 shrink-0 select-none text-emerald-500 font-bold">+</span>
        <span className="whitespace-pre-wrap flex-1">{content}</span>
      </div>
    );
  }

  if (type === "remove") {
    return (
      <div className="flex items-start bg-red-500/10 text-red-400 font-mono text-xs px-3 py-0.5 border-l-2 border-red-500 line-through opacity-80 leading-relaxed">
        {lineNumber && <span className="w-8 shrink-0 select-none text-[var(--text-muted)] text-[10px]">{lineNumber}</span>}
        <span className="w-4 shrink-0 select-none text-red-500 font-bold">-</span>
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
