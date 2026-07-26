import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function LoginForm({ onSubmit, loading, error, success }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(email.trim(), password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Sign in form">
      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-xs font-semibold text-(--auth-ink)">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          disabled={loading}
          className="h-12 w-full rounded-xl border border-(--auth-border) bg-(--auth-paper) px-4 text-sm text-(--auth-ink) outline-none transition placeholder:text-(--auth-muted)/65 focus-visible:border-(--auth-accent) focus-visible:ring-2 focus-visible:ring-(--auth-accent)/20 disabled:cursor-not-allowed disabled:opacity-55"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-xs font-semibold text-(--auth-ink)">
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            className="h-12 w-full rounded-xl border border-(--auth-border) bg-(--auth-paper) px-4 pr-12 text-sm text-(--auth-ink) outline-none transition placeholder:text-(--auth-muted)/65 focus-visible:border-(--auth-accent) focus-visible:ring-2 focus-visible:ring-(--auth-accent)/20 disabled:cursor-not-allowed disabled:opacity-55"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-(--auth-muted) transition hover:text-(--auth-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent)/30"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error && <AuthError message={error} />}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-(--auth-accent) px-4 text-sm font-bold text-white shadow-[0_12px_24px_-12px_var(--auth-accent)] transition hover:bg-(--auth-accent-deep) active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--auth-pearl) disabled:cursor-not-allowed disabled:opacity-45"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : success ? (
          "Signed in"
        ) : (
          <>
            <span>Sign in to OptiCode</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
    >
      {message}
    </p>
  );
}
