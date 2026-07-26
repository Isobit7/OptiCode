import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, Terminal } from "lucide-react";
import { AnimatedDotGrid } from "./AnimatedDotGrid";
import { Logo } from "./Logo";

const codeLines = [
  { tone: "text-white/35", value: "const" },
  { tone: "text-white/75", value: " result = optimize(code)" },
  { tone: "text-white/35", value: "// keep the signal" },
  { tone: "text-white/75", value: "  return ship(result)" },
];

export function AuthContextPanel() {
  return (
    <aside className="relative hidden min-h-screen w-[43%] shrink-0 overflow-hidden bg-(--auth-workspace) px-8 py-8 text-white lg:flex lg:flex-col xl:px-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--auth-accent) 18%, transparent), transparent 31%), linear-gradient(140deg, var(--auth-workspace), var(--auth-workspace-deep))",
        }}
        aria-hidden="true"
      />
      <AnimatedDotGrid />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <Link
          to="/"
          aria-label="Back to OptiCode home"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--auth-workspace)"
        >
          <Logo size="md" />
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
          Developer workspace
        </span>
      </div>

      <div className="relative z-10 my-auto max-w-xl py-20">
        <p className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-(--auth-accent-deep)">
          <span className="h-1.5 w-1.5 rounded-full bg-(--auth-accent) shadow-[0_0_16px_var(--auth-accent)]" />
          A clearer way to code
        </p>
        <h1 className="max-w-lg font-heading text-5xl font-black leading-[0.97] tracking-[-0.06em] text-white xl:text-7xl">
          Make every <span className="text-(--auth-accent)">line</span> count.
        </h1>
        <p className="mt-7 max-w-md text-sm leading-7 text-white/55">
          Understand the logic, remove the noise, and ship code you can stand behind — with a focused AI workspace built for developers.
        </p>

        <div className="mt-12 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-3 border-l border-white/15 pl-4 font-mono text-[11px] leading-5">
          {codeLines.map((line, index) => (
            <div key={`${line.value}-${index}`} className="contents">
              <span className="select-none text-white/25">0{index + 1}</span>
              <span className={line.tone}>{line.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-6 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          <CheckCircle2 className="h-3.5 w-3.5 text-(--auth-success)" aria-hidden="true" />
          System status: operational
        </div>
        <div className="hidden items-center gap-2 text-right sm:flex">
          <Terminal className="h-3.5 w-3.5 text-white/35" aria-hidden="true" />
          <span className="font-mono text-[10px] text-white/35">opticode.dev</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-(--auth-accent)" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
