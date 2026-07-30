import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface RegisterFormProps {
  onSubmit: (email: string, password: string, fullName: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function RegisterForm({ onSubmit, loading, error, success }: RegisterFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3 : 2;
  const strengthLabels = ["", "Needs work", "Getting there", "Strong"];
  const strengthColors = ["", "bg-red-500", "bg-amber-500", "bg-(--auth-success)"];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(email.trim(), password, fullName.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Create account form">
      <div className="space-y-2">
        <label htmlFor="register-name" className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          Full name
        </label>
        <input
          id="register-name"
          type="text"
          required
          autoFocus
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Alex Morgan"
          disabled={loading}
          className="h-12 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-55"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-email" className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          Email address
        </label>
        <input
          id="register-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          disabled={loading}
          className="h-12 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-55"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-password" className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          Password
        </label>
        <div className="relative">
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
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
        {password.length > 0 && (
          <div className="space-y-1.5" aria-live="polite">
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3].map((level) => (
                <span
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength ? strengthColors[passwordStrength] : "bg-zinc-300 dark:bg-zinc-700"}`}
                />
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">
              Password strength: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{strengthLabels[passwordStrength]}</span>
            </p>
          </div>
        )}
      </div>

      <ul className="space-y-2 py-1 text-xs text-zinc-600 dark:text-zinc-400" aria-label="Account benefits">
        {["Sync your optimization history", "Bring your own API key", "Unlock priority models"].map((benefit) => (
          <li key={benefit} className="flex items-center gap-2">
            <span>• {benefit}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2 shadow-xs">
        <span><strong>OptiCode Account:</strong> Sign up with your Gmail/Email ID & password to save all your chats & optimizations.</span>
      </div>

      <button
        type="submit"
        disabled={loading || !fullName || !email || !password}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : success ? (
          "OptiCode Account Created"
        ) : (
          <span>Create OptiCode Account</span>
        )}
      </button>
    </form>
  );
}
