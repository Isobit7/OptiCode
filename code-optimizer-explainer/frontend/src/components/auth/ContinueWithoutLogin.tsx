import { ArrowRight, Zap } from "lucide-react";

interface ContinueWithoutLoginProps {
  onContinue: () => void;
}

export function ContinueWithoutLogin({ onContinue }: ContinueWithoutLoginProps) {
  return (
    <div className="mt-8 text-center">
      <div className="flex items-center gap-3 before:flex-1 before:border-t before:border-(--auth-border) after:flex-1 after:border-t after:border-(--auth-border)">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--auth-muted)">or</span>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="group mt-5 inline-flex items-center gap-2 text-xs font-semibold text-(--auth-muted) transition hover:text-(--auth-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent)/30 focus-visible:ring-offset-4 focus-visible:ring-offset-(--auth-pearl)"
      >
        <Zap className="h-3.5 w-3.5 text-(--auth-accent) transition group-hover:scale-110" aria-hidden="true" />
        Continue as guest
        <ArrowRight className="h-3.5 w-3.5 opacity-55 transition group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
      </button>
      <p className="mt-2 text-[11px] text-(--auth-muted)">Explore the workspace without saving history.</p>
    </div>
  );
}
