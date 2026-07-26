import { Loader2, type LucideIcon } from "lucide-react";

interface SocialButtonProps {
  provider: string;
  icon: LucideIcon;
  loading?: boolean;
  onClick: () => void;
}

export function SocialButton({ provider, icon: Icon, loading, onClick }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={`Continue with ${provider}`}
      aria-label={`Continue with ${provider}`}
      className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-(--auth-border) bg-(--auth-paper) px-3 text-xs font-semibold text-(--auth-muted) transition hover:border-(--auth-accent) hover:text-(--auth-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent)/30 focus-visible:ring-offset-2 focus-visible:ring-offset-(--auth-pearl) disabled:cursor-not-allowed disabled:opacity-45"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-4 w-4 text-(--auth-muted) transition group-hover:text-(--auth-accent)" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{provider}</span>
    </button>
  );
}
