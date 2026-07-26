import { ShieldCheck, ShieldAlert, AlertTriangle, KeyRound, CheckCircle2 } from "lucide-react";
import { type SecurityAuditResult } from "@/api/backend";

interface SecurityScorecardProps {
  data: SecurityAuditResult;
  onApplySanitized?: (sanitizedCode: string) => void;
}

export function SecurityScorecard({ data, onApplySanitized }: SecurityScorecardProps) {
  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "B":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "C":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 backdrop-blur">
      {/* Header with grade badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Security Audit Scorecard</h3>
            <p className="text-xs text-zinc-400">{data.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-zinc-400">Security Score</div>
            <div className="font-mono text-lg font-bold text-zinc-100">{data.score}/100</div>
          </div>
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl border text-xl font-black ${getGradeBadge(
              data.grade
            )}`}
          >
            {data.grade}
          </span>
        </div>
      </div>

      {/* Secret Leaks Warning Banner */}
      {data.secrets_found > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 shrink-0 text-rose-400" />
            <span>
              <strong>{data.secrets_found} Secret Leak(s) Detected!</strong> Hardcoded keys or credentials exposed.
            </span>
          </div>
          {onApplySanitized && (
            <button
              onClick={() => onApplySanitized(data.sanitized_code)}
              className="rounded bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
            >
              Auto-Sanitize
            </button>
          )}
        </div>
      )}

      {/* Vulnerabilities List */}
      <div className="mt-4 space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Vulnerability Findings ({data.vulnerabilities.length})
        </h4>
        {data.vulnerabilities.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>No high or critical security vulnerabilities detected. Code passes standard OWASP checks.</span>
          </div>
        ) : (
          data.vulnerabilities.map((vuln, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-3 text-xs transition hover:border-zinc-700"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  {vuln.severity === "CRITICAL" || vuln.severity === "HIGH" ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  {vuln.title}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    vuln.severity === "CRITICAL"
                      ? "bg-rose-500/20 text-rose-300"
                      : vuln.severity === "HIGH"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {vuln.severity}
                </span>
              </div>
              <p className="mt-1 text-zinc-400">{vuln.description}</p>
              <div className="mt-2 text-[11px] font-mono text-orange-400/90">
                👉 Recommendation: {vuln.recommendation}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
