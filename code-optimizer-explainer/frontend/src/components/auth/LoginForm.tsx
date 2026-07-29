import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

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
        <label htmlFor="login-email" className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
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
          className="h-12 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-55"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
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
            className="h-12 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 pr-12 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-55"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30"
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

      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2 shadow-xs">
        <Sparkles className="h-4 w-4 text-orange-500 shrink-0" />
        <span><strong>OptiCode Account:</strong> Sign in with your registered Gmail/Email ID & password to load your saved chats & history.</span>
      </div>

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : success ? (
          "Signed in to OptiCode"
        ) : (
          <>
            <span>Sign in to OptiCode Account</span>
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
