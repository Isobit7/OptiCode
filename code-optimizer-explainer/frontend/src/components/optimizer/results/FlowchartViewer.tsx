import { useEffect, useState } from "react";
import { GitBranch, Copy, Check } from "lucide-react";

interface FlowchartViewerProps {
  mermaidCode: string;
  nodesCount?: number;
}

export function FlowchartViewer({ mermaidCode, nodesCount }: FlowchartViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <GitBranch className="h-4 w-4 text-orange-500" />
          <span>Interactive Execution Logic Flowchart</span>
          {nodesCount && (
            <span className="rounded bg-orange-500/10 px-2 py-0.5 text-xs text-orange-400">
              {nodesCount} Nodes
            </span>
          )}
        </div>
        <button
          onClick={handleCopyMermaid}
          className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy Mermaid"}</span>
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-4">
        <pre className="font-mono text-xs text-orange-300">{mermaidCode}</pre>
      </div>
    </div>
  );
}
