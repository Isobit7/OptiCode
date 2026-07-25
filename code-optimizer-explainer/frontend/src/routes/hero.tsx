import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Rocket, Sparkles, Code, Github } from "lucide-react";
import { LiquidChrome } from "@/components/ui/liquid-chrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/hero")({
  head: () => ({
    meta: [
      { title: "Liquid Chrome Hero — OptiCode Preview" },
      {
        name: "description",
        content:
          "Liquid-metal WebGL hero preview adapted for the OptiCode design system.",
      },
    ],
  }),
  component: HeroPreviewPage,
});

const REDUCED_MOTION_QUERY =
  typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)");

function HeroPreviewPage() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!REDUCED_MOTION_QUERY) return;
    const onChange = () => setReduced(REDUCED_MOTION_QUERY.matches);
    onChange();
    REDUCED_MOTION_QUERY.addEventListener?.("change", onChange);
    return () => REDUCED_MOTION_QUERY.removeEventListener?.("change", onChange);
  }, []);

  const baseColor: [number, number, number] = [0.09, 0.09, 0.14]; // near #171723 (OptiCode dark bg)
  const accentTint: [number, number, number] = [0.976, 0.45, 0.086]; // var(--accent) #f97316

  return (
    <div className="dark relative h-[100dvh] w-full overflow-hidden bg-[#121212]">
      <Link
        to="/"
        className="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-md bg-background/80 px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] backdrop-blur border border-border shadow-sm transition hover:text-[color:var(--text-primary)] hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Optimizer
      </Link>

      {/* Background layers — all z-[-1] so they never cover content */}
      <div
        aria-hidden
        className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[color:color-mix(in_srgb,var(--accent)_22%,transparent)] via-transparent to-[#121212]"
      />

      <div className="absolute inset-0 z-[-1]">
        <LiquidChrome
          baseColor={reduced ? accentTint : baseColor}
          speed={reduced ? 0 : 0.9}
          amplitude={reduced ? 0.1 : 0.65}
          interactive={!reduced}
          className="object-cover"
        />
      </div>

      <div className="absolute inset-0 z-[-1] mix-blend-overlay bg-[radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--accent)_40%,transparent)_0%,transparent_55%),radial-gradient(circle_at_80%_80%,color-mix(in_srgb,#6366f1_40%,transparent)_0%,transparent_55%)]" />

      <div className="absolute inset-0 z-[-1] bg-black/30" />

      <main className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center px-6 text-center">
        <span style={{ color: "rgba(255,255,255,0.85)" }} className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-medium tracking-wide backdrop-blur">
          <Sparkles className="h-3 w-3 text-[color:var(--accent)]" />
          Liquid Chrome · WebGL Fragment Shader
        </span>

        <h1
          style={{ color: "#ffffff", textShadow: "none" }}
          className="max-w-4xl font-heading text-[clamp(2.5rem,9vw,6.5rem)] leading-[0.95] tracking-tight font-bold"
        >
          Understand any code.
          <br />
          Ship{" "}
          <span style={{ color: "#f97316" }}>
            cleaner versions
          </span>
          .
        </h1>

        <p style={{ color: "rgba(255,255,255,0.85)" }} className="mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
          Paste any snippet. Get plain-language explanations, humanized formatting,
          SEO-optimized comments, or handwritten-style alternatives — all in seconds,
          powered by AI.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button
              size="lg"
              variant="accent"
              className="gap-2 shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--accent)_70%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-black/40"
            >
              <Rocket className="h-4 w-4" />
              Open the Optimizer
            </Button>
          </Link>
          <a
            href="https://github.com/Isobit7/OptiCode"
            target="_blank"
            rel="noreferrer"
          >
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-white/20 bg-white/5 text-white/90 backdrop-blur hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-black/40"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-2 text-[11px] text-white/75">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 backdrop-blur">
            <Code className="h-3 w-3 text-[color:var(--accent)]" />
            6 AI Actions · Explain, Humanize, Prettify, Shorten, SEO, Alternatives
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 backdrop-blur">
            <Sparkles className="h-3 w-3 text-[color:color-mix(in_srgb,#6366f1_85%,white)]" />
            TanStack Start SSR · Radix Primitives · Tailwind v4
          </span>
        </div>
      </main>
    </div>
  );
}
