import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchSharedReview, type SharedReviewDetail } from "@/api/backend";
import { ResultsPanel } from "@/components/optimizer/results/ResultsPanel";
import { Code, ArrowLeft, ShieldCheck, Sparkles, Share2, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/share/$slug")({
  component: SharedReviewPage,
});

function SharedReviewPage() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<SharedReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedReview(slug)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load shared review");
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d1017] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-xs text-zinc-400 font-mono">Loading shared review...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d1017] text-white p-4">
        <div className="max-w-md w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <Share2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Shared Review Not Found</h2>
          <p className="text-xs text-zinc-400">{error || "This review link may have expired or been removed."}</p>
          <Link to="/app">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs gap-2">
              <ArrowLeft className="h-4 w-4" />
              Open OptiCode Workspace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0d1017] text-zinc-100 font-sans">
      {/* Top Banner */}
      <header className="border-b border-zinc-800/80 bg-[#121620]/90 backdrop-blur sticky top-0 z-50 px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app" className="flex items-center gap-2 text-white font-black tracking-tight text-lg hover:opacity-90">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white">
              <Code className="h-4 w-4" />
            </div>
            <span>OptiCode</span>
          </Link>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
            Public Shared Review
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Shared on {new Date(data.created_at).toLocaleDateString()}</span>
          </div>
          <Link to="/app">
            <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-orange-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              Try OptiCode
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header Metadata Badge */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-orange-400" />
              <h1 className="text-base font-bold text-white uppercase tracking-wider">
                Analysis: {data.analysis_type}
              </h1>
            </div>
            <p className="text-xs text-zinc-400">
              Read-only shareable snapshot created with OptiCode async code reviewer.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/60 px-3 py-1.5 rounded-xl border border-zinc-700/50">
            <span className="font-mono text-orange-400 font-bold">{data.language || "Auto"}</span>
            <span>·</span>
            <span>Slug: {data.slug}</span>
          </div>
        </div>

        {/* Read-Only Results View */}
        <div className="bg-[#121620] border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-xl">
          <ResultsPanel
            original={data.input_code}
            result={{
              action: data.analysis_type as any,
              output: data.result_json.output || data.result_json.explanation || data.result_json.humanized_code || data.result_json.shortened_code || data.result_json.formatted_code || data.result_json.optimized_code || "",
              detectedLanguage: data.language || data.result_json.detected_language || "auto",
              securityData: data.result_json.securityData || data.result_json.security_data || (data.analysis_type === "security-audit" ? data.result_json : undefined),
              githubMarkdown: data.result_json.githubMarkdown || data.result_json.github_markdown,
              mermaidCode: data.result_json.mermaidCode || data.result_json.mermaid_code,
              nodesCount: data.result_json.nodesCount || data.result_json.nodes_count,
              alternatives: data.result_json.alternatives,
              suggestions: data.result_json.suggestions,
            }}
          />
        </div>
      </main>
    </div>
  );
}
